/**
 * Performance monitoring utility for React components
 */

// Store for performance measurements
const performanceStore: Record<
  string,
  {
    renders: number
    totalTime: number
    lastRenderTime: number
    minTime: number
    maxTime: number
  }
> = {}

/**
 * Start timing a component render
 * @param componentName Name of the component to monitor
 * @returns Current timestamp
 */
export function startMeasure(componentName: string): number {
  if (!performanceStore[componentName]) {
    performanceStore[componentName] = {
      renders: 0,
      totalTime: 0,
      lastRenderTime: 0,
      minTime: Number.MAX_SAFE_INTEGER,
      maxTime: 0,
    }
  }

  return performance.now()
}

/**
 * End timing a component render and update metrics
 * @param componentName Name of the component being monitored
 * @param startTime Start timestamp from startMeasure
 */
export function endMeasure(componentName: string, startTime: number): void {
  const endTime = performance.now()
  const renderTime = endTime - startTime

  const metrics = performanceStore[componentName]
  metrics.renders++
  metrics.totalTime += renderTime
  metrics.lastRenderTime = renderTime
  metrics.minTime = Math.min(metrics.minTime, renderTime)
  metrics.maxTime = Math.max(metrics.maxTime, renderTime)

  // Log if render time is excessive (over 16ms which is ~60fps)
  if (renderTime > 16) {
    console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
  }
}

/**
 * Get performance metrics for a component
 * @param componentName Name of the component
 * @returns Performance metrics or null if component hasn't been measured
 */
export function getPerformanceMetrics(componentName: string) {
  const metrics = performanceStore[componentName]

  if (!metrics) {
    return null
  }

  return {
    ...metrics,
    averageTime: metrics.renders > 0 ? metrics.totalTime / metrics.renders : 0,
  }
}

/**
 * Get performance metrics for all monitored components
 * @returns Object with performance metrics for all components
 */
export function getAllPerformanceMetrics() {
  const result: Record<string, any> = {}

  for (const componentName in performanceStore) {
    const metrics = performanceStore[componentName]
    result[componentName] = {
      ...metrics,
      averageTime: metrics.renders > 0 ? metrics.totalTime / metrics.renders : 0,
    }
  }

  return result
}

/**
 * Reset performance metrics for a component
 * @param componentName Name of the component to reset
 */
export function resetPerformanceMetrics(componentName: string): void {
  if (performanceStore[componentName]) {
    performanceStore[componentName] = {
      renders: 0,
      totalTime: 0,
      lastRenderTime: 0,
      minTime: Number.MAX_SAFE_INTEGER,
      maxTime: 0,
    }
  }
}

/**
 * Reset all performance metrics
 */
export function resetAllPerformanceMetrics(): void {
  for (const componentName in performanceStore) {
    resetPerformanceMetrics(componentName)
  }
}
