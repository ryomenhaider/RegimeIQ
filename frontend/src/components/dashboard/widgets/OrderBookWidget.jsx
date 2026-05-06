import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useSymbolStore, selectOrderBook, selectMicrostructure } from '../../store/symbolStore';

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
          if (addedPrices.size > 0) {
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
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
      <div
        className="widget-header"
        style={{
          padding: '8px',
          borderBottom: '1px solid #2a2a4a',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'IBM Plex Mono, monospace',
          cursor: 'grab'
        }}
      >
        Order Book - {currentSymbol}
      </div>

      <div role="list" aria-label="Asks" style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden' }}>
        {asks.map((ask) => (
          <BookRow
            key={ask.price}
            price={ask.price}
            qty={ask.qty}
            side="ask"
            maxQty={maxQty}
            largeThreshold={LargeOrderThreshold}
            fadeIn={fadeIns.has(ask.price)}
          />
        ))}
      </div>

      <div style={{
        padding: '4px 8px',
        textAlign: 'center',
        color: '#888',
        fontSize: '11px',
        fontFamily: 'IBM Plex Mono, monospace',
        borderTop: '1px solid #2a2a4a',
        borderBottom: '1px solid #2a2a4a'
      }}>
        Spread: {localBook.spread || '---'}
      </div>

      <div role="list" aria-label="Bids" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {bids.map((bid) => (
          <BookRow
            key={bid.price}
            price={bid.price}
            qty={bid.qty}
            side="bid"
            maxQty={maxQty}
            largeThreshold={LargeOrderThreshold}
            fadeIn={fadeIns.has(bid.price)}
          />
        ))}
      </div>

      <OFIStrip imbalance={ofiImbalance} />
    </div>
  );
};

const BookRow = React.memo(({ price, qty, side, maxQty, largeThreshold, fadeIn }) => {
  const isBid = side === 'bid';
  const color = isBid ? '#00ff88' : '#ff4455';
  const isBest = false; // Could compute from book
  const isLarge = qty > largeThreshold;
  const percentage = (qty / maxQty) * 100;

  return (
    <div
      role="listitem"
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '2px 8px',
        fontSize: isBest ? '13px' : '11px',
        fontFamily: 'IBM Plex Mono, monospace',
        opacity: fadeIn ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        background: isLarge ? (isBid ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,85,0.15)') : 'transparent'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          [isBid ? 'left' : 'right']: 0,
          bottom: 0,
          width: `${percentage}%`,
          background: color,
          opacity: 0.15,
          pointerEvents: 'none'
        }}
      />
      <span style={{ color: isBest ? color : '#aaa', zIndex: 1 }}>{price}</span>
      <div style={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
        <span style={{ color: '#fff' }}>{qty}</span>
        {isLarge && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🐋</span>}
      </div>
    </div>
  );
});

const OFIStrip = ({ imbalance }) => {
  const totalWidth = 100;
  const bidWidth = imbalance > 0 ? Math.min(imbalance * 50, 50) : 50;
  const askWidth = imbalance < 0 ? Math.min(Math.abs(imbalance) * 50, 50) : 50;
  const direction = imbalance > 0 ? '→' : imbalance < 0 ? '←' : '−';

  return (
    <div style={{
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
      background: '#0a0a15',
      borderTop: '1px solid #2a2a4a'
    }}>
      <span style={{ fontSize: '10px', color: '#666', marginRight: '8px' }}>OFI:</span>
      <div style={{ flex: 1, height: '12px', display: 'flex', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            height: '100%',
            width: `${bidWidth}%`,
            background: '#00ff88',
            opacity: 0.4
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            height: '100%',
            width: `${askWidth}%`,
            background: '#ff4455',
            opacity: 0.4
          }}
        />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '14px',
          color: imbalance > 0 ? '#00ff88' : imbalance < 0 ? '#ff4455' : '#666'
        }}>
          {direction}
        </div>
      </div>
    </div>
  );
};

export default OrderBookWidget;