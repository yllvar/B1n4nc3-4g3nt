/**
 * Console Test Runner
 * A simple utility for running tests in the browser console
 */

type TestFunction = () => Promise<void> | void
type TestSuite = Record<string, TestFunction>

export interface TestResult {
  name: string
  passed: boolean
  error?: Error
  duration: number
}

export class ConsoleTestRunner {
  private suites: Record<string, TestSuite> = {}

  /**
   * Register a test suite
   */
  public registerSuite(suiteName: string, tests: TestSuite): void {
    this.suites[suiteName] = tests
  }

  /**
   * Run all registered test suites
   */
  public async runAll(): Promise<Record<string, TestResult[]>> {
    const results: Record<string, TestResult[]> = {}

    for (const [suiteName, suite] of Object.entries(this.suites)) {
      console.group(`Running test suite: ${suiteName}`)
      results[suiteName] = await this.runSuite(suite)
      console.groupEnd()
    }

    this.logSummary(results)
    return results
  }

  /**
   * Run a specific test suite
   */
  public async runSuite(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = []

    for (const [testName, testFn] of Object.entries(suite)) {
      const result = await this.runTest(testName, testFn)
      results.push(result)

      if (result.passed) {
        console.log(`✅ ${testName} (${result.duration}ms)`)
      } else {
        console.error(`❌ ${testName} (${result.duration}ms)`)
        if (result.error) {
          console.error(result.error)
        }
      }
    }

    return results
  }

  /**
   * Run a single test
   */
  private async runTest(name: string, testFn: TestFunction): Promise<TestResult> {
    const startTime = performance.now()
    let passed = false
    let error: Error | undefined

    try {
      await testFn()
      passed = true
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e))
    }

    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)

    return {
      name,
      passed,
      error,
      duration,
    }
  }

  /**
   * Log a summary of test results
   */
  private logSummary(results: Record<string, TestResult[]>): void {
    let totalTests = 0
    let passedTests = 0

    console.group("Test Summary")

    for (const [suiteName, suiteResults] of Object.entries(results)) {
      const suiteTotal = suiteResults.length
      const suitePassed = suiteResults.filter((r) => r.passed).length

      totalTests += suiteTotal
      passedTests += suitePassed

      console.log(`${suiteName}: ${suitePassed}/${suiteTotal} passed`)
    }

    const passPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

    console.log(`Overall: ${passedTests}/${totalTests} passed (${passPercentage}%)`)
    console.groupEnd()
  }
}

// Create and export a singleton instance
export const testRunner = new ConsoleTestRunner()

// Helper functions for assertions
export function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || "Assertion failed")
  }
}

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`)
  }
}

export function assertNotEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new Error(message || `Expected ${actual} to be different from ${expected}`)
  }
}

export function assertDeepEquals<T>(actual: T, expected: T, message?: string): void {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)

  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`)
  }
}

export function assertContains<T>(array: T[], item: T, message?: string): void {
  if (!array.includes(item)) {
    throw new Error(message || `Expected array to contain ${item}`)
  }
}

export function assertThrows(fn: () => any, errorType?: any, message?: string): void {
  try {
    fn()
    throw new Error(message || "Expected function to throw an error")
  } catch (error) {
    if (errorType && !(error instanceof errorType)) {
      throw new Error(message || `Expected error to be instance of ${errorType.name}`)
    }
  }
}

export async function assertRejects(fn: () => Promise<any>, errorType?: any, message?: string): Promise<void> {
  try {
    await fn()
    throw new Error(message || "Expected function to reject")
  } catch (error) {
    if (errorType && !(error instanceof errorType)) {
      throw new Error(message || `Expected error to be instance of ${errorType.name}`)
    }
  }
}
