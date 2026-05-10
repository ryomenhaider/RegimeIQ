import asyncio
import logging
import re
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Optional

import aiohttp

logger = logging.getLogger("llm_reasoner.fetchers.sec_edgar")

BASE_URL = "https://efts.sec.gov/LATEST/search-index"
INTERVAL = 900


class SECEdgarFetcher:

    def __init__(self) -> None:
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_accession: str = ""
        self._seen_accessions: deque = deque(maxlen=50)

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch new 8-K and 10-Q filings."""
        if not self._session:
            self._session = aiohttp.ClientSession()

        start_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

        try:
            async with self._session.get(
                BASE_URL,
                params={
                    "q": "",
                    "dateRange": "custom",
                    "startdt": start_date,
                    "forms": "8-K,10-Q",
                    "from": 0,
                    "size": 10
                }
            ) as resp:
                if resp.status != 200:
                    logger.warning(f"EDGAR fetch status: {resp.status}")
                    return []

                data = await resp.json()
                return await self._process_filings(data.get("hits", {}))

        except Exception as e:
            logger.warning(f"EDGAR fetch error: {e}")
            return await self._retry_fetch(start_date)

    async def _retry_fetch(self, start_date: str) -> list[dict[str, Any]]:
        """Retry once after 5 second delay."""
        await asyncio.sleep(5)
        try:
            if not self._session:
                self._session = aiohttp.ClientSession()

            async with self._session.get(
                BASE_URL,
                params={
                    "q": "",
                    "dateRange": "custom",
                    "startdt": start_date,
                    "forms": "8-K,10-Q",
                    "from": 0,
                    "size": 10
                }
            ) as resp:
                if resp.status != 200:
                    return []

                data = await resp.json()
                return await self._process_filings(data.get("hits", {}))

        except Exception as e:
            logger.warning(f"EDGAR retry failed: {e}")
            return []

    async def _process_filings(self, hits: dict[str, Any]) -> list[dict[str, Any]]:
        """Process filings from API response."""
        results = []

        for hit in hits.get("hits", []):
            accession = hit.get("_id", "")
            if accession in self._seen_accessions:
                continue

            self._seen_accessions.append(accession)
            if not self._last_accession:
                self._last_accession = accession
                continue

            fields = hit.get("_source", {})
            entity = fields.get("entityName", "")
            doc_type = fields.get("form", "")
            filed_at = fields.get("filedAt", "")
            cik = fields.get("cik", "")

            text = await self._fetch_filing_text(cik, accession, doc_type)

            if text:
                plain_text = self._strip_html(text)

                results.append({
                    "entity": entity,
                    "document_type": doc_type,
                    "accession_number": accession,
                    "text": plain_text,
                    "filed_at": filed_at
                })

        return results

    async def _fetch_filing_text(
        self,
        cik: str,
        accession: str,
        doc_type: str
    ) -> Optional[str]:
        """Fetch full filing text from SEC."""
        if not self._session:
            return None

        filing_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/{doc_type}.txt"

        try:
            async with self._session.get(
                filing_url,
                headers={"User-Agent": "VektorLabs/1.0 support@vektorlabs.xyz"}
            ) as resp:
                if resp.status == 200:
                    return await resp.text()
                return None

        except Exception:
            return None

    def _strip_html(self, text: str) -> str:
        """Remove HTML tags, return plain text."""
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    async def close(self) -> None:
        if self._session:
            await self._session.close()
            self._session = None