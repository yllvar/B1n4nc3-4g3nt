# WebSocket Configuration Guide

This document explains the WebSocket configuration options available in the Binance Tracker application.

## Environment Variables

The WebSocket client can be configured using the following environment variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `WS_RECONNECT_INITIAL_DELAY` | Initial delay (in ms) before attempting to reconnect | 1000 |
| `WS_RECONNECT_MAX_DELAY` | Maximum delay (in ms) between reconnection attempts | 30000 |
| `WS_RECONNECT_FACTOR` | Exponential backoff factor for reconnection delays | 1.5 |
| `WS_RECONNECT_MAX_ATTEMPTS` | Maximum number of reconnection attempts before tripping the circuit breaker | 10 |
| `WS_HEARTBEAT_INTERVAL` | Interval (in ms) between heartbeat messages | 30000 |
| `WS_HEARTBEAT_TIMEOUT` | Timeout (in ms) to wait for a heartbeat response before considering it failed | 10000 |

## Configuration Recommendations

### Development Environment

For development, you might want to use more aggressive settings to quickly detect and recover from issues:

\`\`\`
WS_RECONNECT_INITIAL_DELAY=500
WS_RECONNECT_MAX_DELAY=5000
WS_RECONNECT_FACTOR=1.5
WS_RECONNECT_MAX_ATTEMPTS=5
WS_HEARTBEAT_INTERVAL=10000
WS_HEARTBEAT_TIMEOUT=5000
\`\`\`

### Production Environment

For production, use more conservative settings to avoid overwhelming the server:

\`\`\`
WS_RECONNECT_INITIAL_DELAY=1000
WS_RECONNECT_MAX_DELAY=60000
WS_RECONNECT_FACTOR=2
WS_RECONNECT_MAX_ATTEMPTS=10
WS_HEARTBEAT_INTERVAL=30000
WS_HEARTBEAT_TIMEOUT=10000
\`\`\`

## Circuit Breaker

The WebSocket client implements a circuit breaker pattern to prevent excessive reconnection attempts. When the maximum number of reconnection attempts is reached, the circuit breaker trips and blocks further connection attempts for 5 minutes.

You can manually reset the circuit breaker using the `resetCircuitBreaker()` method on the WebSocket connection manager.

## Heartbeat Mechanism

The heartbeat mechanism sends periodic ping messages to the server to verify that the connection is still alive. If a heartbeat response is not received within the specified timeout, the connection is considered failed and a reconnection is attempted.

For Binance WebSockets, the heartbeat uses the standard ping/pong mechanism.
