# WebSocket Code Examples

This document provides practical code examples for working with WebSockets in this application.

## Basic WebSocket Connection

Example of establishing a simple WebSocket connection:

\`\`\`typescript
import { WebSocketConnectionManager } from "@/lib/websocket/websocket-connection-manager";

const wsManager = new WebSocketConnectionManager({
  url: "wss://fstream.binance.com/ws",
  autoReconnect: true,
  debug: true
});

// Connect to WebSocket server
wsManager.connect()
  .then(() => {
    console.log("Connected successfully");
  })
  .catch(error => {
    console.error("Connection failed:", error);
  });

// Listen for connection events
wsManager.on("connect", () => {
  console.log("WebSocket connected");
});

wsManager.on("disconnect", (event) => {
  console.log("WebSocket disconnected:", event);
});

wsManager.on("message", (data) => {
  console.log("Received message:", data);
});

// Send a subscription message
wsManager.send(JSON.stringify({
  method: "SUBSCRIBE",
  params: ["btcusdt@trade"],
  id: 1
}));

// Later, disconnect when done
wsManager.disconnect();
\`\`\`

## Using the Unified WebSocket Client

Example of using the higher-level unified WebSocket client:

\`\`\`typescript
import { unifiedWebSocketClient } from "@/lib/websocket/unified-websocket-client";

// Connect to WebSocket for a specific symbol
unifiedWebSocketClient.connect("btcusdt");

// Subscribe to status updates
const statusSubscription = unifiedWebSocketClient.subscribe((status, metrics) => {
  console.log(`Connection status: ${status}`);
  console.log(`Message rate: ${metrics.messageRate}/s`);
  console.log(`Latency: ${metrics.latency}ms`);
});

// Subscribe to a specific data stream
const tradeSubscription = unifiedWebSocketClient.subscribeToStream("btcusdt@trade", (data) => {
  console.log(`Trade: ${data.p} x ${data.q}`);
  console.log(`Buyer is maker: ${data.m}`);
});

// Subscribe to another stream
const klineSubscription = unifiedWebSocketClient.subscribeToStream("btcusdt@kline_1m", (data) => {
  console.log(`Candle: O=${data.k.o}, H=${data.k.h}, L=${data.k.l}, C=${data.k.c}`);
});

// Later, clean up subscriptions
tradeSubscription();
klineSubscription();
statusSubscription();

// Disconnect when completely done
unifiedWebSocketClient.disconnect();
\`\`\`

## Working with Market Data Service

Example of using the MarketDataService to fetch and subscribe to market data:

\`\`\`typescript
import { binanceMarketDataService } from "@/features/websocket/lib/market-data-service";

// Fetch market data using REST API
async function fetchMarketData() {
  try {
    // Get 24-hour ticker
    const ticker = await binanceMarketDataService.get24hrTicker("btcusdt");
    console.log("24hr Price Change:", ticker.priceChangePercent);
    
    // Get recent trades
    const trades = await binanceMarketDataService.getRecentTrades("btcusdt", 10);
    console.log("Recent trades:", trades.length);
    
    // Get order book
    const orderBook = await binanceMarketDataService.getOrderBook("btcusdt", 5);
    console.log("Top bid:", orderBook.bids[0]);
    console.log("Top ask:", orderBook.asks[0]);
    
    // Get klines (candlestick data)
    const klines = await binanceMarketDataService.getKlines("btcusdt", "1m", 10);
    console.log("Recent candles:", klines.length);
  } catch (error) {
    console.error("Error fetching market data:", error);
  }
}

// Subscribe to real-time data streams
function subscribeToRealTimeData() {
  // Subscribe to price updates
  const priceUnsubscribe = binanceMarketDataService.subscribeToPrice("btcusdt", (price) => {
    console.log("Current price:", price);
  });
  
  // Subscribe to trade updates
  const tradesUnsubscribe = binanceMarketDataService.subscribeToAggTrades("btcusdt", (trade) => {
    console.log("New trade:", trade);
  });
  
  // Subscribe to candlestick updates
  const klinesUnsubscribe = binanceMarketDataService.subscribeToKlines("btcusdt", "1m", (kline) => {
    console.log("Candle update:", kline);
  });
  
  // Return cleanup function
  return () => {
    priceUnsubscribe();
    tradesUnsubscribe();
    klinesUnsubscribe();
  };
}

// Example usage in a component
function MyMarketComponent() {
  useEffect(() => {
    fetchMarketData();
    const cleanup = subscribeToRealTimeData();
    
    // Cleanup subscriptions when component unmounts
    return cleanup;
  }, []);
  
  // Component rendering code...
}
\`\`\`

## Using Enhanced Market Data Service

Example of using the enhanced market data service with caching and fallback capabilities:

\`\`\`typescript
import { enhancedMarketDataService } from "@/lib/market/enhanced-market-data-service";

// Fetch data with caching and fallback
async function fetchDataWithFallback() {
  try {
    // Get current price
    const priceResult = await enhancedMarketDataService.getCurrentPrice("btcusdt");
    if (priceResult.data) {
      console.log(`Price: ${priceResult.data} (source: ${priceResult.source})`);
    } else if (priceResult.error) {
      console.error("Error fetching price:", priceResult.error);
    }
    
    // Get order book
    const orderBookResult = await enhancedMarketDataService.getOrderBook("btcusdt", 5);
    if (orderBookResult.data) {
      console.log("Order book source:", orderBookResult.source);
      console.log("Top bid:", orderBookResult.data.bids[0]);
    }
    
    // Get recent trades
    const tradesResult = await enhancedMarketDataService.getRecentTrades("btcusdt");
    if (tradesResult.data && tradesResult.data.length > 0) {
      console.log(`Got ${tradesResult.data.length} trades from ${tradesResult.source}`);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// Subscribe to real-time updates with fallback capability
function subscribeWithFallback() {
  // Configure subscription options
  const options = {
    reconnect: true,
    maxRetries: 3,
    retryInterval: 1000
  };
  
  // Subscribe to price updates
  const priceUnsubscribe = enhancedMarketDataService.subscribeToPrice(
    "btcusdt",
    (result) => {
      if (result.data) {
        console.log(`Price update: ${result.data} (source: ${result.source})`);
      }
    },
    options
  );
  
  // Subscribe to order book updates
  const orderBookUnsubscribe = enhancedMarketDataService.subscribeToOrderBook(
    "btcusdt",
    (result) => {
      if (result.data) {
        console.log(`Order book update (source: ${result.source})`);
        console.log(`Spread: ${result.data.asks[0].price - result.data.bids[0].price}`);
      }
    },
    options
  );
  
  // Return cleanup function
  return () => {
    priceUnsubscribe();
    orderBookUnsubscribe();
  };
}

// Example React hook
function useMarketData(symbol = "btcusdt") {
  const [price, setPrice] = useState<number | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  
  useEffect(() => {
    // Initial data fetch
    enhancedMarketDataService.getCurrentPrice(symbol).then(result => {
      if (result.data) setPrice(result.data);
    });
    
    enhancedMarketDataService.getOrderBook(symbol).then(result => {
      if (result.data) setOrderBook(result.data);
    });
    
    // Subscribe to updates
    const priceUnsubscribe = enhancedMarketDataService.subscribeToPrice(
      symbol,
      (result) => {
        if (result.data) setPrice(result.data);
      }
    );
    
    const orderBookUnsubscribe = enhancedMarketDataService.subscribeToOrderBook(
      symbol,
      (result) => {
        if (result.data) setOrderBook(result.data);
      }
    );
    
    // Cleanup subscriptions
    return () => {
      priceUnsubscribe();
      orderBookUnsubscribe();
    };
  }, [symbol]);
  
  return { price, orderBook };
}
\`\`\`

## WebSocket Status Monitoring

Example of implementing WebSocket connection status monitoring in a React component:

\`\`\`tsx
import { useEffect, useState } from 'react';
import { unifiedWebSocketClient, WebSocketStatus, WebSocketMetrics } from '@/lib/websocket/unified-websocket-client';

export function WebSocketMonitor() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [metrics, setMetrics] = useState<WebSocketMetrics>({
    latency: 0,
    messageRate: 0,
    uptime: 0,
    reconnects: 0,
    lastMessageTime: null
  });
  
  useEffect(() => {
    // Subscribe to WebSocket status and metrics updates
    const unsubscribe = unifiedWebSocketClient.subscribe((newStatus, newMetrics) => {
      setStatus(newStatus);
      setMetrics(newMetrics);
    });
    
    // Initialize with current values
    setStatus(unifiedWebSocketClient.getStatus());
    setMetrics(unifiedWebSocketClient.getMetrics());
    
    // Connect to WebSocket if not already connected
    if (unifiedWebSocketClient.getStatus() === 'disconnected') {
      unifiedWebSocketClient.connect('btcusdt');
    }
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Render status and metrics information
  return (
    <div className="websocket-monitor">
      <h3>WebSocket Status: {status}</h3>
      
      <div className="metrics">
        <div>
          <span>Latency:</span>
          <span>{metrics.latency}ms</span>
        </div>
        <div>
          <span>Message Rate:</span>
          <span>{metrics.messageRate}/s</span>
        </div>
        <div>
          <span>Uptime:</span>
          <span>{Math.floor(metrics.uptime / 1000)}s</span>
        </div>
        <div>
          <span>Reconnects:</span>
          <span>{metrics.reconnects}</span>
        </div>
        <div>
          <span>Last Message:</span>
          <span>{metrics.lastMessageTime 
            ? new Date(metrics.lastMessageTime).toLocaleTimeString() 
            : 'None'}
          </span>
        </div>
      </div>
      
      <button 
        onClick={() => unifiedWebSocketClient.forceReconnect()}
        disabled={status === 'connecting'}
      >
        Force Reconnect
      </button>
    </div>
  );
}
\`\`\`

## Error Handling Examples

Example of implementing error handling for WebSocket operations:

\`\`\`typescript
import { errorHandler } from '@/lib/error-handling';
import { unifiedWebSocketClient } from '@/lib/websocket/unified-websocket-client';
import { toast } from '@/components/ui/use-toast';

// Set up global error handling for WebSocket
function setupWebSocketErrorHandling() {
  unifiedWebSocketClient.subscribe((status, metrics) => {
    // Handle connection state changes
    if (status === 'error') {
      errorHandler.handleError(new Error('WebSocket connection error'), {
        context: { metrics },
        severity: 'high',
        code: 'WS_CONNECTION_ERROR',
      });
      
      // Show user-friendly notification
      toast({
        title: 'Connection Error',
        description: 'WebSocket connection failed. Reconnecting...',
        variant: 'destructive',
      });
    } else if (status === 'fallback') {
      toast({
        title: 'Using Fallback Mode',
        description: 'Switched to REST API fallback mode',
        variant: 'warning',
      });
    } else if (status === 'connected' && metrics.reconnects > 0) {
      toast({
        title: 'Connection Restored',
        description: `WebSocket connection restored after ${metrics.reconnects} attempts`,
        variant: 'success',
      });
    }
  });
}

// Handle stream-specific errors
function handleStreamErrors(symbol: string, streamType: string) {
  try {
    const unsubscribe = unifiedWebSocketClient.subscribeToStream(
      `${symbol}@${streamType}`,
      (data) => {
        // Process data...
      }
    );
    
    // Return both the unsubscribe function and an error handler
    return {
      unsubscribe,
      handleError: (error: Error) => {
        errorHandler.handleError(error, {
          context: { symbol, streamType },
          severity: 'medium',
          code: 'STREAM_PROCESSING_ERROR',
        });
        
        // Attempt recovery
        unifiedWebSocketClient.forceReconnect();
      }
    };
  } catch (error) {
    errorHandler.handleError(error as Error, {
      context: { symbol, streamType },
      severity: 'high',
      code: 'STREAM_SUBSCRIPTION_ERROR',
    });
    
    // Return no-op functions for type safety
    return {
      unsubscribe: () => {},
      handleError: () => {}
    };
  }
}
\`\`\`

These examples should help you understand how to work with the WebSocket implementation in this application. For more specific use cases, refer to the source code of the respective components and services.
