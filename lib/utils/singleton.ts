/**
 * Singleton Base Class
 *
 * This abstract class provides a consistent implementation of the singleton pattern
 * for services throughout the application. It ensures that only one instance of a
 * service exists and provides a global point of access to it.
 *
 * @example
 * ```typescript
 * class MyService extends Singleton<MyService> {
 *   private constructor() {
 *     super();
 *   }
 *
 *   public static getInstance(): MyService {
 *     return super.getInstance();
 *   }
 *
 *   public doSomething(): void {
 *     // Service implementation
 *   }
 * }
 *
 * // Usage
 * const service = MyService.getInstance();
 * service.doSomething();
 * ```
 *
 * @template T - The type of the singleton instance
 */
export abstract class Singleton<T> {
  /**
   * Map of singleton instances, keyed by class name
   * @private
   */
  private static instances = new Map<string, any>()

  /**
   * Protected constructor to prevent direct instantiation
   * Subclasses should also have protected or private constructors
   */
  protected constructor() {
    // Protected constructor to prevent direct instantiation
  }

  /**
   * Gets the singleton instance of the class
   * This method should be called by a static method in the subclass
   *
   * @returns The singleton instance of type T
   */
  protected static getInstance<T>(this: new () => T): T {
    const className = this.name

    if (!Singleton.instances.has(className)) {
      Singleton.instances.set(className, new this())
    }

    return Singleton.instances.get(className) as T
  }

  /**
   * Clears all singleton instances
   * Primarily used for testing purposes
   */
  public static clearAllInstances(): void {
    Singleton.instances.clear()
  }

  /**
   * Clears a specific singleton instance
   * Primarily used for testing purposes
   *
   * @param className - The name of the class to clear
   */
  public static clearInstance(className: string): void {
    Singleton.instances.delete(className)
  }
}
