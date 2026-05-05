"""Fetcher for news articles.

Polls NewsAPI for relevant crypto news.
Deduplicates by URL.
"""

import asyncio
import logging
import os
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Optional

import aiohttp

logger = logging.getLogger("llm_reasoner.fetchers.news")

NEWS_API_URL = "https://newsapi.org/v2/everything"
INTERVAL = 900


class NewsFetcher:
    """Fetcher for crypto news via NewsAPI.

    Polls every 15 minutes for news matching keywords.
    Returns list with deduplication by URL.
    """

    def __init__(self) -> None:
        self._session: Optional[aiohttp.ClientSession] = None
        self._api_key = os.getenv("NEWSAPI_KEY", "")
        self._seen_urls: deque = deque(maxlen=500)
        self._keywords = os.getenv("NEWS_KEYWORDS", "bitcoin,ethereum,crypto,blockchain").split(",")

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch news articles."""
        if not self._api_key:
            logger.warning("NEWSAPI_KEY not set")
            return []

        if not self._session:
            self._session = aiohttp.ClientSession()

        from_time = (datetime.utcnow() - timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ")

        query = " OR ".join(k.strip() for k in self._keywords if k.strip())

        try:
            async with self._session.get(
                NEWS_API_URL,
                params={
                    "q": query,
                    "from": from_time,
                    "sortBy": "relevance",
                    "pageSize": 10,
                    "apiKey": self._api_key
                }
            ) as resp:
                if resp.status != 200:
                    logger.warning(f"NewsAPI fetch status: {resp.status}")
                    return []

                data = await resp.json()
                return self._process_articles(data.get("articles", []))

        except Exception as e:
            logger.warning(f"NewsAPI fetch error: {e}")
            return await self._retry_fetch(query, from_time)

    async def _retry_fetch(
        self,
        query: str,
        from_time: str
    ) -> list[dict[str, Any]]:
        """Retry once after 5 second delay."""
        await asyncio.sleep(5)

        try:
            if not self._session:
                self._session = aiohttp.ClientSession()

            async with self._session.get(
                NEWS_API_URL,
                params={
                    "q": query,
                    "from": from_time,
                    "sortBy": "relevance",
                    "pageSize": 10,
                    "apiKey": self._api_key
                }
            ) as resp:
                if resp.status != 200:
                    return []

                data = await resp.json()
                return self._process_articles(data.get("articles", []))

        except Exception as e:
            logger.warning(f"NewsAPI retry failed: {e}")
            return []

    def _process_articles(self, articles: list[dict]) -> list[dict[str, Any]]:
        """Process and deduplicate articles."""
        results = []

        for article in articles:
            url = article.get("url", "")
            if not url or url in self._seen_urls:
                continue

            self._seen_urls.append(url)

            title = article.get("title", "")
            description = article.get("description", "")
            content = article.get("content", "")
            source = article.get("source", {}).get("name", "")
            published_at = article.get("publishedAt", "")

            text = f"{title}. {description} {content or ''}".strip()

            results.append({
                "source": source,
                "title": title,
                "text": text,
                "url": url,
                "published_at": published_at
            })

        return results

    async def close(self) -> None:
        if self._session:
            await self._session.close()
            self._session = None