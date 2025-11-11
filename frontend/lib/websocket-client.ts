import { PriceUpdate, WebSocketMessage } from '@/types';

type MessageHandler = (data: PriceUpdate) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private isConnecting = false;

  constructor() {
    this.url = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/api/v2/realtime/ws/prices`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);

          // Resubscribe to symbols after reconnection
          if (this.subscribedSymbols.size > 0) {
            this.subscribe(Array.from(this.subscribedSymbols));
          }

          resolve();
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.notifyConnectionHandlers(false);
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    if (data.type === 'price_update') {
      this.notifyMessageHandlers(data as PriceUpdate);
    } else if (data.type === 'connected') {
      console.log('Connected to price stream:', data.message);
    } else if (data.type === 'subscription') {
      console.log('Subscription update:', data);
    } else if (data.type === 'error') {
      console.error('WebSocket error:', data.message);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  subscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    upperSymbols.forEach(symbol => this.subscribedSymbols.add(symbol));

    const message: WebSocketMessage = {
      action: 'subscribe',
      symbols: upperSymbols,
    };

    this.ws.send(JSON.stringify(message));
  }

  unsubscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    upperSymbols.forEach(symbol => this.subscribedSymbols.delete(symbol));

    const message: WebSocketMessage = {
      action: 'unsubscribe',
      symbols: upperSymbols,
    };

    this.ws.send(JSON.stringify(message));
  }

  getSubscriptions(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const message: WebSocketMessage = {
      action: 'get_subscriptions',
    };

    this.ws.send(JSON.stringify(message));
  }

  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      action: 'ping',
    };

    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  private notifyMessageHandlers(data: PriceUpdate) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribedSymbols.clear();
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}

export default new WebSocketClient();