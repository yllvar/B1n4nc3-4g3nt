# Binance API Documentation

This document provides details on the Binance API endpoints used in this application.

## Base URLs

- **WebSocket Base URL**: `wss://fstream.binance.com/ws`
- **REST API Base URL**: `https://fapi.binance.com`

## REST API Endpoints

### Market Data

#### Get Current Price

Fetches the current price for a trading pair.

\`\`\`
GET /fapi/v1/ticker/price
\`\`\`

**Parameters:**
- `symbol` (string) - Trading pair, e.g., "BTCUSDT"

**Response:**
\`\`\`json
{
  "symbol": "BTCUSDT",
  "price": "65432.10"
}
\`\`\`

#### Get Order Book

Fetches the order book for a trading pair.

\`\`\`
GET /fapi/v1/depth
\`\`\`

**Parameters:**
- `symbol` (string) - Trading pair, e.g., "BTCUSDT"
- `limit` (integer, optional) - Number of entries to return (default 100, max 1000)

**Response:**
\`\`\`json
{
  "lastUpdateId": 1234567890,
  "bids": [
    ["65432.10", "1.200"], // [price, quantity]
    ["65430.00", "5.600"]
  ],
  "asks": [
    ["65433.10", "0.700"],
    ["65435.00", "2.300"]
  ]
}
\`\`\`

#### Get Recent Trades

Fetches recent trades for a trading pair.

\`\`\`
GET /fapi/v1/trades
\`\`\`

**Parameters:**
- `symbol` (string) - Trading pair, e.g., "BTCUSDT"
- `limit` (integer, optional) - Number of entries to return (default 500, max 1000)

**Response:**
\`\`\`json
[
  {
    "id": 123456789,
    "price": "65432.10",
    "qty": "0.005",
    "time": 1639125535000,
    "isBuyerMaker": true
  },
  {
    "id": 123456790,
    "price": "65433.20",
    "qty": "0.010",
    "time": 1639125536000,
    "isBuyerMaker": false
  }
]
\`\`\`

#### Get Klines (Candlestick Data)

Fetches kline/candlestick data for a trading pair.

\`\`\`
GET /fapi/v1/klines
\`\`\`

**Parameters:**
- `symbol` (string) - Trading pair, e.g., "BTCUSDT"
- `interval` (string) - Candle interval, e.g., "1m", "15m", "1h", "1d"
- `limit` (integer, optional) - Number of candles to return (default 500, max 1000)

**Response:**
\`\`\`json
[
  [
    1639125600000, // Open time
    "65432.10",    // Open price
    "65456.70",    // High price
    "65412.30",    // Low price
    "65445.60",    // Close price
    "78.900",      // Volume
    1639125899999, // Close time
    "5156789.56",  // Quote asset volume
    123,           // Number of trades
    "45.123",      // Taker buy base asset volume
    "2950890.45",  // Taker buy quote asset volume
    "0"            // Unused field
  ],
  // Additional klines...
]
\`\`\`

#### Get 24hr Ticker Statistics

Fetches 24-hour price change statistics for a trading pair.

\`\`\`
GET /fapi/v1/ticker/24hr
\`\`\`

**Parameters:**
- `symbol` (string) - Trading pair, e.g., "BTCUSDT"

**Response:**
\`\`\`json
{
  "symbol": "BTCUSDT",
  "priceChange": "123.45",
  "priceChangePercent": "0.19",
  "weightedAvgPrice": "65345.67",
  "lastPrice": "65432.10",
  "lastQty": "0.123",
  "openPrice": "65308.65",
  "highPrice": "65789.10",
  "lowPrice": "64987.65",
  "volume": "12345.67",
  "quoteVolume": "807598760.12",
  "openTime": 1639039500000,
  "closeTime": 1639125900000,
  "firstId": 123456700,
  "lastId": 123456799,
  "count": 100
}
\`\`\`

### Server Time

#### Get Server Time

Fetches the current server time.

\`\`\`
GET /fapi/v1/time
\`\`\`

**Response:**
\`\`\`json
{
  "serverTime": 1639125600000
}
\`\`\`

## WebSocket Endpoints

WebSocket connections use the following format:
`wss://fstream.binance.com/ws/<stream_name>`

### Available Streams

#### Individual Symbol Ticker Stream

Pushes price updates for a specific symbol.

**Stream name:** `<symbol>@bookTicker`

**Example:** `btcusdt@bookTicker`

**Update frequency:** Real-time

