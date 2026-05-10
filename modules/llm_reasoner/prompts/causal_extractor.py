"""Prompt template for causal chain extraction."""

from typing import Any

from modules.llm_reasoner.prompts import SYSTEM_PROMPT


def build_causal_prompt(text: str, symbol_list: list) -> list[dict[str, Any]]:

    user_content = f"""Extract causal chains from this text. For each causal relationship found, cite the exact sentence. Text: {text}
Return JSON: {{
  "insights": [{{
    "cause": "string",
    "effect": "string",
    "affected_assets": {symbol_list},
    "confidence": 0.0,
    "time_horizon": "immediate|short|medium|long",
    "source_sentence": "exact quote from text",
    "direction": "bullish|bearish|neutral"
  }}]
}}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]