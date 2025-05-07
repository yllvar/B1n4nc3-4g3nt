/**
 * Singleton Decorator
 *
 * This decorator provides an alternative way to implement the singleton pattern
 * using TypeScript decorators.
 *
 * @example
 * ```typescript
 * @Singleton
 * class MyService {
 *   public doSomething(): void {
 *     // Service implementation
 *   }
 * }
 *
 * // Usage
 * const service1 = MyService.getInstance();
 * const service2 = MyService.getInstance();
 * console.log(service1 === service2); // true
 * ```
 */

import { getMockSingleton, hasMockSingleton } from "./singleton-registry"

/**
 * Singleton decorator function
 * Adds getInstance method to the class and ensures only one instance exists
 */
export function Singleton<T extends new (...args: any[]) => any>(constructor: T) {
  // Store the original constructor
  const originalConstructor = constructor

  // Create a new constructor function
  const newConstructor: any = (...args: any[]) => {
    throw new Error(
      `Cannot instantiate Singleton class ${originalConstructor.name} directly. ` +
        `Use ${originalConstructor.name}.getInstance() instead.`,
    )
  }

  // Copy prototype
  newConstructor.prototype = originalConstructor.prototype

  // Add static getInstance method
  newConstructor.getInstance = () => {
    // Check for mock implementation first (for testing)
    const mockInstance = hasMockSingleton(originalConstructor.name)
      ? getMockSingleton<InstanceType<T>>(originalConstructor.name)
      : null

    if (mockInstance) {
      return mockInstance
    }

    // Use existing instance or create a new one
    if (!newConstructor._instance) {
      newConstructor._instance = new originalConstructor()
    }

    return newConstructor._instance
  }

  // Return the new constructor
  return newConstructor
}
