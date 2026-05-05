import { useSymbolStore } from '../store/symbolStore';
import { toast } from 'react-hot-toast';

class WebSocketService {
  constructor() {
    this.url = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    this.ws = null;
    this.authenticated = false;
    this.reconnectAttempts = 0;
    this.pingInterval = null;
    this.pongTimeout = null;
    this.token = null;
  }

  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.token = token;
    
    const { setConnectionStatus } = useSymbolStore.getState();
    setConnectionStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WS Connection Opened');
      this.send({ type: 'auth', token: this.token });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (err) {
        if (import.meta.env.DEV) console.error('WS Malformed JSON:', err);
      }
    };

    this.ws.onclose = () => {
      this.handleDisconnect();
    };

    this.ws.onerror = (err) => {
      if (import.meta.env.DEV) console.error('WS Error:', err);
      this.ws.close();
    };
  }

  handleMessage(msg) {
    const store = useSymbolStore.getState();

    switch (msg.type) {
      case 'auth_success':
        this.authenticated = true;
        this.reconnectAttempts = 0;
        store.setConnectionStatus('CONNECTED');
        this.startHeartbeat();
        this.subscribeToAll();
        break;

      case 'pong':
        clearTimeout(this.pongTimeout);
        break;

      case 'regime_update':
        store.updateRegime(msg.symbol, msg.data);
        break;

      case 'microstructure_update':
        store.updateMicrostructure(msg.symbol, msg.data);
        break;

      case 'altdata_signal':
        store.updateAltDataSignal(msg.symbol, msg.data);
        break;

      case 'altdata_confluence':
        store.updateConfluence(msg.symbol, msg.data);
        break;

      case 'llm_insight':
        store.addInsight(msg.data);
        break;

      case 'alert':
        store.addAlert(msg.data);
        toast(msg.data.message, { icon: '🚨', style: { background: '#16162e', color: '#ff4455', border: '1px solid #ff445533' } });
        break;

      case 'summary_update':
        store.updateSummary(msg.data);
        break;

      case 'orderbook_update':
        store.updateOrderBook(msg.symbol, msg.data);
        break;
    }
  }

  startHeartbeat() {
    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
        this.pongTimeout = setTimeout(() => {
          console.warn('WS Pong Timeout - assumed dead');
          this.ws.close();
        }, 5000);
      }
    }, 30000);
  }

  handleDisconnect() {
    this.authenticated = false;
    clearInterval(this.pingInterval);
    clearTimeout(this.pongTimeout);
    
    const { setConnectionStatus } = useSymbolStore.getState();
    setConnectionStatus('DISCONNECTED');

    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
    this.reconnectAttempts++;
    
    console.log(`WS Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(this.token), delay);
  }

  subscribeToAll() {
    const { availableSymbols } = useSymbolStore.getState();
    availableSymbols.forEach(s => this.subscribe(s.id));
  }

  subscribe(symbol) {
    this.send({ type: 'subscribe', symbol });
  }

  unsubscribe(symbol) {
    this.send({ type: 'unsubscribe', symbol });
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.token = null; // Prevent auto-reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const wsService = new WebSocketService();
export default wsService;
