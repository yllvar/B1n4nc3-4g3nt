# Component Documentation

This document provides detailed documentation for the key components used in this application.

## Market Components

### PriceDisplay

**Description:**
Displays the current price with percentage change indicator.

**File Location:** `/components/market/price-display.tsx`

**Props:**
- `price` (number | null): Current price
- `priceChange` (number | null): Percentage price change
- `isLoading` (boolean): Loading state flag

**Usage Example:**
\`\`\`jsx
<PriceDisplay 
  price={65432.10}
  priceChange={1.25}
  isLoading={false}
/>
\`\`\`

### OrderBook

**Description:**
Displays bid and ask orders with visual depth representation.

**File Location:** `/components/market/order-book.tsx`

**Props:**
- `data` (object): Order book data containing bids and asks
  - `bids` (OrderBookEntry[]): Array of bid entries
  - `asks` (OrderBookEntry[]): Array of ask entries
- `isLoading` (boolean): Loading state flag

**Types:**
\`\`\`typescript
interface OrderBookEntry {
  price: number;
  quantity: number;
}
\`\`\`

**Usage Example:**
\`\`\`jsx
<OrderBook 
  data={{
    bids: [
      { price: 65430.00, quantity: 1.2 },
      { price: 65425.00, quantity: 0.5 }
    ],
    asks: [
      { price: 65435.00, quantity: 0.8 },
      { price: 65440.00, quantity: 1.5 }
    ]
  }}
  isLoading={false}
/>
\`\`\`

### RecentTrades

**Description:**
Displays a table of recent trades with price, amount, and time.

**File Location:** `/components/market/recent-trades.tsx`

**Props:**
- `data` (Trade[]): Array of trade data
- `isLoading` (boolean): Loading state flag

**Types:**
\`\`\`typescript
interface Trade {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}
\`\`\`

**Usage Example:**
\`\`\`jsx
<RecentTrades 
  data={[
    { id: 123456789, price: 65432.10, quantity: 0.05, time: 1639125536000, isBuyerMaker: true },
    { id: 123456790, price: 65433.20, quantity: 0.10, time: 1639125537000, isBuyerMaker: false }
  ]}
  isLoading={false}
/>
\`\`\`

### MarketStats

**Description:**
Displays key market statistics such as 24h high/low, volume, and price change.

**File Location:** `/components/market/market-stats.tsx`

**Props:**
- `highPrice` (number | null): 24h high price
- `lowPrice` (number | null): 24h low price
- `volume` (number | null): 24h trading volume
- `priceChange` (number | null): 24h price change percentage
- `isLoading` (boolean): Loading state flag

**Usage Example:**
\`\`\`jsx
<MarketStats 
  highPrice={65789.10}
  lowPrice={64987.65}
  volume={12345.67}
  priceChange={1.25}
  isLoading={false}
/>
\`\`\`

## Chart Components

### ResponsiveChart

**Description:**
A responsive chart component that adapts to different screen sizes and data types.

**File Location:** `/features/charts/components/responsive-chart.tsx`

**Props:**
- `data` (any[]): Chart data array
- `config` (ChartConfig): Configuration for the chart
- `height` (number, optional): Chart height in pixels (default: 300)
- `loading` (boolean, optional): Loading state flag (default: false)
- `className` (string, optional): Additional CSS classes

**Types:**
\`\`\`typescript
interface ChartSeries {
  key: string;
  name: string;
  type: "line" | "area" | "bar";
  color: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

interface ChartConfig {
  xAxisKey: string;
  xAxisFormatter?: (value: any) => string;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: number, name: string) => string | number;
  series: ChartSeries[];
  grid?: boolean;
  brush?: boolean;
  pan?: boolean;
  zoom?: boolean;
}
\`\`\`

**Usage Example:**
\`\`\`jsx
<ResponsiveChart
  data={[
    { timestamp: 1639125600000, value: 65432.10, volume: 12.5 },
    { timestamp: 1639125660000, value: 65445.60, volume: 8.3 }
  ]}
  config={{
    xAxisKey: "timestamp",
    xAxisFormatter: (value) => new Date(value).toLocaleTimeString(),
    series: [
      {
        key: "value",
        name: "Price",
        type: "line",
        color: "hsl(var(--chart-1))"
      },
      {
        key: "volume",
        name: "Volume",
        type: "bar",
        color: "hsl(var(--chart-2))"
      }
    ],
    grid: true
  }}
  height={400}
  loading={false}
/>
\`\`\`

### PerformanceChart

**Description:**
Specialized chart component for displaying WebSocket performance metrics.

**File Location:** `/features/charts/components/performance-chart.tsx`

**Props:**
- `data` (Array<WebSocketMetrics & { timestamp: number }>): Metrics data with timestamps
- `type` ("messageRate" | "latency" | "errors"): Type of performance metric to display
- `isLoading` (boolean, optional): Loading state flag (default: false)
- `height` (number, optional): Chart height in pixels (default: 200)
- `className` (string, optional): Additional CSS classes

**Usage Example:**
\`\`\`jsx
<PerformanceChart
  data={[
    { timestamp: 1639125600000, messageRate: 12.5, pingLatency: 15, errorCount: 0 },
    { timestamp: 1639125660000, messageRate: 14.2, pingLatency: 12, errorCount: 0 }
  ]}
  type="messageRate"
  height={250}
  isLoading={false}
/>
\`\`\`

### IndicatorChart

**Description:**
Chart component that displays technical indicators alongside price data.

**File Location:** `/features/charts/components/indicator-chart.tsx`

**Props:**
- `data` (any[]): Price and volume data points
- `indicators` (object): Flags for which indicators to display
- `loading` (boolean, optional): Loading state flag
- `height` (number, optional): Chart height in pixels

**Usage Example:**
\`\`\`jsx
<IndicatorChart
  data={[
    { timestamp: 1639125600000, open: 65432.10, high: 65456.70, low: 65412.30, close: 65445.60, volume: 78.9 },
    { timestamp: 1639125660000, open: 65445.60, high: 65470.20, low: 65440.10, close: 65462.30, volume: 62.5 }
  ]}
  indicators={{
    ema: true,
    vwap: true,
    atr: false,
    emaPeriod: 9,
    vwapPeriod: 20,
    atrPeriod: 14
  }}
  height={400}
  loading={false}
/>
\`\`\`

## WebSocket Components

### WebSocketConnectionStatus

**Description:**
Displays the current WebSocket connection status with detailed metrics.

**File Location:** `/components/websocket/connection-status.tsx`

**Props:**
None - uses internal state from the `unifiedWebSocketClient`

**Usage Example:**
\`\`\`jsx
<WebSocketConnectionStatus />
\`\`\`

### ConnectionStatusIndicator

**Description:**
Compact indicator for WebSocket connection status to be displayed in headers/navigation.

**File Location:** `/components/websocket/connection-status-indicator.tsx`

**Props:**
None - uses internal state from the `binanceWebSocketManager`

**Usage Example:**
\`\`\`jsx
<ConnectionStatusIndicator />
\`\`\`

## Trading Components

### ScalpingSignal

**Description:**
Displays trading signals based on the EMA + VWAP scalping strategy.

**File Location:** `/features/trading/components/scalping-signal.tsx`

**Props:**
- `klineData` (KlineData[]): Array of candlestick data
- `higherTimeframeData` (KlineData[], optional): Higher timeframe data for confirmation
- `isLoading` (boolean): Loading state flag

**Usage Example:**
\`\`\`jsx
<ScalpingSignal
  klineData={klineData}
  higherTimeframeData={higherTimeframeKlineData}
  isLoading={false}
/>
\`\`\`

### StrategyVisualization

**Description:**
Visualizes strategy signals and indicators on price charts.

**File Location:** `/features/trading/components/strategy-visualization.tsx`

**Props:**
- `klineData` (KlineData[]): Array of candlestick data
- `signals` (StrategySignal[]): Array of strategy signals
- `isLoading` (boolean): Loading state flag

**Usage Example:**
\`\`\`jsx
<StrategyVisualization
  klineData={klineData}
  signals={strategySignals}
  isLoading={false}
/>
\`\`\`

### TradingDashboard

**Description:**
Comprehensive dashboard for strategy monitoring and trade management.

**File Location:** `/features/trading/components/trading-dashboard.tsx`

**Props:**
- `symbol` (string): Trading pair symbol

**Usage Example:**
\`\`\`jsx
<TradingDashboard symbol="btcusdt" />
\`\`\`

## Monitoring Components

### MonitoringDashboard

**Description:**
Dashboard for monitoring WebSocket connection health and performance.

**File Location:** `/features/monitoring/components/monitoring-dashboard.tsx`

**Props:**
- `symbol` (string, optional): Trading pair symbol to monitor (defaults to "btcusdt")

**Usage Example:**
\`\`\`jsx
<MonitoringDashboard symbol="ethusdt" />
\`\`\`

### PerformanceMetrics

**Description:**
Displays real-time performance metrics for WebSocket connections.

**File Location:** `/features/monitoring/components/performance-metrics.tsx`

**Props:**
- `metrics` (WebSocketMetrics[]): Array of WebSocket performance metrics
- `isLoading` (boolean, optional): Loading state flag

**Usage Example:**
\`\`\`jsx
<PerformanceMetrics
  metrics={websocketMetrics}
  isLoading={false}
/>
\`\`\`

## Utility Components

### LoadingSpinner

**Description:**
Customizable loading spinner with different sizes.

**File Location:** `/components/ui/loading-spinner.tsx`

**Props:**
- `size` ("xs" | "sm" | "md" | "lg", optional): Size of the spinner (default: "md")
- `className` (string, optional): Additional CSS classes

**Usage Example:**
\`\`\`jsx
<LoadingSpinner size="sm" />
\`\`\`

### ResponsiveContainer

**Description:**
Container that adapts its layout based on screen size.

**File Location:** `/components/layout/responsive-container.tsx`

**Props:**
- `children` (React.ReactNode): Container content
- `className` (string, optional): Additional CSS classes

**Usage Example:**
\`\`\`jsx
<ResponsiveContainer>
  <div>Content goes here</div>
</ResponsiveContainer>
\`\`\`

### ResponsiveGrid

**Description:**
Grid layout that adapts columns based on screen size.

**File Location:** `/components/layout/responsive-grid.tsx`

**Props:**
- `children` (React.ReactNode): Grid items
- `cols` (object, optional): Column configuration for different breakpoints
  - `sm` (number): Small screens (default: 1)
  - `md` (number): Medium screens (default: 2)
  - `lg` (number): Large screens (default: 3)
  - `xl` (number): Extra large screens (default: 4)
- `className` (string, optional): Additional CSS classes

**Usage Example:**
\`\`\`jsx
<ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</ResponsiveGrid>
