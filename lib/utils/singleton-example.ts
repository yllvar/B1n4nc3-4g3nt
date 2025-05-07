/**
 * Example implementation of a singleton service using the Singleton base class
 * This file is for demonstration purposes only and can be removed in production
 */

import { Singleton } from "./singleton"

/**
 * Example service that follows the singleton pattern
 */
export class ExampleService extends Singleton<ExampleService> {
  /**
   * Private constructor to prevent direct instantiation
   * Always use ExampleService.getInstance() instead
   */
  private constructor() {
    super()
    console.log("ExampleService instance created")
  }

  /**
   * Gets the singleton instance of ExampleService
   * @returns The singleton instance
   */
  public static getInstance(): ExampleService {
    return super.getInstance()
  }

  /**
   * Example method
   * @returns A greeting message
   */
  public getGreeting(): string {
    return "Hello from ExampleService singleton!"
  }
}

/**
 * Example usage:
 *
 * const service1 = ExampleService.getInstance();
 * const service2 = ExampleService.getInstance();
 *
 * console.log(service1 === service2); // true
 * console.log(service1.getGreeting()); // "Hello from ExampleService singleton!"
 */
