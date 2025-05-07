/**
 * Singleton Registry
 *
 * This utility provides methods for registering and retrieving singleton instances
 * for dependency injection and testing purposes.
 */

/**
 * Map of singleton mocks for testing
 */
const singletonMocks = new Map<string, any>()

/**
 * Registers a mock implementation of a singleton for testing
 *
 * @param className - The name of the singleton class
 * @param mockInstance - The mock instance to use
 */
export function registerMockSingleton<T>(className: string, mockInstance: T): void {
  singletonMocks.set(className, mockInstance)
}

/**
 * Clears all registered mock singletons
 */
export function clearAllMockSingletons(): void {
  singletonMocks.clear()
}

/**
 * Clears a specific mock singleton
 *
 * @param className - The name of the singleton class to clear
 */
export function clearMockSingleton(className: string): void {
  singletonMocks.delete(className)
}

/**
 * Gets a mock singleton if registered, otherwise returns null
 *
 * @param className - The name of the singleton class
 * @returns The mock instance or null if not registered
 */
export function getMockSingleton<T>(className: string): T | null {
  return singletonMocks.has(className) ? (singletonMocks.get(className) as T) : null
}

/**
 * Checks if a mock singleton is registered
 *
 * @param className - The name of the singleton class
 * @returns True if a mock is registered, false otherwise
 */
export function hasMockSingleton(className: string): boolean {
  return singletonMocks.has(className)
}
