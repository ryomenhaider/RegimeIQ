import React, { useMemo, useEffect, useRef } from 'react';
import { useSymbolStore } from '../../../store/symbolStore';

const MAX_ROWS = 20;

const OrderBookWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const book = useSymbolStore((state) => state.orderBooks[currentSymbol] || { bids: [], asks: [] });

  // Virtualization: Only render the top MAX_ROWS
  const visibleBids = useMemo(() => book.bids.slice(0, MAX_ROWS), [book.bids]);
  const visibleAsks = useMemo(() => book.asks.slice(0, MAX_ROWS).reverse(), [book.asks]);
  const maxQty = useMemo(() => Math.max(...visibleBids.map(b => b.qty), ...visibleAsks.map(a => a.qty), 1), [visibleBids, visibleAsks]);

  return (
    <div className="widget-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="widget-header" style={{ padding: '8px', borderBottom: '1px solid #2a2a4a', fontFamily: 'IBM Plex Mono, monospace' }}>Order Book</div>
      
      {/* Asks (Red) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden' }}>
        {visibleAsks.map((ask, i) => (
          <BookRow key={ask.price} price={ask.price} qty={ask.qty} side="ask" maxQty={maxQty} isBest={i === 0} />
        ))}
      </div>

      {/* Spread / Mid */}
      <div style={{ padding: '4px', textAlign: 'center', color: '#888', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace' }}>
        {book.spread || '---'}
      </div>

      {/* Bids (Green) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {visibleBids.map((bid, i) => (
          <BookRow key={bid.price} price={bid.price} qty={bid.qty} side="bid" maxQty={maxQty} isBest={i === 0} />
        ))}
      </div>
    </div>
  );
};

const BookRow = ({ price, qty, side, maxQty, isBest }) => {
  const color = side === 'bid' ? '#00ff88' : '#ff4455';
  
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0 8px',
      fontSize: isBest ? '13px' : '11px',
      fontFamily: 'IBM Plex Mono, monospace',
      opacity: 0,
      animation: 'fadeIn 150ms forwards'
    }}>
      {/* Depth Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: `${(qty / maxQty) * 100}%`,
        background: color,
        opacity: 0.15,
        zIndex: 0
      }} />
      
      <span style={{ color, zIndex: 1, fontWeight: isBest ? 'bold' : 'normal' }}>{price}</span>
      <span style={{ color: '#fff', zIndex: 1 }}>{qty}</span>
    </div>
  );
};

export default OrderBookWidget;
