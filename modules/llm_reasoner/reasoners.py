"""LLM Reasoner — Consumes data from Redis streams, generates insights via OpenRouter."""

import asyncio
import datetime
import json
import logging
import os
import re
from collections import deque
from dataclasses import asdict
from typing import Any, Optional

import aiohttp

from core.redis_bus import get_redis
from modules.llm_reasoner.models import CausalInsight, SummaryOutput
from modules.llm_reasoner.prompts.causal_extractor import build_causal_prompt
from modules.llm_reasoner.prompts.fed_parser import build_fed_prompt
from modules.llm_reasoner.prompts.contradiction import build_contradiction_prompt

logger = logging.getLogger("llm_reasoner.reasoner")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
INTERVAL = 60

CALLS_PER_MINUTE = 10
MAX_DAILY_COST = 5.00

INPUT_PRICE = 0.00000025
OUTPUT_PRICE = 0.00000125

STREAMS = {
    "sec_filings": "raw:sec_filings",
    "news": "raw:news_articles",
    "transcripts": "raw:transcripts",
    "confluence": "altdata:confluence",
}

OUTPUT_STREAM = "llm:insights"
SUMMARY_KEY = "llm:summary"


class LLMReasoner:
    """Reasoner that consumes Redis streams and generates insights via LLM.

    Consumes: raw:sec_filings, raw:news_articles, raw:transcripts,
             altdata:confluence, regime:{symbol}
    Publishes: llm:insights, llm:summary
    """

    def __init__(
        self,
        symbol_list: list[str],
        summary_interval_seconds: int = 30
    ) -> None:
        self._symbol_list = symbol_list
        self._summary_interval = summary_interval_seconds

        self._redis = get_redis()
        self._running = False
        self._session: Optional[aiohttp.ClientSession] = None

        self._api_key = os.getenv("OPENROUTER_API_KEY", "")
        self._model = os.getenv("LLM_MODEL", "anthropic/claude-3-haiku")

        self._semaphore = asyncio.Semaphore(CALLS_PER_MINUTE)
        self._daily_cost = 0.0
        self._last_reset_date = datetime.datetime.utcnow().date()
        self._active = True

        self._last_stream_ids: dict[str, str] = {k: "0-0" for k in STREAMS.keys()}
        self._last_regime_ids: dict[str, str] = {}

        self._recent_insights: deque = deque(maxlen=100)

    async def start(self) -> None:
        if not self._api_key:
            logger.warning("OPENROUTER_API_KEY not set - reasoner will not call LLM")
            self._active = False
            return

        self._running = True
        self._session = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self._api_key}"}
        )

        self._check_daily_reset()

        asyncio.create_task(self._stream_consumer_loop())
        asyncio.create_task(self._summary_generator_loop())

        logger.info("LLMReasoner started")

    async def stop(self) -> None:
        self._running = False
        if self._session:
            await self._session.close()
        logger.info("LLMReasoner stopped")

    def _check_daily_reset(self) -> None:
        today = datetime.datetime.utcnow().date()
        if today != self._last_reset_date:
            self._daily_cost = 0.0
            self._last_reset_date = today
            logger.info("Daily cost counter reset")

    async def _stream_consumer_loop(self) -> None:
        while self._running:
            try:
                await self._consume_stream("sec_filings", STREAMS["sec_filings"], "sec_edgar")
                await self._consume_stream("news", STREAMS["news"], "news")
                await self._consume_stream("transcripts", STREAMS["transcripts"], "transcripts")
                await self._consume_confluence()
                await self._consume_regime_streams()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Stream consumer error: {e}")

            await asyncio.sleep(INTERVAL)

    async def _consume_stream(
        self,
        stream_name: str,
        stream_key: str,
        source_type: str
    ) -> None:
        last_id = self._last_stream_ids.get(stream_name, "0-0")

        try:
            messages = await self._redis.redis.xread(
                {stream_key: last_id},
                count=1,
                block=1000
            )

            if not messages:
                return

            for stream_name, stream_messages in messages:
                for msg_id, fields in stream_messages:
                    self._last_stream_ids[stream_name] = msg_id

                    data = json.loads(fields.get("data", "{}"))
                    doc_type = data.get("document_type", "article")

                    text = data.get("text", "")
                    entity = data.get("entity", data.get("source", ""))

                    if not text:
                        continue

                    prompt_type = "fed" if _contains_fed_keyword(text) else "causal"

                    await self._trigger_llm(
                        text=text,
                        entity=entity,
                        source_type=source_type,
                        doc_type=doc_type,
                        prompt_type=prompt_type
                    )

        except Exception as e:
            logger.warning(f"Stream {stream_name} error: {e}")

    async def _consume_confluence(self) -> None:
        last_id = self._last_stream_ids.get("confluence", "0-0")

        try:
            messages = await self._redis.redis.xread(
                {STREAMS["confluence"]: last_id},
                count=1,
                block=1000
            )

            if not messages:
                return

            for stream_name, stream_messages in messages:
                for msg_id, fields in stream_messages:
                    self._last_stream_ids["confluence"] = msg_id

                    data = json.loads(fields.get("data", "{}"))
                    score = abs(data.get("score", 0.0))

                    if score > 0.5:
                        entity = "MARKET"
                        text = f"Confluence score: {data.get('score')}, direction: {data.get('direction')}"
                        source_type = "confluence"

                        await self._trigger_llm(
                            text=text,
                            entity=entity,
                            source_type=source_type,
                            doc_type="market_event",
                            prompt_type="causal"
                        )

        except Exception as e:
            logger.warning(f"Confluence stream error: {e}")

    async def _consume_regime_streams(self) -> None:
        for symbol in self._symbol_list:
            stream_key = f"regime:{symbol}"
            last_id = self._last_regime_ids.get(symbol, "0-0")

            try:
                messages = await self._redis.redis.xread(
                    {stream_key: last_id},
                    count=1,
                    block=1000
                )

                if not messages:
                    continue

                for stream_name, stream_messages in messages:
                    for msg_id, fields in stream_messages:
                        self._last_regime_ids[symbol] = msg_id

                        data = json.loads(fields.get("data", "{}"))
                        if data.get("transition_warning"):
                            text = f"Regime: {data.get('regime')}, confidence: {data.get('confidence')}"
                            source_type = "regime"

                            await self._trigger_llm(
                                text=text,
                                entity=symbol.upper(),
                                source_type=source_type,
                                doc_type="regime_change",
                                prompt_type="causal"
                            )

            except Exception:
                continue

    async def _trigger_llm(
        self,
        text: str,
        entity: str,
        source_type: str,
        doc_type: str,
        prompt_type: str = "causal"
    ) -> None:
        if not self._active:
            return

        self._check_daily_reset()
        if self._daily_cost >= MAX_DAILY_COST:
            logger.critical("Daily cost cap reached - stopping LLM calls")
            await self._publish_alert()
            return

        async with self._semaphore:
            try:
                if prompt_type == "fed":
                    messages = build_fed_prompt(text, None)
                else:
                    messages = build_causal_prompt(text, self._symbol_list)

                response = await self._call_llm(messages)

                if response:
                    await self._process_response(
                        response, entity, source_type, doc_type
                    )

            except Exception as e:
                logger.warning(f"LLM trigger error: {e}")

    async def _call_llm(self, messages: list[dict]) -> Optional[str]:
        if not self._session:
            return None

        try:
            body = {
                "model": self._model,
                "messages": messages,
                "max_tokens": 1000
            }

            async with self._session.post(
                OPENROUTER_URL,
                json=body
            ) as resp:
                if resp.status != 200:
                    logger.warning(f"OpenRouter status: {resp.status}")
                    return None

                data = await resp.json()
                self._update_cost(data)

                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                return content

        except Exception as e:
            logger.warning(f"OpenRouter call error: {e}")
            return None

    def _update_cost(self, response_data: dict) -> None:
        usage = response_data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)

        cost = (input_tokens * INPUT_PRICE) + (output_tokens * OUTPUT_PRICE)
        self._daily_cost += cost

    async def _process_response(
        self,
        response: str,
        entity: str,
        source_type: str,
        doc_type: str
    ) -> None:
        try:
            parsed = json.loads(response)
        except json.JSONDecodeError:
            logger.warning("LLM response is not valid JSON")
            return

        if parsed.get("error"):
            return

        insights = parsed.get("insights", [])
        if not insights:
            insights = [parsed]

        valid_insights = []

        for insight in insights:
            if isinstance(insight, dict):
                confidence = insight.get("confidence", 0.0)
                if confidence < 0.5:
                    continue

                if not insight.get("source_sentence"):
                    continue

                affected = insight.get("affected_assets", [])
                valid_assets = [a for a in affected if a in self._symbol_list]
                if not valid_assets:
                    continue

                direction = insight.get("direction", "neutral")
                cause = insight.get("cause", "")
                effect = insight.get("effect", "")

                summary = f"{cause} {effect}"[:200]

                valid_insights.append({
                    "source": source_type,
                    "document_type": doc_type,
                    "entity": entity,
                    "causal_chain": {
                        "cause": cause,
                        "effect": effect,
                        "direction": direction,
                        "confidence": confidence,
                        "time_horizon": insight.get("time_horizon", "short")
                    },
                    "affected_assets": valid_assets,
                    "source_sentence": insight.get("source_sentence", ""),
                    "summary": summary
                })

        for insight in valid_insights:
            insight["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"

            insight["type"] = "llm_insight"

            await self._redis.publish(OUTPUT_STREAM, insight)

            self._recent_insights.append(insight)

            logger.debug(f"Published insight: {insight.get('summary', '')[:50]}")

    async def _publish_alert(self) -> None:
        alert = {
            "type": "alert",
            "severity": "red",
            "message": f"LLM daily cost cap reached: ${self._daily_cost:.2f} - stopping calls"
        }
        await self._redis.publish(OUTPUT_STREAM, alert)

    async def _summary_generator_loop(self) -> None:
        while self._running:
            try:
                await self._generate_summary()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Summary generator error: {e}")

            await asyncio.sleep(self._summary_interval)

    async def _generate_summary(self) -> None:
        if not self._active:
            return

        confluence_data = await self._redis.get_latest("altdata:confluence")

        regime_data = await self._redis.get_latest(f"regime:{self._symbol_list[0]}")

        regime = regime_data.get("regime", "unknown") if regime_data else "unknown"
        regime_conf = regime_data.get("confidence", 0.0) if regime_data else 0.0

        confluence = confluence_data.get("score", 0.0) if confluence_data else 0.0
        direction = confluence_data.get("direction", "neutral") if confluence_data else "neutral"

        prompt = (
            f"Given: regime={regime} confidence={regime_conf}, "
            f"confluence={confluence} direction={direction}. "
            f"Write ONE sentence summarizing current market conditions "
            f"for a crypto futures trader. "
            f"Return JSON: {{\"summary\": \"string\"}}"
        )

        messages = [
            {"role": "system", "content": "You are a financial analyst. Respond only with valid JSON."},
            {"role": "user", "content": prompt}
        ]

        response = await self._call_llm(messages)

        if not response:
            return

        try:
            parsed = json.loads(response)
            summary_text = parsed.get("summary", "")
        except json.JSONDecodeError:
            summary_text = "Summary unavailable"

        summary_output = SummaryOutput(
            summary=summary_text[:200],
            regime=regime,
            confluence=confluence,
            direction=direction,
            timestamp=datetime.datetime.utcnow().isoformat() + "Z"
        )

        await self._redis.redis.set(SUMMARY_KEY, json.dumps(asdict(summary_output)))

        logger.debug(f"Summary: {summary_text[:100]}")


def _contains_fed_keyword(text: str) -> bool:
    keywords = ["federal reserve", "fomc", "fed funds", "monetary policy"]
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)