import { useSymbolStore } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 30000];

class WebSocketService {
  constructor() {
    this.ws = null;
    this.authenticated = false;
    this.subscriptions = new Set();
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.messageHandlers = new Map();
  }

  connect(token) {
    if (this.ws) {
      this.ws.close(1000);
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'auth', token }));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('Malformed WS message', e);
        }
      }
    };

    this.ws.onclose = (e) => {
      this.authenticated = false;
      useSymbolStore.getState().setConnectionStatus('disconnected');
      if (!e.wasClean || e.code !== 1000) {
        this.reconnect();
      }
    };

    this.ws.onerror = (e) => {
      if (import.meta.env.DEV) {
        console.error('WS Error', e);
      }
      this.reconnect();
    };
  }

  handleMessage(message) {
    const { type, symbol, data } = message;
    const store = useSymbolStore.getState();

    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(message);
    }

    switch (type) {
      case 'auth_success':
        this.authenticated = true;
        this.reconnectAttempt = 0;
        store.setConnectionStatus('connected');
        const activeSymbols = store.activeSymbols;
        activeSymbols.forEach(s => this.subscribe(s.id || s));
        this.startHeartbeat();
        break;

      case 'regime_update':
        if (symbol && data) {
          store.updateRegime(symbol, data);
        }
        break;

      case 'microstructure_update':
        if (symbol && data) {
          store.updateMicrostructure(symbol, data);
        }
        break;

      case 'altdata_confluence':
      case 'altdata_signal':
        if (symbol && data) {
          store.updateAltData(symbol, data);
        }
        break;

      case 'llm_insight':
        store.addInsight(data);
        break;

      case 'alert':
        store.addAlert(data);
        toast.error(data.message);
        break;

      case 'summary_update':
        store.updateSummary(data?.text);
        break;

      case 'orderbook_update':
        if (symbol && data) {
          store.updateOrderBook(symbol, data);
        }
        break;

      case 'pong':
        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
          this.pongTimer = null;
        }
        break;

      case 'auth_failure':
        useAuthStore.getState().clearAuth();
        window.location.href = '/login?expired=true';
        toast.error('Session expired');
        break;
    }
  }

  subscribe(symbol) {
    this.subscriptions.add(symbol);
    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  unsubscribe(symbol) {
    this.subscriptions.delete(symbol);
    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.pongTimer = setTimeout(() => {
          this.reconnect();
        }, 5000);
      }
    }, 30000);
  }

  reconnect() {
    if (this.reconnectTimer) return;

    useSymbolStore.getState().setConnectionStatus('reconnecting');
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.reconnectTimer = null;
      const freshToken = useAuthStore.getState().accessToken;
      if (freshToken) {
        this.connect(freshToken);
      }
    }, delay);
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.authenticated = false;
  }

  onStatusChange(handler) {
    const unsubscribe = useSymbolStore.subscribe(
      (state) => state.connectionStatus,
      handler
    );
    return unsubscribe;
  }

  getStatus() {
    return useSymbolStore.getState().connectionStatus;
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
    return () => this.messageHandlers.delete(type);
  }
}

const service = new WebSocketService();
export default service;