"""Ingestor for Reddit sentiment.

Uses PRAW to fetch posts from subreddits.
Computes VADER sentiment per post.
Runs SentimentVelocity and SpikeDetector.
"""

import asyncio
import logging
import os
from typing import Any, Optional

from core.config import get_config
from core.redis_bus import get_redis
from modules.altdata.extractors.sentiment import RobustZScore, SentimentVelocity
from modules.altdata.extractors.spike_detector import SpikeDetector

logger = logging.getLogger("altdata.ingestors.reddit")

INTERVAL = 300
DEFAULT_SUBREDDITS = ["bitcoin", "ethereum", "cryptocurrency"]


class RedditIngestor:
    """Ingestor for Reddit sentiment.

    Uses PRAW to fetch posts from subreddits.
    Computes VADER sentiment score.
    Runs SentimentVelocity and SpikeDetector.
    """

    def __init__(self) -> None:
        self._running = False
        self._redis = get_redis()
        self._config = get_config()

        self._client_id = os.getenv("REDDIT_CLIENT_ID", "")
        self._client_secret = os.getenv("REDDIT_CLIENT_SECRET", "")
        self._username = os.getenv("REDDIT_USERNAME", "")
        self._password = os.getenv("REDDIT_PASSWORD", "")

        if not self._client_id or not self._client_secret:
            logger.warning("Reddit credentials not set - ingestor may fail")

        self._subreddits = self._config.get("subreddits", DEFAULT_SUBREDDITS)
        logger.info(f"RedditIngestor using subreddits: {self._subreddits}")

        self._sentiment_velocity: dict[str, SentimentVelocity] = {}
        self._post_count_spike: dict[str, SpikeDetector] = {}
        self._score_spike: dict[str, SpikeDetector] = {}

    async def start(self) -> None:
        self._running = True
        self._init_state()
        asyncio.create_task(self._run_loop())
        logger.info("RedditIngestor started")

    def _init_state(self) -> None:
        for sub in self._subreddits:
            self._sentiment_velocity[sub] = SentimentVelocity(f"reddit:{sub}")
            self._post_count_spike[sub] = SpikeDetector(f"posts:{sub}")
            self._score_spike[sub] = SpikeDetector(f"score:{sub}")

    async def stop(self) -> None:
        self._running = False
        logger.info("RedditIngestor stopped")

    async def _run_loop(self) -> None:
        while self._running:
            attempt = 0
            while attempt < 3:
                try:
                    await self._fetch_reddit()
                    break
                except Exception as e:
                    attempt += 1
                    wait = 2 ** attempt
                    logger.warning(f"Reddit retry {attempt}/3: {e}")
                    if attempt < 3:
                        await asyncio.sleep(wait)
            await asyncio.sleep(INTERVAL)

    async def _fetch_reddit(self) -> None:
        if not self._client_id or not self._client_secret:
            return

        try:
            import praw

            reddit = praw.Reddit(
                client_id=self._client_id,
                client_secret=self._client_secret,
                username=self._username,
                password=self._password,
                user_agent="VektorLabs/1.0"
            )

            for subreddit in self._subreddits:
                posts = []
                try:
                    for post in reddit.subreddit(subreddit).new(limit=100):
                        if post.created_utc > asyncio.get_event_loop().time() - 3600:
                            posts.append(post)
                except Exception as e:
                    logger.warning(f"Error fetching r/{subreddit}: {e}")
                    continue

                if not posts:
                    continue

                scores = [self._vader_score(post.title) for post in posts]
                mean_score = sum(scores) / len(scores) if scores else 0

                vel, vel_z = self._sentiment_velocity[subreddit].update(mean_score, int(asyncio.get_event_loop().time() * 1000))

                post_spike = self._post_count_spike[subreddit].update(len(posts))
                score_spike = self._score_spike[subreddit].update(mean_score)

                signal = {
                    "source": "reddit",
                    "symbol": subreddit,
                    "score": mean_score,
                    "z_score": abs(vel_z),
                    "velocity_z": vel_z,
                    "post_count": len(posts),
                    "is_spike": post_spike.is_spike or score_spike.is_spike,
                    "timestamp": int(asyncio.get_event_loop().time() * 1000)
                }

                await self._redis.publish("altdata:signals", signal)
                logger.debug(f"Published reddit signal for r/{subreddit}")

        except ImportError:
            logger.warning("PRAW not installed - skipping Reddit ingestor")
        except Exception as e:
            logger.error(f"Reddit fetch error: {e}")

    def _vader_score(self, text: str) -> float:
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            analyzer = SentimentIntensityAnalyzer()
            result = analyzer.polarity_scores(text)
            return result["compound"]
        except ImportError:
            return 0.0
        except Exception:
            return 0.0