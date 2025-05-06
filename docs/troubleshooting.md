# Troubleshooting Guide

This document provides guidance on troubleshooting common issues with the application, particularly around WebSocket connections and market data retrieval.

## WebSocket Connection Issues

### Connection Fails to Establish

**Symptoms:**
- WebSocket status remains in "connecting" state
- No data is displayed in the UI
- Connection status indicator shows red

**Possible Causes and Solutions:**

1. **Network Connectivity Issues**
   - Check your internet connection
   - Verify that outbound WebSocket connections are not blocked by firewall
   - Solution: Ensure stable internet connection and appropriate firewall settings

2. **API Endpoint Unavailability**
   - Binance API endpoints might be temporarily unavailable
   - Solution: Check [Binance API status page](https://www.binance.com/en/support) or try again later

3. **Rate Limiting**
   - Too many connection attempts may trigger rate limiting
   - Solution: Wait a few minutes before trying again

4. **Incorrect Environment Variables**
   - Missing or incorrect API URLs in environment variables
   - Solution: Check that `BINANCE_WS_BASE_URL` and `BINANCE_API_BASE_URL` are correctly set

### Frequent Disconnections

**Symptoms:**
- WebSocket status alternates between "connected" and "disconnecting"
- Data updates are inconsistent
- UI shows loading states frequently

**Possible Causes and Solutions:**

1. **Unstable Network Connection**
   - Intermittent internet connectivity issues
   - Solution: Use a more stable network connection

2. **Insufficient Heartbeat Responses**
   - Server not responding to heartbeat messages within timeout period
   - Solution: Increase heartbeat timeout in configuration

3. **Server-Side Issues**
   - Binance server might be experiencing high load
   - Solution: Application will automatically reconnect, or switch to fallback mode

4. **Client-Side Resource Limitations**
   - Browser tab might be throttled when in background
   - Solution: Keep the application tab active, or reduce number of subscribed streams

### REST API Fallback Not Working

**Symptoms:**
- WebSocket connection fails
- Fallback mode is indicated
- Still no data is displayed

**Possible Causes and Solutions:**

1. **API Key Issues**
   - Missing or invalid API keys
   - Solution: Check that `BINANCE_API_KEY` and `BINANCE_API_SECRET` are correctly set in environment variables

2. **Rate Limiting on REST API**
   - Too many requests to REST API
   - Solution: Reduce polling frequency or number of concurrent requests

3. **CORS Issues in Development**
   - Cross-Origin Resource Sharing blocking requests in development mode
   - Solution: Use appropriate CORS headers or a proxy in development environment

## Data Visualization Issues

### Charts Not Rendering

**Symptoms:**
- Chart containers are visible but no data is displayed
- Console errors related to chart rendering

**Possible Causes and Solutions:**

1. **Insufficient Data Points**
   - Not enough data received to render charts
   - Solution: Wait for more data to be collected, or check data fetching logic

2. **Data Format Issues**
   - Data not formatted correctly for chart components
   - Solution: Check that data transformation functions are working correctly

3. **Component Props Issues**
   - Chart components not receiving required props
   - Solution: Verify that all required props are passed to chart components

### Incorrect Price Display

**Symptoms:**
- Prices shown differ from other sources
- Price updates are delayed

**Possible Causes and Solutions:**

1. **WebSocket Stream Selection**
   - Using inappropriate stream for price data
   - Solution: Ensure you're subscribed to appropriate stream (e.g., bookTicker for latest prices)

2. **Data Processing Delays**
   - Excessive processing before displaying data
   - Solution: Optimize data processing functions, consider memoization

3. **Clock Synchronization**
   - Local system time significantly different from server time
   - Solution: Synchronize with server time or use relative time displays

## Performance Issues

### High CPU Usage

**Symptoms:**
- Browser or application becomes slow
- Fan speed increases on device
- Task manager shows high CPU usage

**Possible Causes and Solutions:**

1. **Too Many Active Subscriptions**
   - Subscribed to more WebSocket streams than necessary
   - Solution: Unsubscribe from unused streams when not needed

2. **Inefficient Rendering**
   - Components re-rendering too frequently
   - Solution: Use memoization, React.memo, useMemo, and useCallback to optimize rendering

3. **Excessive Data Processing**
   - Complex calculations occurring too frequently
   - Solution: Throttle or debounce data processing, move heavy calculations to web workers

### Memory Leaks

**Symptoms:**
- Application becomes slower over time
- Increasing memory usage reported in browser dev tools
- Browser tab eventually crashes

**Possible Causes and Solutions:**

1. **Uncleared Intervals or Timeouts**
   - Set intervals or timeouts not being cleared on component unmount
   - Solution: Clear all intervals and timeouts in useEffect cleanup functions

2. **Unmanaged WebSocket Subscriptions**
   - Not unsubscribing from WebSocket streams when components unmount
   - Solution: Always return unsubscribe functions in useEffect hooks

3. **Accumulating State Data**
   - State objects growing indefinitely (e.g., message history)
   - Solution: Implement limits on array lengths and object sizes in state

## Trading Strategy Issues

### Inaccurate Signals

**Symptoms:**
- Trading signals don't match expected strategy behavior
- False signals generated frequently

**Possible Causes and Solutions:**

1. **Incorrect Indicator Calculation**
   - Technical indicators not calculated correctly
   - Solution: Verify indicator calculations against standard formulas

2. **Insufficient Data History**
   - Not enough historical data for proper indicator calculation
   - Solution: Ensure sufficient historical data is loaded before generating signals

3. **Parameter Misconfiguration**
   - Strategy parameters not optimized for current market conditions
   - Solution: Review and adjust strategy parameters

### Backtesting Discrepancies

**Symptoms:**
- Backtesting results differ significantly from real-time signals
- Unexpected strategy behavior in live markets

**Possible Causes and Solutions:**

1. **Look-Ahead Bias in Backtesting**
   - Backtesting code accidentally using future data
   - Solution: Ensure backtesting only uses data available at each point in time

2. **Different Data Sources**
   - Backtest data source differs from live trading data source
   - Solution: Use the same data source for both backtesting and live analysis

3. **Slippage and Fees Not Accounted For**
   - Backtesting doesn't include realistic trading costs
   - Solution: Include estimated slippage and fees in backtest calculations

## Environment and Deployment Issues

### Environment Variable Problems

**Symptoms:**
- Application fails to start or connect to APIs
- Console errors about missing configuration

**Solutions:**

1. Check that all required environment variables are set in `.env.local` file
2. Verify that the format of environment variables matches expected format
3. Restart the development server after changing environment variables

### Deployment Failures

**Symptoms:**
- Build process fails
- Application deploys but doesn't function correctly

**Solutions:**

1. Check build logs for specific error messages
2. Ensure all environment variables are properly set in deployment platform
3. Verify that all required dependencies are installed
4. Check for platform-specific limitations (e.g., WebSocket support)

## Getting More Help

If you continue to experience issues after trying the solutions in this guide:

1. Check the GitHub repository issues section for similar problems and solutions
2. Review the console logs for more detailed error messages
3. File a new issue on GitHub with detailed reproduction steps
4. Contact the development team through the support channels listed in the README
\`\`\`

Let's create a final document for common WebSocket code examples:
