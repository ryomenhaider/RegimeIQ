import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import api from '../../services/api';

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
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {}
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
      
      if (data.type === 'context') {
        // Context panel will be updated via store/context
        return;
      }
      
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
        Chat - {currentSymbol}
      </div>

      <div 
        style={{ flex: 1, padding: '12px', overflowY: 'auto' }} 
        onScroll={handleScroll}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: '80%',
              marginLeft: msg.role === 'user' ? 'auto' : '0',
              marginBottom: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: msg.role === 'user' ? '#001a0d' : '#1a1a2e',
              fontSize: '12px',
              fontFamily: 'IBM Plex Sans, sans-serif',
              color: msg.error ? '#ff4455' : '#ddddf0',
              whiteSpace: 'pre-wrap'
            }}
          >
            {msg.streaming ? (
              <>
                {msg.content}
                {isWaiting && i === messages.length - 1 && <TypingIndicator />}
              </>
            ) : msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #2a2a4a', display: 'flex', gap: '8px' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about current market..."
          disabled={isWaiting}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '100px',
            padding: '8px 12px',
            background: '#0a0a15',
            border: '1px solid #2a2a4a',
            borderRadius: '8px',
            color: '#ddddf0',
            fontSize: '12px',
            fontFamily: 'IBM Plex Sans, sans-serif',
            resize: 'none',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isWaiting}
          style={{
            padding: '8px 16px',
            background: isWaiting ? '#2a2a4a' : '#00ff88',
            border: 'none',
            borderRadius: '8px',
            color: isWaiting ? '#666' : '#0b0b1a',
            fontSize: '12px',
            fontFamily: 'IBM Plex Mono, monospace',
            cursor: isWaiting ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-end'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <span style={{ marginLeft: '4px' }}>
    <span style={{ animation: 'bounce 0.6s infinite', animationDelay: '0s' }}>•</span>
    <span style={{ animation: 'bounce 0.6s infinite', animationDelay: '0.15s' }}>•</span>
    <span style={{ animation: 'bounce 0.6s infinite', animationDelay: '0.3s' }}>•</span>
    <style>{`
      @keyframes bounce {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
      }
    `}</style>
  </span>
);

export default ChatInterface;