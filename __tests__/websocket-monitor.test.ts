/**
 * WebSocket Monitor Tests
 *
 * These tests verify the functionality of the WebSocketMonitor
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WebSocketMonitor, webSocketMonitorRegistry } from "../lib/binance/websocket-monitor"

describe("WebSocketMonitor", () => {
  let monitor: WebSocketMonitor

  beforeEach(() => {
    vi.useFakeTimers()
    monitor = new WebSocketMonitor("test-stream")
  })

  afterEach(() => {
    monitor.dispose()
    vi.useRealTimers()
  })

  it("should initialize with default metrics", () => {
    const metrics = monitor.getMetrics()

    expect(metrics.connectionStatus).toBe("disconnected")
    expect(metrics.messageCount).toBe(0)
    expect(metrics.errorCount).toBe(0)
  })

  it("should update connection status", () => {
    monitor.setConnectionStatus("connected")

    const metrics = monitor.getMetrics()
    expect(metrics.connectionStatus).toBe("connected")
    expect(metrics.lastConnectedAt).not.toBeNull()
  })

  it("should record messages", () => {
    monitor.recordMessage(100) // 100 bytes

    const metrics = monitor.getMetrics()
    expect(metrics.messageCount).toBe(1)
    expect(metrics.averageMessageSize).toBe(100)
    expect(metrics.lastMessageReceivedAt).not.toBeNull()
  })

  it("should calculate message rate", () => {
    monitor.recordMessage(100)
    monitor.recordMessage(100)
    monitor.recordMessage(100)

    // Advance timer by 1 second to trigger message rate calculation
    vi.advanceTimersByTime(1000)

    const metrics = monitor.getMetrics()
    expect(metrics.messageRate).toBe(3)
  })

  it("should record ping latency", () => {
    monitor.recordPingLatency(50)

    const metrics = monitor.getMetrics()
    expect(metrics.pingLatency).toBe(50)
    expect(metrics.averageLatency).toBe(50)

    // Record another latency
    monitor.recordPingLatency(100)

    const updatedMetrics = monitor.getMetrics()
    expect(updatedMetrics.pingLatency).toBe(100)
    expect(updatedMetrics.averageLatency).toBe(75) // Average of 50 and 100
  })

  it("should record errors", () => {
    const error = new Error("Test error")
    monitor.recordError(error)

    const metrics = monitor.getMetrics()
    expect(metrics.errorCount).toBe(1)
    expect(metrics.lastError).toBe(error)
    expect(metrics.lastErrorAt).not.toBeNull()
  })

  it("should record data gaps and stale data", () => {
    monitor.recordDataGap()
    monitor.recordStaleData()

    const metrics = monitor.getMetrics()
    expect(metrics.dataGaps).toBe(1)
    expect(metrics.staleDataEvents).toBe(1)
  })

  it("should notify subscribers of updates", () => {
    const mockSubscriber = vi.fn()
    const unsubscribe = monitor.subscribe(mockSubscriber)

    // Should be called immediately with initial metrics
    expect(mockSubscriber).toHaveBeenCalledTimes(1)

    // Update metrics
    monitor.setConnectionStatus("connected")

    // Should be called again with updated metrics
    expect(mockSubscriber).toHaveBeenCalledTimes(2)

    // Unsubscribe
    unsubscribe()

    // Update metrics again
    monitor.recordMessage(100)

    // Should not be called again
    expect(mockSubscriber).toHaveBeenCalledTimes(2)
  })
})

describe("WebSocketMonitorRegistry", () => {
  beforeEach(() => {
    // Clear all monitors
    webSocketMonitorRegistry.getAllMonitors().forEach((monitor) => {
      webSocketMonitorRegistry.removeMonitor(monitor.getStreamName())
    })
  })

  it("should create and retrieve monitors", () => {
    const monitor = webSocketMonitorRegistry.getMonitor("test-stream")

    expect(monitor).toBeInstanceOf(WebSocketMonitor)
    expect(monitor.getStreamName()).toBe("test-stream")

    // Getting the same monitor should return the same instance
    const sameMonitor = webSocketMonitorRegistry.getMonitor("test-stream")
    expect(sameMonitor).toBe(monitor)
  })

  it("should get all monitors", () => {
    webSocketMonitorRegistry.getMonitor("stream1")
    webSocketMonitorRegistry.getMonitor("stream2")

    const monitors = webSocketMonitorRegistry.getAllMonitors()
    expect(monitors.length).toBe(2)
    expect(monitors[0].getStreamName()).toBe("stream1")
    expect(monitors[1].getStreamName()).toBe("stream2")
  })

  it("should remove monitors", () => {
    webSocketMonitorRegistry.getMonitor("stream-to-remove")

    webSocketMonitorRegistry.removeMonitor("stream-to-remove")

    const monitors = webSocketMonitorRegistry.getAllMonitors()
    expect(monitors.find((m) => m.getStreamName() === "stream-to-remove")).toBeUndefined()
  })
})
