import asyncio
import logging
import time
from collections import deque
from typing import Optional

import aiohttp
from sortedcontainers import SortedList

from core.config import get_config
from core.redis_bus import get_redis
from modules.microstructure.models import PriceLevel

logger = logging.getLogger("microstructure.manager")

BINANCE_DEPTH_REST_URL = "https://fapi.binance.com/fapi/v1/depth"


class OrderBook:
    def __init__(self, symbol: str, n_levels: int):
        self.symbol = symbol.upper()
        self.n_levels = n_levels
        self.bids: SortedList = SortedList(key=lambda x: -x.price)
        self.asks: SortedList = SortedList(key=lambda x: x.price)
        self.sequence: int = 0
        self.last_update: int = 0
        self._resyncing: bool = False
        self._snapshot_received: bool = False
        self._prev_bids: dict[float, float] = {}
        self._prev_asks: dict[float, float] = {}

    def apply_update(self, bids: list[dict], asks: list[dict], sequence: int, timestamp: int) -> None:
        if sequence <= self.sequence:
            return

        current_bids = {}
        for b in bids:
            price = float(b["price"])
            qty = float(b["quantity"])
            current_bids[price] = qty
            existing = [pl for pl in self.bids if pl.price == price]
            for pl in existing:
                self.bids.discard(pl)
            if qty > 0:
                self.bids.add(PriceLevel(price, qty))

        current_asks = {}
        for a in asks:
            price = float(a["price"])
            qty = float(a["quantity"])
            current_asks[price] = qty
            existing = [pl for pl in self.asks if pl.price == price]
            for pl in existing:
                self.asks.discard(pl)
            if qty > 0:
                self.asks.add(PriceLevel(price, qty))

        while len(self.bids) > self.n_levels:
            self.bids.pop(-1)
        while len(self.asks) > self.n_levels:
            self.asks.pop(-1)

        self._prev_bids = current_bids
        self._prev_asks = current_asks
        self.sequence = sequence
        self.last_update = timestamp
        if not self._snapshot_received:
            self._snapshot_received = True

    def compute_ofi(self, bids: list[dict], asks: list[dict]) -> float:
        current_bids = {float(b["price"]): float(b["quantity"]) for b in bids}
        current_asks = {float(a["price"]): float(a["quantity"]) for a in asks}

        bid_ofi = 0.0
        for price, qty in current_bids.items():
            prev_qty = self._prev_bids.get(price, 0.0)
            delta = qty - prev_qty
            if delta > 0:
                bid_ofi += delta
            elif delta < 0:
                bid_ofi -= abs(delta)

        ask_ofi = 0.0
        for price, qty in current_asks.items():
            prev_qty = self._prev_asks.get(price, 0.0)
            delta = qty - prev_qty
            if delta > 0:
                ask_ofi += delta
            elif delta < 0:
                ask_ofi -= abs(delta)

        return bid_ofi - ask_ofi

    def get_bid_ask_spread(self) -> Optional[float]:
        if not self.bids or not self.asks:
            return None
        return self.asks[0].price - self.bids[0].price

    def get_mid_price(self) -> Optional[float]:
        if not self.bids or not self.asks:
            return None
        return (self.bids[0].price + self.asks[0].price) / 2

    def get_depth_imbalance(self) -> Optional[float]:
        if not self.bids or not self.asks:
            return None
        bid_vol = sum(b.quantity for b in self.bids[:self.n_levels])
        ask_vol = sum(a.quantity for a in self.asks[:self.n_levels])
        if bid_vol + ask_vol == 0:
            return 0.0
        return (bid_vol - ask_vol) / (bid_vol + ask_vol)

    def get_weighted_mid_price(self) -> Optional[float]:
        if not self.bids or not self.asks:
            return None
        bid_vol = sum(b.quantity * b.price for b in self.bids[:self.n_levels])
        ask_vol = sum(a.quantity * a.price for a in self.asks[:self.n_levels])
        bid_qty = sum(b.quantity for b in self.bids[:self.n_levels])
        ask_qty = sum(a.quantity for a in self.asks[:self.n_levels])
        if bid_qty + ask_qty == 0:
            return self.get_mid_price()
        return (bid_vol + ask_vol) / (bid_qty + ask_qty)

    def is_ready(self) -> bool:
        return (
            not self._resyncing and
            self._snapshot_received and
            len(self.bids) > 0 and
            len(self.asks) > 0
        )


