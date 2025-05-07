/**
 * Example implementation of a singleton service using the Singleton decorator
 * This file is for demonstration purposes only and can be removed in production
 */

import { Singleton } from "./singleton-decorator"

/**
 * Example service that follows the singleton pattern using the decorator
 */
@Singleton
export class DecoratorExampleService {
  /**
   * Private constructor is not needed with the decorator approach
   * The decorator will prevent direct instantiation
   */
  constructor() {
    console.log("DecoratorExampleService instance created")
  }

  /**
   * The getInstance method is added by the decorator
   * TypeScript doesn't know about it, so we need to declare it
   */
  public static getInstance: () => DecoratorExampleService

  /**
   * Example method
   * @returns A greeting message
   */
  public getGreeting(): string {
    return "Hello from DecoratorExampleService singleton!"
  }
}

/**
 * Example usage:
 *
 * const service1 = DecoratorExampleService.getInstance();
 * const service2 = DecoratorExampleService.getInstance();
 *
 * console.log(service1 === service2); // true
 * console.log(service1.getGreeting()); // "Hello from DecoratorExampleService singleton!"
 */
