import { useSymbolStore } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.authenticated = false;
    this.subscriptions = new Set();
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.reconnectDelays = [1000, 2000, 4000, 8000, 30000];
  }

  connect(token) {
    if (this.ws) this.disconnect();
    
    this.ws = new WebSocket(import.meta.env.VITE_WS_URL);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'auth', token }));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.warn('Malformed WS message', e);
      }
    };

    this.ws.onclose = () => {
      this.authenticated = false;
      useSymbolStore.getState().setConnectionStatus('disconnected');
      this.reconnect();
    };

    this.ws.onerror = (e) => {
      console.error('WS Error', e);
      this.reconnect();
    };
  }

  handleMessage(message) {
    const { type, symbol, data } = message;
    const store = useSymbolStore.getState();

    switch (type) {
      case 'auth_success':
        this.authenticated = true;
        this.reconnectAttempt = 0;
        store.setConnectionStatus('connected');
        this.subscriptions.forEach(s => this.subscribe(s));
        this.startHeartbeat();
        break;
      case 'regime_update':
        store.updateRegime(symbol, data);
        break;
      case 'microstructure_update':
        store.updateMicrostructure(symbol, data);
        break;
      case 'altdata_confluence':
      case 'altdata_signal':
        store.updateAltData(symbol, data);
        break;
      case 'llm_insight':
        store.addInsight(data);
        break;
      case 'alert':
        store.addAlert(data);
        toast.error(data.message);
        break;
      case 'summary_update':
        store.updateSummary(data.text);
        break;
      case 'orderbook_update':
        store.updateOrderBook(symbol, data);
        break;
      case 'pong':
        clearTimeout(this.pongTimer);
        break;
      case 'auth_failure':
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
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
        this.pongTimer = setTimeout(() => this.reconnect(), 5000);
      }
    }, 30000);
  }

  reconnect() {
    if (this.reconnectTimer) return;
    
    useSymbolStore.getState().setConnectionStatus('reconnecting');
    const delay = this.reconnectDelays[Math.min(this.reconnectAttempt, this.reconnectDelays.length - 1)];
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.reconnectTimer = null;
      this.connect(useAuthStore.getState().accessToken);
    }, delay);
  }

  disconnect() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.pongTimer);
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.authenticated = false;
  }
}

export default new WebSocketService();
