import os
import time
from datetime import datetime, timedelta
from typing import Optional

import streamlit as st
import redis

st.set_page_config(page_title="VektorLabs Dashboard", page_icon="📊", layout="wide")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

if "refresh" not in st.session_state:
    st.session_state.refresh = True

st.title("📊 VektorLabs System Monitor")

col_refresh, _ = st.columns([1, 4])
with col_refresh:
    if st.button("🔄 Refresh"):
        st.session_state.refresh = not st.session_state.refresh
        st.rerun()

st.divider()

def get_redis_client() -> Optional[redis.Redis]:
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        return r
    except Exception as e:
        return None

def check_redis_health(r: redis.Redis) -> dict:
    try:
        info = r.info("stats")
        server_info = r.info("server")
        return {
            "status": "Healthy",
            "connected_clients": info.get("connected_clients", 0),
            "used_memory": info.get("used_memory_human", "N/A"),
            "total_commands": info.get("total_commands_processed", 0),
            "uptime_seconds": server_info.get("uptime_seconds", 0),
        }
    except Exception as e:
        return {"status": f"Error: {e}", "connected_clients": 0, "used_memory": "N/A", "total_commands": 0, "uptime_seconds": 0}

def get_system_info(r: redis.Redis) -> dict:
    info = {}
    
    startup_time = r.get("system:startup_timestamp")
    if startup_time:
        info["uptime_seconds"] = int(time.time()) - int(startup_time)
        info["uptime_formatted"] = str(timedelta(seconds=info["uptime_seconds"]))
    else:
        info["uptime_seconds"] = 0
        info["uptime_formatted"] = "Unknown"

    symbols = r.get("system:symbols")
    if symbols:
        info["symbols"] = symbols.split(",")
    else:
        info["symbols"] = []

    valid_symbols = r.get("binance:symbols:valid")
    if valid_symbols:
        info["valid_symbols_count"] = len(valid_symbols.split(","))
    else:
        info["valid_symbols_count"] = 0

    return info

def get_regime_status(r: redis.Redis, symbols: list) -> list:
    regimes = []
    for symbol in symbols:
        key = f"regime:{symbol}"
        data = r.get(key)
        if data:
            import json
            try:
                regime_data = json.loads(data)
                regimes.append({
                    "symbol": symbol,
                    "regime": regime_data.get("regime", "unknown"),
                    "confidence": regime_data.get("confidence", 0),
                    "timestamp": regime_data.get("timestamp", "N/A")
                })
            except:
                regimes.append({"symbol": symbol, "regime": "error", "confidence": 0, "timestamp": "N/A"})
        else:
            regimes.append({"symbol": symbol, "regime": "no data", "confidence": 0, "timestamp": "N/A"})
    return regimes

def get_microstructure_status(r: redis.Redis, symbols: list) -> list:
    microstructure_data = []
    for symbol in symbols:
        key = f"microstructure:{symbol}"
        data = r.get(key)
        if data:
            import json
            try:
                ms_data = json.loads(data)
                microstructure_data.append({
                    "symbol": symbol,
                    "vpin": ms_data.get("vpin"),
                    "spread": ms_data.get("spread"),
                    "depth_imbalance": ms_data.get("depth_imbalance"),
                    "timestamp": ms_data.get("timestamp", "N/A")
                })
            except:
                microstructure_data.append({"symbol": symbol, "status": "error"})
        else:
            microstructure_data.append({"symbol": symbol, "status": "no data"})
    return microstructure_data

col1, col2 = st.columns(2)

with col1:
    st.subheader("🔴 Redis Status")
    r = get_redis_client()
    if r:
        health = check_redis_health(r)
        st.success(f"✅ {health['status']}")
        st.metric("Connected Clients", health['connected_clients'])
        st.metric("Used Memory", health['used_memory'])
        st.metric("Total Commands", f"{health['total_commands']:,}")
        st.metric("Redis Uptime", str(timedelta(seconds=health.get('uptime_seconds', 0))))
    else:
        st.error("❌ Not Connected - Make sure Redis is running")

with col2:
    st.subheader("⏱️ System Uptime")
    if r:
        info = get_system_info(r)
        st.info(f"⏰ {info.get('uptime_formatted', 'Unknown')}")
        st.metric("Active Symbols", len(info.get('symbols', [])))
        st.metric("Valid Binance Symbols", info.get('valid_symbols_count', 0))
    else:
        st.warning("Waiting for Redis...")

st.divider()

st.subheader("📈 Regime Detection Status")

if r:
    info = get_system_info(r)
    symbols = info.get('symbols', [])
    
    if symbols:
        regimes = get_regime_status(r, symbols)
        
        cols = st.columns(len(regimes) if regimes else 1)
        
        for i, regime in enumerate(regimes):
            with cols[i]:
                regime_color = {
                    "trending": "🟢",
                    "mean_reverting": "🔵",
                    "volatile": "🟠",
                    "illiquid": "🔴",
                    "no data": "⚪",
                    "error": "⚫"
                }.get(regime['regime'], "⚪")
                
                st.metric(
                    f"{regime_color} {regime['symbol']}",
                    regime['regime'].replace("_", " ").title(),
                    f"{regime['confidence']*100:.1f}% conf"
                )
    else:
        st.info("No symbols configured")
else:
    st.warning("Waiting for Redis connection...")

st.divider()

st.subheader("🔬 Microstructure Data")

if r:
    info = get_system_info(r)
    symbols = info.get('symbols', [])
    
    if symbols:
        ms_data = get_microstructure_status(r, symbols)
        
        for ms in ms_data:
            with st.expander(f"Symbol: {ms['symbol']}"):
                if "status" in ms:
                    st.warning(ms['status'])
                else:
                    col_a, col_b, col_c = st.columns(3)
                    col_a.metric("VPIN", f"{ms.get('vpin', 'N/A')}")
                    col_b.metric("Spread", f"{ms.get('spread', 'N/A')}")
                    col_c.metric("Depth Imbalance", f"{ms.get('depth_imbalance', 'N/A')}")
                    st.caption(f"Last updated: {ms.get('timestamp', 'N/A')}")
    else:
        st.info("No symbols configured")
else:
    st.warning("Waiting for Redis connection...")

st.divider()

st.subheader("🔍 Redis Keys Overview")

if r:
    keys = r.keys("*")
    key_counts = {}
    for key in keys:
        prefix = key.split(":")[0] if ":" in key else "other"
        key_counts[prefix] = key_counts.get(prefix, 0) + 1
    
    st.write("Key Categories:")
    for prefix, count in sorted(key_counts.items()):
        st.write(f"- `{prefix}`: {count} keys")
    
    with st.expander("Show all keys"):
        st.write(key for key in sorted(keys))
else:
    st.warning("Waiting for Redis connection...")

if r:
    r.close()

st.markdown("---")
st.caption(f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")