import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useSymbolStore, selectOrderBook, selectMicrostructure } from '../../../store/symbolStore';

const MAX_VISIBLE_ROWS = 20;
const FADE_DURATION = 150;

const OrderBookWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const orderBook = useSymbolStore(selectOrderBook(currentSymbol));
  const microstructure = useSymbolStore(selectMicrostructure(currentSymbol));

  const orderBookData = orderBook || {};
  const microstructureData = microstructure || {};

  const [localBook, setLocalBook] = useState({ bids: [], asks: [], spread: null });
  const [fadeIns, setFadeIns] = useState(new Set());
  const pendingUpdate = useRef(null);
  const rafId = useRef(null);
  const prevPrices = useRef(new Set());

  useEffect(() => {
    pendingUpdate.current = orderBookData || { bids: [], asks: [], spread: null };
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        const newBook = pendingUpdate.current;
        if (newBook.bids || newBook.asks) {
          const newPrices = new Set([
            ...(newBook.bids || []).map(b => b.price),
            ...(newBook.asks || []).map(a => a.price)
          ]);
          const addedPrices = [...newPrices].filter(p => !prevPrices.current.has(p));
          if (addedPrices.length > 0) {
            setFadeIns(prev => new Set([...prev, ...addedPrices]));
            setTimeout(() => {
              setFadeIns(prev => {
                const next = new Set(prev);
                addedPrices.forEach(p => next.delete(p));
                return next;
              });
            }, FADE_DURATION);
          }
          prevPrices.current = newPrices;
        }
        setLocalBook(newBook);
        rafId.current = null;
      });
    }
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [orderBook]);

  const bids = useMemo(() => (localBook.bids || []).slice(0, MAX_VISIBLE_ROWS), [localBook.bids]);
  const asks = useMemo(() => (localBook.asks || []).slice(0, MAX_VISIBLE_ROWS).reverse(), [localBook.asks]);

  const allQtys = useMemo(() => {
    const qtys = [...bids.map(b => b.qty), ...asks.map(a => a.qty)];
    return qtys.length ? qtys : [1];
  }, [bids, asks]);

  const maxQty = useMemo(() => Math.max(...allQtys), [allQtys]);
  const avgQty = useMemo(() => allQtys.reduce((a, b) => a + b, 0) / allQtys.length, [allQtys]);
  const LargeOrderThreshold = avgQty * 2;

  const ofiData = microstructureData?.ofi;
  const ofiImbalance = ofiData?.imbalance ?? 0;

  return (
    <>
      <style>{`
        .ob-scroll::-webkit-scrollbar { width: 2px; }
        .ob-scroll::-webkit-scrollbar-track { background: transparent; }
        .ob-scroll::-webkit-scrollbar-thumb { background: #2a2a4a; }
        .ob-row {
          position: relative; display: flex; justify-content: space-between;
          padding: 2px 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          transition: background 100ms ease; cursor: default;
        }
        .ob-row:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
        {/* Header */}
        <div
          className="widget-header"
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #2a2a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#7ED87A', boxShadow: '0 0 6px rgba(126,216,122,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              Order Book
            </span>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>{currentSymbol}</span>
        </div>

        {/* Column headers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid rgba(42,42,74,0.4)' }}>
          <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Price</span>
          <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Size</span>
        </div>

        {/* Asks */}
        <div role="list" aria-label="Asks" className="ob-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden' }}>
          {asks.map((ask) => (
            <BookRow key={ask.price} price={ask.price} qty={ask.qty} side="ask" maxQty={maxQty} largeThreshold={LargeOrderThreshold} fadeIn={fadeIns.has(ask.price)} />
          ))}
        </div>

        {/* Spread */}
        <div style={{
          padding: '5px 10px',
          textAlign: 'center',
          borderTop: '1px solid #2a2a4a',
          borderBottom: '1px solid #2a2a4a',
          background: '#0d0d1f',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>SPREAD</span>
          <span style={{ fontSize: '11px', color: '#ddddf0', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
            {localBook.spread || '—'}
          </span>
        </div>

        {/* Bids */}
        <div role="list" aria-label="Bids" className="ob-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {bids.map((bid) => (
            <BookRow key={bid.price} price={bid.price} qty={bid.qty} side="bid" maxQty={maxQty} largeThreshold={LargeOrderThreshold} fadeIn={fadeIns.has(bid.price)} />
          ))}
        </div>

        {/* OFI Strip */}
        <OFIStrip imbalance={ofiImbalance} />
      </div>
    </>
  );
};

const BookRow = React.memo(({ price, qty, side, maxQty, largeThreshold, fadeIn }) => {
  const isBid = side === 'bid';
  const color = isBid ? '#7ED87A' : '#ff4455';
  const isLarge = qty > largeThreshold;
  const percentage = (qty / maxQty) * 100;

  return (
    <div
      role="listitem"
      className="ob-row"
      style={{
        opacity: fadeIn ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        background: isLarge ? (isBid ? 'rgba(126,216,122,0.08)' : 'rgba(255,68,85,0.08)') : 'transparent'
      }}
    >
      <div
        style={{
          position: 'absolute', top: 0, [isBid ? 'left' : 'right']: 0, bottom: 0,
          width: `${percentage}%`, background: color, opacity: 0.08, pointerEvents: 'none'
        }}
      />
      <span style={{ color: isBid ? '#7ED87A' : '#ff4455', zIndex: 1, fontWeight: isLarge ? 600 : 400 }}>{price}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', zIndex: 1 }}>
        <span style={{ color: isLarge ? '#ddddf0' : '#7777aa' }}>{qty}</span>
        {isLarge && <span style={{ fontSize: '9px', color, letterSpacing: '0', opacity: 0.8 }}>◆</span>}
      </div>
    </div>
  );
});

const OFIStrip = ({ imbalance }) => {
  const bidPct = Math.min(50 + imbalance * 50, 100);
  const imbalanceColor = imbalance > 0.2 ? '#7ED87A' : imbalance < -0.2 ? '#ff4455' : '#555570';
  const label = imbalance > 0.1 ? 'BID' : imbalance < -0.1 ? 'ASK' : 'BALANCED';

  return (
    <div style={{
      height: '22px', display: 'flex', alignItems: 'center', padding: '0 10px',
      background: '#0a0a18', borderTop: '1px solid #2a2a4a', gap: '8px', flexShrink: 0
    }}>
      <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>FLOW</span>
      <div style={{ flex: 1, height: '4px', background: '#2a2a4a', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bidPct}%`, background: '#7ED87A', borderRadius: '2px', transition: 'width 200ms ease', opacity: 0.7 }} />
        <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${100 - bidPct}%`, background: '#ff4455', borderRadius: '2px', transition: 'width 200ms ease', opacity: 0.7 }} />
      </div>
      <span style={{ fontSize: '9px', color: imbalanceColor, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
};

export default OrderBookWidget;