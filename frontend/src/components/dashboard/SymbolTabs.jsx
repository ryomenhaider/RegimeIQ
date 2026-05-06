import React, { useState, useEffect } from 'react';
import { useSymbols } from '../../hooks/useSymbols';
import { useAuth } from '../../hooks/useAuth';

const REGIME_COLORS = {
  trending: '#00ff88',
  mean_reverting: '#00ccff',
  volatile: '#f5c542',
  illiquid: '#ff4455',
  unknown: '#444466'
};

const SymbolTabs = () => {
  const { activeSymbols, currentSymbol, setCurrentSymbol, reorderSymbols } = useSymbols();
  const { user } = useAuth();
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === index) return;
    
    const newOrder = [...activeSymbols];
    const dragged = newOrder[draggedItem];
    newOrder.splice(draggedItem, 1);
    newOrder.splice(index, 0, dragged);
    
    reorderSymbols(newOrder);
    setDraggedItem(index);
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '36px', 
      background: '#050510', 
      alignItems: 'center', 
      paddingLeft: '10px',
      borderBottom: '1px solid #2a2a4a' 
    }}>
      {activeSymbols.map((symbol, index) => (
        <div
          key={symbol.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onClick={() => setCurrentSymbol(symbol.id)}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            background: currentSymbol === symbol.id ? '#1a1a35' : '#11112a',
            borderBottom: currentSymbol === symbol.id ? '2px solid #00ff88' : 'none',
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            fontFamily: 'IBM Plex Mono, monospace',
            color: '#fff'
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: REGIME_COLORS[symbol.regime] || REGIME_COLORS.unknown,
            marginRight: '8px',
            animation: (symbol.regime === 'volatile' || symbol.regime === 'illiquid') 
              ? 'pulse 1.5s infinite' 
              : 'none'
          }} />
          {symbol.label}
        </div>
      ))}
      <button style={{ 
        marginLeft: '10px', 
        background: 'none', 
        border: '1px solid #2a2a4a', 
        color: '#888',
        cursor: 'pointer' 
      }}>
        +
      </button>
    </div>
  );
};

export default SymbolTabs;
