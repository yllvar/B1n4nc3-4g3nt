/**
 * Central error handling module
 * Re-exports all error handling utilities
 */

import { errorHandler } from "./error-handler"
import {
  AppError,
  ApiError,
  NetworkError,
  ValidationError,
  AuthError,
  ConfigError,
  DataError,
  StrategyError,
  OrderExecutionError,
} from "./error-types"
import { retry, retryFetch } from "./retry-mechanism"

// Simple network check that works in both browser and server environments
export const isNetworkOnline = () => {
  // In browser environment, use navigator.onLine
  if (typeof navigator !== "undefined" && navigator && typeof navigator.onLine === "boolean") {
    return navigator.onLine
  }
  // In server environment, assume online
  return true
}

export {
  errorHandler,
  AppError,
  ApiError,
  NetworkError,
  ValidationError,
  AuthError,
  ConfigError,
  DataError,
  StrategyError,
  OrderExecutionError,
  retry,
  retryFetch,
}
