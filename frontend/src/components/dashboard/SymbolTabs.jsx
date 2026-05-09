import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { COLORS, REGIME_COLORS } from '../../utils/constants';
import { Modal, Button, Tooltip } from '../ui';

const PLAN_LIMITS = { trial: 3, standard: 10, unlimited: Infinity };

const AddSymbolModal = ({ isOpen, onClose, onAdd }) => {
  const [search, setSearch] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const inputRef = useRef(null);

  const cachedSymbols = useSymbolStore((state) => state.cachedSymbols);
  const cachedSymbolsFetched = useSymbolStore((state) => state.cachedSymbolsFetched);
  const setCachedSymbols = useSymbolStore((state) => state.setCachedSymbols);

  const { data: symbolData, refetch } = useQuery({
    queryKey: ['symbols-list'],
    queryFn: async () => {
      const res = await api.get('/symbols/list');
      return res.data;
    },
    enabled: !cachedSymbolsFetched,
    staleTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (symbolData?.data) {
      setCachedSymbols(symbolData.data);
    }
  }, [symbolData, setCachedSymbols]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedSymbol(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredSymbols = (cachedSymbols || []).filter(s => 
    s.symbol?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedSymbol) {
      onAdd(selectedSymbol);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Symbol">
      <div style={{ minHeight: '300px' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search symbols..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#0b0b1a',
            border: '1px solid #2a2a4a',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'IBM Plex Mono, monospace',
            marginBottom: '16px'
          }}
        />
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {filteredSymbols.slice(0, 20).map((sym) => (
            <div
              key={sym.symbol}
              onClick={() => setSelectedSymbol(sym)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: selectedSymbol?.symbol === sym.symbol ? '#1a1a35' : 'transparent',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ 
                fontFamily: 'IBM Plex Mono, monospace', 
                fontSize: '13px',
                color: '#fff'
              }}>
                {sym.symbol}
              </span>
              {sym.daysOfData < 60 && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  background: '#2a1500',
                  color: '#f5c542',
                  borderRadius: '4px'
                }}>
                  Insufficient data
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={!selectedSymbol}>Add</Button>
      </div>
    </Modal>
  );
};

const ContextMenu = ({ x, y, symbol, onClose, onRemove, onSettings }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: '#1a1a2e',
        border: '1px solid #2a2a4a',
        borderRadius: '6px',
        padding: '4px 0',
        minWidth: '160px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}
    >
      <button
        onClick={onRemove}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          color: '#ff4455',
          fontSize: '13px',
          fontFamily: 'IBM Plex Mono, monospace',
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        Remove Symbol
      </button>
      <button
        onClick={onSettings}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 16px',
          background: 'none',
          border: 'none',
          color: '#ddddf0',
          fontSize: '13px',
          fontFamily: 'IBM Plex Mono, monospace',
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        Symbol Settings
      </button>
    </div>
  );
};

export default function SymbolTabs() {
  const activeSymbols = useSymbolStore((state) => state.activeSymbols);
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const setCurrentSymbol = useSymbolStore((state) => state.setCurrentSymbol);
  const reorderSymbols = useSymbolStore((state) => state.reorderSymbols);
  const addSymbol = useSymbolStore((state) => state.addSymbol);
  const removeSymbol = useSymbolStore((state) => state.removeSymbol);
  const plan = useAuthStore((state) => state.plan);
  const username = useAuthStore((state) => state.username);
  
  const [dragState, setDragState] = useState({ dragging: null, overIndex: null });
  const [contextMenu, setContextMenu] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const longPressTimer = useRef(null);
  const saveTimeout = useRef(null);

  const symbolLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  const atLimit = activeSymbols.length >= symbolLimit;

  const handleDragStart = useCallback((e, index) => {
    setDragState({ dragging: index, overIndex: null });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    if (dragState.dragging === null || dragState.dragging === index) return;
    setDragState(prev => ({ ...prev, overIndex: index }));
  }, [dragState.dragging]);

  const handleDragEnd = useCallback(() => {
    if (dragState.dragging !== null && dragState.overIndex !== null && dragState.dragging !== dragState.overIndex) {
      const newOrder = [...activeSymbols];
      const [dragged] = newOrder.splice(dragState.dragging, 1);
      newOrder.splice(dragState.overIndex, 0, dragged);
      reorderSymbols(newOrder);
      
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        api.patch(`/users/${username}/settings`, { symbol_order: newOrder.map(s => s.id) });
      }, 500);
    }
    setDragState({ dragging: null, overIndex: null });
  }, [dragState, activeSymbols, reorderSymbols, username]);

  const handleContextMenu = useCallback((e, symbol) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, symbol });
  }, []);

  const handleTouchStart = useCallback((e, symbol) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({ x: touch.clientX, y: touch.clientY, symbol });
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  const handleRemove = useCallback(async () => {
    if (!contextMenu?.symbol) return;
    const symbolId = contextMenu.symbol.id;
    if (window.confirm(`Remove ${contextMenu.symbol.label}? This will stop data collection.`)) {
      try {
        await api.delete(`/users/${username}/symbols/${symbolId}`);
      } catch (err) {
        // Continue even if API fails
      }
      removeSymbol(symbolId);
    }
    setContextMenu(null);
  }, [contextMenu, username, removeSymbol]);

  const handleSettings = useCallback(() => {
    if (!contextMenu?.symbol) return;
    window.location.href = `/dashboard/${username}/settings?symbol=${contextMenu.symbol.id}`;
    setContextMenu(null);
  }, [contextMenu, username]);

  const handleAddSymbol = useCallback((symbol) => {
    addSymbol({ id: symbol.symbol, label: symbol.symbol, regime: 'unknown' });
  }, [addSymbol]);

  const getRegimeStyle = (regime) => {
    const baseColor = REGIME_COLORS[regime] || REGIME_COLORS.unknown;
    const isPulsing = regime === 'volatile' || regime === 'illiquid';
    return {
      backgroundColor: baseColor,
      animation: isPulsing ? 'pulse 1.5s infinite' : 'none'
    };
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
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
            onDragEnd={handleDragEnd}
            onClick={() => setCurrentSymbol(symbol.id)}
            onContextMenu={(e) => handleContextMenu(e, symbol)}
            onTouchStart={(e) => handleTouchStart(e, symbol)}
            onTouchEnd={handleTouchEnd}
            style={{
              padding: '6px 12px',
              cursor: 'grab',
              background: currentSymbol === symbol.id ? '#1a1a35' : '#11112a',
              borderBottom: currentSymbol === symbol.id ? '2px solid #00ff88' : 'none',
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px',
              fontFamily: 'IBM Plex Mono, monospace',
              color: '#fff',
              transition: 'background 100ms',
              opacity: dragState.dragging === index ? 0.5 : 1
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              ...getRegimeStyle(symbol.regime),
              marginRight: '8px',
              flexShrink: 0
            }} />
            {symbol.label}
            {symbol.regime === 'illiquid' && (
              <Tooltip content="Low liquidity - warnings enabled">
                <span style={{ marginLeft: '4px', color: '#ff4455', fontSize: '10px' }}>⚠</span>
              </Tooltip>
            )}
          </div>
        ))}
        
        {atLimit ? (
          <Tooltip content="Plan limit reached">
            <button
              style={{ 
                marginLeft: '10px', 
                background: 'none', 
                border: '1px solid #2a2a4a', 
                color: '#444',
                cursor: 'not-allowed',
                padding: '4px 10px',
                borderRadius: '4px'
              }}
              disabled
            >
              +
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            style={{ 
              marginLeft: '10px', 
              background: 'none', 
              border: '1px solid #2a2a4a', 
              color: '#888',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: '4px'
            }}
          >
            +
          </button>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          symbol={contextMenu.symbol}
          onClose={() => setContextMenu(null)}
          onRemove={handleRemove}
          onSettings={handleSettings}
        />
      )}

      <AddSymbolModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSymbol}
      />
    </>
  );
}