class MicrostructureFeatures:
    def __init__(self, symbol: str, bucket_size: float):
        self.symbol = symbol.upper()
        self.bucket_size = bucket_size
        
        self._bid_volumes = deque(maxlen=20)
        self._ask_volumes = deque(maxlen=20)
        
        self._cvd: float = 0.0
        self._last_price: Optional[float] = None
        
        self._vwap_history: list[tuple[float, float]] = []
        self._vwap_maxlen = 100
        
        self._bucket_volume: float = 0.0
        self._bucket_buy_volume: float = 0.0
        self._bucket_sell_volume: float = 0.0
        self._bucket_vpins: deque = deque(maxlen=50)

    def update_trade(self, price: float, quantity: float, side: str) -> None:
        notional = price * quantity
        
        if side.lower() == "buy":
            self._bucket_buy_volume += notional
        else:
            self._bucket_sell_volume += notional
        
        self._bucket_volume += notional
        
        if self._bucket_volume >= self.bucket_size:
            bucket_imbalance = abs(self._bucket_buy_volume - self._bucket_sell_volume) / self._bucket_volume
            self._bucket_vpins.append(bucket_imbalance)
            
            self._bucket_volume = 0.0
            self._bucket_buy_volume = 0.0
            self._bucket_sell_volume = 0.0

    def compute_vpin(self) -> float:
        if not self._bucket_vpins:
            return 0.0
        return sum(self._bucket_vpins) / len(self._bucket_vpins)

    def compute_cvd(self, side: str, quantity: float) -> float:
        if side.lower() == "buy":
            self._cvd += quantity
        else:
            self._cvd -= quantity
        return self._cvd

    def update_vwap(self, price: float, volume: float) -> None:
        self._vwap_history.append((price, volume))
        if len(self._vwap_history) > self._vwap_maxlen:
            self._vwap_history.pop(0)
        self._last_price = price

    def compute_vwap_dev(self, current_price: float) -> Optional[float]:
        if not self._vwap_history:
            return None
        
        total_vol = sum(v for _, v in self._vwap_history)
        if total_vol == 0:
            return None
        
        vwap = sum(p * v for p, v in self._vwap_history) / total_vol
        if vwap == 0:
            return None
        
        return (current_price - vwap) / vwap


class MicrostructureManager:
    def __init__(self):
        self._books: dict[str, OrderBook] = {}
        self._features: dict[str, MicrostructureFeatures] = {}
        self._orderbook_last_ids: dict[str, str] = {}
        self._trade_last_ids: dict[str, str] = {}
        
        self._redis = get_redis()
        self._config = get_config()
        self._http_session: Optional[aiohttp.ClientSession] = None
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._http_session = aiohttp.ClientSession()
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("MicrostructureManager started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._http_session:
            await self._http_session.close()
        logger.info("MicrostructureManager stopped")

    def add_symbol(self, symbol: str) -> None:
        symbol = symbol.upper()
        if symbol not in self._books:
            n_levels = self._config.get_orderbook_levels(symbol)
            self._books[symbol] = OrderBook(symbol, n_levels)
            self._orderbook_last_ids[symbol] = "0-0"
            
            bucket_size = self._config.get_vpin_bucket_size(symbol)
            self._features[symbol] = MicrostructureFeatures(symbol, bucket_size)
            self._trade_last_ids[symbol] = "0-0"
            logger.info(f"Added microstructure for {symbol}: {n_levels} levels, bucket ${bucket_size}")

    def remove_symbol(self, symbol: str) -> None:
        symbol = symbol.upper()
        if symbol in self._books:
            del self._books[symbol]
            del self._features[symbol]
            del self._orderbook_last_ids[symbol]
            del self._trade_last_ids[symbol]
            logger.info(f"Removed microstructure for {symbol}")

    async def resync(self, symbol: str) -> None:
        book = self._books.get(symbol)
        if not book or book._resyncing:
            return

        book._resyncing = True
        logger.info(f"Resyncing order book for {symbol}")

        try:
            url = f"{BINANCE_DEPTH_REST_URL}?symbol={symbol}&limit=1000"
            async with self._http_session.get(url) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    book.bids.clear()
                    book.asks.clear()

                    for b in data.get("bids", []):
                        if float(b[1]) > 0:
                            book.bids.add(PriceLevel(float(b[0]), float(b[1])))

                    for a in data.get("asks", []):
                        if float(a[1]) > 0:
                            book.asks.add(PriceLevel(float(a[0]), float(a[1])))

                    while len(book.bids) > book.n_levels:
                        book.bids.pop(-1)
                    while len(book.asks) > book.n_levels:
                        book.asks.pop(-1)

                    book.sequence = int(data.get("lastUpdateId", 0))
                    book.last_update = int(time.time() * 1000)
                    book._snapshot_received = True
                    logger.info(f"Resync complete for {symbol}, sequence={book.sequence}")
        except Exception as e:
            logger.error(f"Resync failed for {symbol}: {e}")
        finally:
            book._resyncing = False

    async def _run(self) -> None:
        while self._running:
            if not self._books:
                await asyncio.sleep(1)
                continue

            orderbook_streams = {f"raw:orderbook:{s}": self._orderbook_last_ids[s] for s in self._books.keys()}
            trade_streams = {f"raw:trades:{s}": self._trade_last_ids.get(s, "0-0") for s in self._books.keys()}

            all_streams = {**orderbook_streams, **trade_streams}
            
            if not all_streams:
                await asyncio.sleep(0.05)
                continue

            result = await self._redis.redis.xread(all_streams, count=20)

            if not result:
                await asyncio.sleep(0.05)
                continue

            for stream_name, messages in result:
                if "orderbook" in stream_name:
                    symbol = stream_name.replace("raw:orderbook:", "")
                    for msg_id, fields in messages:
                        self._orderbook_last_ids[symbol] = msg_id
                        await self._process_orderbook(symbol, fields)
                elif "trades" in stream_name:
                    symbol = stream_name.replace("raw:trades:", "")
                    for msg_id, fields in messages:
                        self._trade_last_ids[symbol] = msg_id
                        await self._process_trade(symbol, fields)

            await asyncio.sleep(0.05)

    async def _process_orderbook(self, symbol: str, fields: dict[str, str]) -> None:
        book = self._books.get(symbol)
        if not book:
            return

        data = self._redis.decode_message(fields)
        bids = data.get("bids", data.get("b", []))
        asks = data.get("asks", data.get("a", []))
        sequence = data.get("sequence", 0)
        timestamp = data.get("timestamp", int(time.time() * 1000))

        if sequence == 0:
            sequence = data.get("E", 0)

        if book.sequence > 0:
            if sequence <= book.sequence:
                return
            if sequence > book.sequence + 1:
                logger.warning(f"Sequence gap for {symbol}: {book.sequence} -> {sequence}, resyncing")
                await self.resync(symbol)
                return

        book.apply_update(bids, asks, sequence, timestamp)

        if book.is_ready():
            features = self._features.get(symbol)
            ofi = book.compute_ofi(bids, asks)
            
            bid_vol = sum(b.quantity for b in book.bids[:5])
            ask_vol = sum(a.quantity for a in book.asks[:5])
            if features:
                features._bid_volumes.append(bid_vol)
                features._ask_volumes.append(ask_vol)

            spread = book.get_bid_ask_spread()
            mid = book.get_mid_price()
            imbalance = book.get_depth_imbalance()
            wmid = book.get_weighted_mid_price()

            metrics = {
                "symbol": symbol,
                "timestamp": timestamp,
                "sequence": sequence,
                "spread": spread,
                "mid_price": mid,
                "weighted_mid_price": wmid,
                "depth_imbalance": imbalance,
                "ofi": ofi,
                "vpin": features.compute_vpin() if features else 0.0,
                "cvd": features._cvd if features else 0.0,
                "top_bid": book.bids[0].price if book.bids else None,
                "top_ask": book.asks[0].price if book.asks else None,
            }

            if features and features._last_price:
                metrics["vwap_deviation"] = features.compute_vwap_dev(features._last_price)

            avg_bid_pressure = sum(features._bid_volumes) / len(features._bid_volumes) if features and features._bid_volumes else 0
            avg_ask_pressure = sum(features._ask_volumes) / len(features._ask_volumes) if features and features._ask_volumes else 0
            metrics["bid_pressure"] = avg_bid_pressure
            metrics["ask_pressure"] = avg_ask_pressure

            await self._redis.publish(f"microstructure:{symbol}", metrics)

    async def _process_trade(self, symbol: str, fields: dict[str, str]) -> None:
        book = self._books.get(symbol)
        features = self._features.get(symbol)
        
        if not book or not book.is_ready() or not features:
            return

        data = self._redis.decode_message(fields)
        
        price = data.get("price")
        quantity = data.get("quantity")
        side = "buy" if not data.get("is_buyer_maker", True) else "sell"
        
        if price is None or quantity is None:
            return
        
        price = float(price)
        quantity = float(quantity)
        
        features.update_trade(price, quantity, side)
        features.compute_cvd(side, quantity)
        features.update_vwap(price, quantity)


_manager: Optional[MicrostructureManager] = None


def get_microstructure_manager() -> Optional[MicrostructureManager]:
    return _manager


async def init_microstructure_manager() -> MicrostructureManager:
    global _manager
    _manager = MicrostructureManager()
    await _manager.start()
    return _manager