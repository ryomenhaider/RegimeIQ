import asyncio
import json
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Optional

from core.config import Config
from core.database import Database
from core.redis_bus import RedisBus
from modules.microstructure.order_book import OrderBook, MicrostructureOutput
from modules.microstructure.features import MicrostructureFeatures
from modules.microstructure.trade_flow import TradeFlowAnalyzer

logger = logging.getLogger(__name__)


@dataclass
class _SymbolState:
    orderbook: OrderBook
    features: MicrostructureFeatures
    trade_flow: TradeFlowAnalyzer
    prev_levels: dict[str, dict[float, float]] = field(default_factory=dict)
    last_orderbook_id: int = 0
    last_trade_id: int = 0


class MicrostructureManager:
    def __init__(
        self,
        redis: RedisBus,
        db: Optional[Database] = None,
        config: Optional[Config] = None
    ):
        self._redis = redis
        self._db = db
        self._config = config or Config()
        self._symbols: dict[str, _SymbolState] = {}
        self._running = False
        self._tasks: list[asyncio.Task] = []

    def add_symbol(self, symbol: str) -> None:
        if symbol in self._symbols:
            return

        try:
            ofi_n = self._config.get_orderbook_levels(symbol) if self._config else 20
        except Exception:
            ofi_n = 20
        
        try:
            vpin_bucket_size = self._config.get_vpin_bucket_size(symbol) if self._config else 1_000_000
        except Exception:
            vpin_bucket_size = 1_000_000

        features = MicrostructureFeatures(
            symbol=symbol,
            ofi_n=ofi_n,
            bucket_size=vpin_bucket_size,
            vpin_window=50
        )

        trade_flow = TradeFlowAnalyzer(
            symbol=symbol,
            kyle_window=200,
            gm_window=100,
            gm_delay_ms=10_000
        )

        self._symbols[symbol] = _SymbolState(
            orderbook=OrderBook(),
            features=features,
            trade_flow=trade_flow,
            prev_levels={"bid": {}, "ask": {}},
            last_orderbook_id=0,
            last_trade_id=0
        )
        logger.info(f"Added symbol {symbol} to MicrostructureManager")

    def remove_symbol(self, symbol: str) -> None:
        if symbol in self._symbols:
            del self._symbols[symbol]
            logger.info(f"Removed symbol {symbol} from MicrostructureManager")

    async def _process_orderbook(
        self,
        symbol: str,
        data: dict[str, Any]
    ) -> None:
        state = self._symbols.get(symbol)
        if state is None:
            return

        try:
            timestamp = data.get("timestamp", 0)
            update_id = data.get("update_id", 0)

            if update_id <= state.last_orderbook_id:
                return

            if "bids" in data and "asks" in data:
                bids = [(float(b[0]), float(b[1])) for b in data["bids"]]
                asks = [(float(a[0]), float(a[1])) for a in data["asks"]]
                state.orderbook.apply_snapshot(bids, asks, update_id)
                prev = state.prev_levels
                state.features.update_from_book(state.orderbook, prev)
                state.prev_levels = {"bid": {}, "ask": {}}
            else:
                side = data.get("side", "")
                price = float(data.get("price", 0))
                qty = float(data.get("qty", 0))
                if state.orderbook.apply_delta(side, price, qty, update_id):
                    prev = state.prev_levels
                    state.features.update_from_book(state.orderbook, prev)
                    state.prev_levels = {"bid": {}, "ask": {}}

            state.last_orderbook_id = update_id

            await self._publish_output(symbol, timestamp)

        except Exception as e:
            logger.error(f"Error processing orderbook for {symbol}: {e}")

    async def _process_trade(
        self,
        symbol: str,
        data: dict[str, Any]
    ) -> None:
        state = self._symbols.get(symbol)
        if state is None:
            return

        try:
            timestamp = data.get("timestamp", 0)
            trade_id = data.get("trade_id", 0)

            if trade_id <= state.last_trade_id:
                return

            price = float(data.get("price", 0))
            qty = float(data.get("quantity", 0))
            is_buyer_maker = data.get("is_buyer_maker", False)

            state.features.update_from_trade(price, qty, is_buyer_maker, timestamp)

            intensity = state.features.compute_trade_intensity(timestamp)
            state.features.compute_vwap_deviation(state.orderbook.mid_price)

            state.trade_flow.update(
                price, qty, is_buyer_maker, timestamp, state.orderbook.mid_price
            )

            state.last_trade_id = trade_id

            await self._publish_output(symbol, timestamp)

        except Exception as e:
            logger.error(f"Error processing trade for {symbol}: {e}")

    async def _publish_output(self, symbol: str, timestamp: int) -> None:
        state = self._symbols.get(symbol)
        if state is None:
            return

        ob = state.orderbook
        features = state.features
        trade_flow = state.trade_flow

        output = MicrostructureOutput(
            symbol=symbol,
            timestamp=timestamp,
            ofi=features.ofi,
            ofi_ma_10=features.ofi_ma_10,
            vpin=features.vpin,
            kyle_lambda=trade_flow.get_kyle_lambda(),
            cvd=features.cvd,
            trade_intensity=features.trade_intensity,
            spread=ob.spread,
            mid_price=ob.mid_price,
            weighted_mid_price=ob.weighted_mid_price,
            depth_imbalance=ob.depth_imbalance,
            adverse_selection_pct=trade_flow.get_adverse_selection_pct(),
            vwap_deviation=features.vwap_deviation,
            bid_pressure=ob.bid_pressure(),
            ask_pressure=ob.ask_pressure(),
            top_bid=ob.best_bid,
            top_ask=ob.best_ask,
            bids=[[p, q] for p, q in ob.top_n_bids(20)],
            asks=[[p, q] for p, q in ob.top_n_asks(20)]
        )

        stream_key = f"microstructure:{symbol}"
        await self._redis.publish(stream_key, output.to_dict())

        # Also store latest data in regular key for dashboard
        output_dict = output.to_dict()
        output_dict["timestamp"] = str(output_dict.get("timestamp", int(time.time() * 1000)))
        await self._redis.redis.setex(f"ms:latest:{symbol}", 60, json.dumps(output_dict))

        if self._db:
            asyncio.create_task(self._write_to_db(output))

    async def _write_to_db(self, output: MicrostructureOutput) -> None:
        if self._db is None:
            return

        try:
            await self._db.execute(
                """
                INSERT INTO microstructure (
                    symbol, timestamp, ofi, ofi_ma_10, vpin, kyle_lambda,
                    cvd, trade_intensity, spread, mid_price, weighted_mid_price,
                    depth_imbalance, adverse_selection_pct, vwap_deviation,
                    bid_pressure, ask_pressure, top_bid, top_ask, bids, asks
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                """,
                output.symbol,
                output.timestamp,
                output.ofi,
                output.ofi_ma_10,
                output.vpin,
                output.kyle_lambda,
                output.cvd,
                output.trade_intensity,
                output.spread,
                output.mid_price,
                output.weighted_mid_price,
                output.depth_imbalance,
                output.adverse_selection_pct,
                output.vwap_deviation,
                output.bid_pressure,
                output.ask_pressure,
                output.top_bid,
                output.top_ask,
                json.dumps(output.bids),
                json.dumps(output.asks)
            )
        except Exception as e:
            logger.error(f"Error writing to DB: {e}")

    async def start(self, symbols: list[str]) -> None:
        if self._running:
            return

        for symbol in symbols:
            self.add_symbol(symbol)

        self._running = True

        orderbook_streams = {f"raw:orderbook:{s}": "0-0" for s in symbols}
        trades_streams = {f"raw:trades:{s}": "0-0" for s in symbols}

        self._tasks.append(asyncio.create_task(self._consume_loop(orderbook_streams, "orderbook")))
        self._tasks.append(asyncio.create_task(self._consume_loop(trades_streams, "trades")))

        logger.info(f"MicrostructureManager started for {symbols}")

    async def _consume_loop(
        self,
        streams: dict[str, str],
        stream_type: str
    ) -> None:
        while self._running:
            try:
                for stream_key, last_id in streams.items():
                    symbol = stream_key.split(":")[-1]

                    messages = await self._redis.redis.xread(
                        {stream_key: last_id},
                        count=10,
                        block=1000
                    )

                    if not messages:
                        continue

                    for stream_name, stream_messages in messages:
                        for msg_id, fields in stream_messages:
                            data = json.loads(fields.get("data", "{}"))
                            data["timestamp"] = data.get("timestamp", 0)
                            data["update_id"] = data.get("update_id", 0)
                            data["trade_id"] = data.get("trade_id", 0)

                            if stream_type == "orderbook":
                                await self._process_orderbook(symbol, data)
                            else:
                                await self._process_trade(symbol, data)

                            streams[stream_key] = msg_id

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Consume loop error ({stream_type}): {e}")
                await asyncio.sleep(1)

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        logger.info("MicrostructureManager stopped")