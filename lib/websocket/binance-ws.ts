import { EventEmitter } from "events";

interface WSConfig {
  url: string;
  reconnectDelay?: number;
  maxReconnects?: number;
}

export class BinanceWS extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private config: WSConfig;
  
  constructor(config: WSConfig) {
    super();
    this.config = {
      reconnectDelay: 1000,
      maxReconnects: 10,
      ...config
    };
  }

  connect(
    onMessage: (data: unknown) => void, 
    onError?: (error: Error) => void,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
    }
  ) {
    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.reconnectCount = 0;
        console.log(`WS connected to ${this.config.url}`);
        this.emit('open');
      };

      this.ws.onmessage = (e) => {
        try {
          onMessage(JSON.parse(e.data));
        } catch (err) {
          const error = new Error(`Message parse error: ${err instanceof Error ? err.message : String(err)}`);
          console.error(error.message);
          onError?.(error);
        }
      };

      this.ws.onclose = (event) => {
        this.emit('close', event);
        if (this.reconnectCount < this.config.maxReconnects!) {
          setTimeout(() => {
            this.reconnectCount++;
            this.connect(onMessage, onError);
          }, this.config.reconnectDelay);
        }
      };

      this.ws.onerror = (e) => {
        const error = new Error(`WebSocket error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        console.error(error.message);
        
        // Implement circuit breaker pattern
        if (this.reconnectCount > 5) {
          error.message = `Connection failed after ${this.reconnectCount} attempts: ${error.message}`;
        }
        
        try {
          this.emit('error', error);
          onError?.(error);
        } catch (emitError) {
          console.error('Error handler failed:', emitError);
          // Prevent unhandled rejections
        }
        
        // Force close to ensure clean reconnect
        this.ws?.close(4000, 'Error occurred');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  disconnect() {
    this.ws?.close();
    this.reconnectCount = this.config.maxReconnects! + 1;
  }

  get readyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  send(data: string): void {
    if (this.ws && this.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(code?: number, reason?: string): void {
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  getStatus() {
    return {
      isConnected: this.readyState === WebSocket.OPEN,
      reconnectCount: this.reconnectCount
    };
  }
}
