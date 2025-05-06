# Binance Agent Codebase Index

## Overview
Next.js/React application with TypeScript focused on websocket connections, market data, and trading functionality.

## Component Catalog

### UI Components
- Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, etc. (see `components/ui/`)

### Market Components
- MarketStats, OrderBook, PriceDisplay, RecentTrades

### WebSocket Components
- ConnectionStatus, ConnectionStatusIndicator, WebSocketDebug

### Error Handling
- ErrorBoundary, ErrorDisplay, ErrorLoggerInit, ErrorMessage

### Diagnostics
- WebSocketDiagnosticsDashboard, WebSocketEventLog, WebSocketHeartbeatMonitor

## Hooks Reference

### Data Hooks
- useBinanceMarketData
- useMarketData
- useEnhancedMarketData
- useUnifiedMarketData

### Utility Hooks
- useAsyncOperation
- useDataCache
- useErrorHandling
- useTechnicalAnalysis

## Page Structure

### Core Pages
- RootLayout (app/layout.tsx)
- Home (app/page.tsx)

### Feature Areas
- Dashboard
- Debug (Environment, Error Handling, WebSocket)
- Diagnostics
- Monitoring
- Testing
- Trading

## Utility Functions (lib/)

### Error Handling
- ErrorHandlingService
- handleApiError, handleWebSocketError
- Custom error types (AppError, ApiError, etc.)

### Environment
- validateEnvironment
- validateApiCredentials

### Utilities
- retry mechanism
- formatting functions
- class name utilities
