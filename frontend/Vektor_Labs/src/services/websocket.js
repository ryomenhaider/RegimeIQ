class WebSocketService {
  constructor() {
    this.url = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    this.ws = null;
    this.subscribers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WS Connected');
      this.reconnectAttempts = 0;
      // Resubscribe to previous topics if needed
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.subscribers.forEach((callback) => callback(data));
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('WS Malformed Message:', event.data, err);
        }
        // Silently discard in production
      }
    };

    this.ws.onclose = () => {
      console.log('WS Closed');
      this.attemptReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WS Error:', err);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      setTimeout(() => this.connect(), delay);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const wsService = new WebSocketService();
export default wsService;