**Data format:**
\`\`\`json
{
  "u": 1234567890,       // Order book update ID
  "s": "BTCUSDT",        // Symbol
  "b": "65432.10",       // Best bid price
  "B": "1.200",          // Best bid qty
  "a": "65433.20",       // Best ask price
  "A": "0.500"           // Best ask qty
}
\`\`\`

#### Aggregate Trade Stream

Pushes trade updates for a specific symbol.

**Stream name:** `<symbol>@aggTrade`

**Example:** `btcusdt@aggTrade`

**Update frequency:** Real-time

**Data format:**
\`\`\`json
{
  "e": "aggTrade",       // Event type
  "E": 1639125536789,    // Event time
  "s": "BTCUSDT",        // Symbol
  "a": 123456789,        // Aggregate trade ID
  "p": "65432.10",       // Price
  "q": "0.005",          // Quantity
  "f": 123456780,        // First trade ID
  "l": 123456789,        // Last trade ID
  "T": 1639125536500,    // Trade time
  "m": true,             // Is buyer maker?
  "M": true              // Ignore
}
\`\`\`

#### Kline/Candlestick Stream

Pushes candlestick updates for a specific symbol.

**Stream name:** `<symbol>@kline_<interval>`

**Example:** `btcusdt@kline_1m`

**Update frequency:** Real-time

**Data format:**
\`\`\`json
{
  "e": "kline",          // Event type
  "E": 1639125536789,    // Event time
  "s": "BTCUSDT",        // Symbol
  "k": {
    "t": 1639125600000,  // Kline start time
    "T": 1639125659999,  // Kline close time
    "s": "BTCUSDT",      // Symbol
    "i": "1m",           // Interval
    "f": 123456789,      // First trade ID
    "L": 123456799,      // Last trade ID
    "o": "65432.10",     // Open price
    "c": "65445.60",     // Close price
    "h": "65456.70",     // High price
    "l": "65412.30",     // Low price
    "v": "78.900",       // Base asset volume
    "n": 123,            // Number of trades
    "x": false,          // Is this kline closed?
    "q": "5156789.56",   // Quote asset volume
    "V": "45.123",       // Taker buy base asset volume
    "Q": "2950890.45",   // Taker buy quote asset volume
    "B": "0"             // Ignore
  }
}
\`\`\`

#### Mark Price Stream

Pushes mark price updates for a specific symbol.

**Stream name:** `<symbol>@markPrice` or `<symbol>@markPrice@1s`

**Example:** `btcusdt@markPrice`

**Update frequency:** 3s or 1s (if @1s is specified)

**Data format:**
\`\`\`json
{
  "e": "markPriceUpdate",    // Event type
  "E": 1639125538000,        // Event time
  "s": "BTCUSDT",            // Symbol
  "p": "65434.56",           // Mark price
  "i": "65434.33",           // Index price
  "P": "65435.01",           // Estimated settlement price
  "r": "0.00023",            // Funding rate
  "T": 1639152000000         // Next funding time
}
\`\`\`

#### Mini Ticker Stream

Pushes 24hr rolling window mini-ticker updates.

**Stream name:** `<symbol>@miniTicker`

**Example:** `btcusdt@miniTicker`

**Update frequency:** 1s

**Data format:**
\`\`\`json
{
  "e": "24hrMiniTicker",   // Event type
  "E": 1639125538000,      // Event time
  "s": "BTCUSDT",          // Symbol
  "c": "65432.10",         // Close price
  "o": "65308.65",         // Open price
  "h": "65789.10",         // High price
  "l": "64987.65",         // Low price
  "v": "12345.67",         // Volume
  "q": "807598760.12"      // Quote volume
}
\`\`\`

## Error Codes and Handling

### Common HTTP Status Codes

- **200 OK**: Request was successful
- **400 Bad Request**: Invalid parameters
- **401 Unauthorized**: API key missing or invalid
- **403 Forbidden**: No permission to access endpoint
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server issue

### WebSocket Error Handling

The WebSocket connection may disconnect for various reasons:

- Connection limit reached
- Network issues
- Server restart or maintenance
- Extended inactivity

Our application incorporates automatic reconnection with exponential backoff to handle these scenarios.

## Rate Limits

- REST API: 1200 requests per minute per IP
- WebSocket: 300 connections per IP

## Authentication

API key and secret are required for authenticated endpoints, which are stored as environment variables:
- `BINANCE_API_KEY`
- `BINANCE_API_SECRET`
\`\`\`

Next, let's create documentation for the key components in the system:
