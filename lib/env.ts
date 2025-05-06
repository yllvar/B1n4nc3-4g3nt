/**
 * Environment variable utilities
 * Provides validation and access to environment variables
 */

// Define the structure of our environment variables
interface EnvironmentVariables {
  // Binance API
  BINANCE_API_KEY: string
  BINANCE_API_SECRET: string
  BINANCE_API_BASE_URL: string
  BINANCE_WS_BASE_URL: string

  // WebSocket Configuration
  WS_RECONNECT_INITIAL_DELAY: number
  WS_RECONNECT_MAX_DELAY: number
  WS_RECONNECT_FACTOR: number
  WS_RECONNECT_MAX_ATTEMPTS: number
  WS_HEARTBEAT_INTERVAL: number
  WS_HEARTBEAT_TIMEOUT: number

  // Application settings
  NODE_ENV: string

  // Together AI API
  TOGETHER_API_KEY: string
}

// Define validation rules for each environment variable
interface ValidationRules {
  required: boolean
  validator?: (value: string) => boolean
  message?: string
}

// Define the validation rules for each environment variable
const validationRules: Record<keyof EnvironmentVariables, ValidationRules> = {
  BINANCE_API_KEY: {
    required: true,
    validator: (value) => value.length >= 10,
    message: "BINANCE_API_KEY must be at least 10 characters long",
  },
  BINANCE_API_SECRET: {
    required: true,
    validator: (value) => value.length >= 10,
    message: "BINANCE_API_SECRET must be at least 10 characters long",
  },
  BINANCE_API_BASE_URL: {
    required: true,
    validator: (value) => value.startsWith("http"),
    message: "BINANCE_API_BASE_URL must be a valid URL starting with http or https",
  },
  BINANCE_WS_BASE_URL: {
    required: true,
    validator: (value) => value.startsWith("ws"),
    message: "BINANCE_WS_BASE_URL must be a valid WebSocket URL starting with ws or wss",
  },
  WS_RECONNECT_INITIAL_DELAY: {
    required: false,
  },
  WS_RECONNECT_MAX_DELAY: {
    required: false,
  },
  WS_RECONNECT_FACTOR: {
    required: false,
  },
  WS_RECONNECT_MAX_ATTEMPTS: {
    required: false,
  },
  WS_HEARTBEAT_INTERVAL: {
    required: false,
  },
  WS_HEARTBEAT_TIMEOUT: {
    required: false,
  },
  NODE_ENV: {
    required: false,
  },
  TOGETHER_API_KEY: {
    required: false,
  },
}

// Create the environment object with default values
export const env: EnvironmentVariables = {
  BINANCE_API_KEY: process.env.BINANCE_API_KEY || "",
  BINANCE_API_SECRET: process.env.BINANCE_API_SECRET || "",
  BINANCE_API_BASE_URL: process.env.BINANCE_API_BASE_URL || "https://fapi.binance.com",
  BINANCE_WS_BASE_URL: process.env.BINANCE_WS_BASE_URL || "wss://fstream.binance.com",

  // WebSocket configuration with sensible defaults
  WS_RECONNECT_INITIAL_DELAY: Number.parseInt(process.env.WS_RECONNECT_INITIAL_DELAY || "1000", 10),
  WS_RECONNECT_MAX_DELAY: Number.parseInt(process.env.WS_RECONNECT_MAX_DELAY || "30000", 10),
  WS_RECONNECT_FACTOR: Number.parseFloat(process.env.WS_RECONNECT_FACTOR || "1.5"),
  WS_RECONNECT_MAX_ATTEMPTS: Number.parseInt(process.env.WS_RECONNECT_MAX_ATTEMPTS || "10", 10),
  WS_HEARTBEAT_INTERVAL: Number.parseInt(process.env.WS_HEARTBEAT_INTERVAL || "30000", 10),
  WS_HEARTBEAT_TIMEOUT: Number.parseInt(process.env.WS_HEARTBEAT_TIMEOUT || "10000", 10),

  NODE_ENV: process.env.NODE_ENV || "development",
  TOGETHER_API_KEY: process.env.TOGETHER_API_KEY || "",
}

// Add helper methods
export const isDevelopment = () => env.NODE_ENV === "development"
export const isProduction = () => env.NODE_ENV === "production"
export const isTest = () => env.NODE_ENV === "test"

/**
 * Validates all environment variables according to the defined rules
 * @returns An object containing validation status and any error messages
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check each environment variable against its validation rules
  ;(Object.keys(validationRules) as Array<keyof EnvironmentVariables>).forEach((key) => {
    const rules = validationRules[key]
    const value = env[key]

    // Check if required variables are present
    if (rules.required && (!value || value.toString().trim() === "")) {
      errors.push(`Missing required environment variable: ${key}`)
      return
    }

    // Skip validation if value is empty and not required
    if (!value || value.toString().trim() === "") {
      return
    }

    // Apply custom validator if defined
    if (rules.validator && typeof value === "string" && !rules.validator(value)) {
      errors.push(rules.message || `Invalid value for environment variable: ${key}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates the environment and throws an error if validation fails
 * Use this at application startup to fail fast if environment is not properly configured
 */
export function validateEnvironmentOrThrow(): void {
  const { isValid, errors } = validateEnvironment()

  if (!isValid) {
    const errorMessage = `Environment validation failed:\n${errors.join("\n")}`
    console.error(errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Validates specifically the Binance API credentials
 * @returns True if API credentials are valid, false otherwise
 */
export function validateApiCredentials(): boolean {
  if (!env.BINANCE_API_KEY || !env.BINANCE_API_SECRET) {
    console.warn("Binance API credentials are not set. Some features may not work correctly.")
    return false
  }
  return true
}
