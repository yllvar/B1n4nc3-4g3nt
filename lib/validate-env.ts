import { validateEnvironmentOrThrow } from "./env"

/**
 * Validates the environment variables at application startup
 * This function should be called early in the application lifecycle
 */
export function validateAppEnvironment(): void {
  try {
    validateEnvironmentOrThrow()
    console.log("✅ Environment validation successful")
  } catch (error) {
    console.error("❌ Environment validation failed:", error)
    // In production, you might want to exit the process or show an error page
    if (process.env.NODE_ENV === "production") {
      // For Next.js, we can't exit the process, but we can log the error
      console.error("Application may not function correctly due to environment configuration issues")
    }
  }
}

export function validateTogetherApiKey(): boolean {
  const apiKey = process.env.TOGETHER_API_KEY
  if (!apiKey) {
    console.warn("TOGETHER_API_KEY is not set. LLM-enhanced analysis will be disabled.")
    return false
  }
  return true
}
