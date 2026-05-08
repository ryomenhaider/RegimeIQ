import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSymbolStore } from '../../../store/symbolStore';
import api from '../../../services/api';

const ChatInterface = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const eventSourceRef = useRef(null);
  const scrollRef = useRef({ autoScroll: true });

  useEffect(() => {
    const saved = sessionStorage.getItem(`chat_history_${currentSymbol}`);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch (e) {}
    }
  }, [currentSymbol]);

  useEffect(() => {
    sessionStorage.setItem(`chat_history_${currentSymbol}`, JSON.stringify(messages));
  }, [messages, currentSymbol]);

  useEffect(() => {
    if (scrollRef.current.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    scrollRef.current.autoScroll = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isWaiting) return;
    const userMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsWaiting(true);
    const aiMessage = { role: 'assistant', content: '', timestamp: Date.now(), streaming: true };
    setMessages(prev => [...prev, aiMessage]);

    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL || ''}/api/insights/chat?question=${encodeURIComponent(userMessage.content)}&symbol=${currentSymbol}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'context') return;
      if (data.type === 'chunk') {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + data.content };
          }
          return updated;
        });
      }
      if (data.type === 'done') {
        eventSource.close();
        setIsWaiting(false);
        inputRef.current?.focus();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content || 'Failed to get response. Try again.',
            error: true
          };
        }
        return updated;
      });
      setIsWaiting(false);
      inputRef.current?.focus();
    };
  }, [input, isWaiting, currentSymbol]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <>
      <style>{`
        .chat-scrollarea::-webkit-scrollbar { width: 3px; }
        .chat-scrollarea::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollarea::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
        .chat-scrollarea::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }

        .chat-input {
          background: #090910;
          border: 1px solid #2a2a4a;
          border-radius: 5px;
          color: #ddddf0;
          font-size: 12px;
          font-family: 'IBM Plex Sans', sans-serif;
          resize: none;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          width: 100%;
          padding: 8px 12px;
          line-height: 1.5;
        }
        .chat-input:focus {
          border-color: rgba(126,216,122,0.4);
          box-shadow: 0 0 0 2px rgba(126,216,122,0.06);
        }
        .chat-input::placeholder { color: #555570; }
        .chat-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .chat-send-btn {
          background: #7ED87A;
          border: none;
          border-radius: 4px;
          color: #090910;
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          padding: 0 14px;
          height: 36px;
          align-self: flex-end;
          transition: background 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
          box-shadow: 0 0 12px rgba(126,216,122,0.18);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) {
          background: #8fe08b;
          box-shadow: 0 0 18px rgba(126,216,122,0.3);
        }
        .chat-send-btn:disabled {
          background: #2a2a4a;
          color: #555570;
          box-shadow: none;
          cursor: not-allowed;
        }

        @keyframes msgIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#00ccff', boxShadow: '0 0 6px rgba(0,204,255,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              AI Chat
            </span>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>
            {currentSymbol}
          </span>
        </div>

        {/* Messages */}
        <div
          className="chat-scrollarea"
          style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}
          onScroll={handleScroll}
        >
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#555570', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', lineHeight: '1.8' }}>
              <div style={{ fontSize: '18px', marginBottom: '8px', opacity: 0.4 }}>◈</div>
              Ask about {currentSymbol} market conditions,<br />regime drivers, or flow dynamics.
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                animation: 'msgIn 200ms ease-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '9px 12px',
                borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                background: msg.role === 'user' ? 'rgba(126,216,122,0.08)' : '#16162e',
                border: msg.role === 'user' ? '1px solid rgba(126,216,122,0.18)' : '1px solid #2a2a4a',
                fontSize: '12px',
                fontFamily: 'IBM Plex Sans, sans-serif',
                color: msg.error ? '#ff4455' : '#ddddf0',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.streaming ? (
                  <>
                    {msg.content}
                    {isWaiting && i === messages.length - 1 && <TypingIndicator />}
                  </>
                ) : msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid #2a2a4a', display: 'flex', gap: '8px', flexShrink: 0 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${currentSymbol}...`}
            disabled={isWaiting}
            rows={1}
            className="chat-input"
            style={{ minHeight: '36px', maxHeight: '96px' }}
          />
          <button onClick={handleSubmit} disabled={!input.trim() || isWaiting} className="chat-send-btn">
            {isWaiting ? '···' : 'SEND'}
          </button>
        </div>
      </div>
    </>
  );
};

const TypingIndicator = () => (
  <>
    <style>{`
      @keyframes typingDot {
        0%, 60%, 100% { opacity: 0.2; }
        30% { opacity: 1; }
      }
    `}</style>
    <span style={{ marginLeft: '4px', display: 'inline-flex', gap: '3px', alignItems: 'center', verticalAlign: 'middle' }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <span key={i} style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: '#7ED87A', animation: `typingDot 0.8s infinite`, animationDelay: `${delay}s` }} />
      ))}
    </span>
  </>
);

export default ChatInterface;