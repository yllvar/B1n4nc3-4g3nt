/**
 * Together AI Service
 * Provides integration with Together.ai's LLM API for trading signal analysis
 */
import Together from "together-ai"
import { env } from "../env"

// Initialize Together client
const together = new Together({
  apiKey: env.TOGETHER_API_KEY || "",
})

export interface LLMAnalysisRequest {
  symbol: string
  timeframe: string
  currentPrice: number
  technicalSignal: string // "BUY", "SELL", "NEUTRAL", etc.
  signalStrength: number // 0-100
  indicators: Record<string, number | string>
  recentPriceAction: {
    percentChange24h: number
    percentChange1h: number
    volumeChange24h: number
  }
  marketContext?: {
    btcCorrelation?: number | null
    marketSentiment?: string | null
    volatilityRank?: number | null
  }
}

export interface LLMAnalysisResponse {
  enhancedSignal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL"
  confidence: number // 0-100
  reasoning: string
  keyFactors: string[]
  riskAssessment: string
  tradingRecommendation: string
  timeHorizon: string
}

/**
 * Service for interacting with Together.ai's LLM API
 * Uses the Singleton pattern to ensure only one instance exists
 */
export class TogetherAIService {
  private static instance: TogetherAIService
  private isInitialized = false

  private constructor() {
    this.isInitialized = !!env.TOGETHER_API_KEY
    if (!this.isInitialized) {
      console.warn("Together AI Service not initialized: Missing API key")
    }
  }

  /**
   * Get the singleton instance of the service
   */
  public static getInstance(): TogetherAIService {
    if (!TogetherAIService.instance) {
      TogetherAIService.instance = new TogetherAIService()
    }
    return TogetherAIService.instance
  }

  /**
   * Analyze trading signal with LLM reasoning
   * @param request The analysis request containing market data and technical signals
   * @returns Enhanced analysis with LLM reasoning or null if service is not initialized
   */
  public async analyzeSignal(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse | null> {
    if (!this.isInitialized) {
      console.warn("Together AI Service not initialized: Missing API key")
      return null
    }

    try {
      const prompt = this.constructPrompt(request)

      const response = await together.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "deepseek-ai/DeepSeek-V3",
        temperature: 0.2, // Lower temperature for more consistent analysis
        max_tokens: 1000,
        response_format: { type: "json_object" }, // Request JSON response
      })

      const content = response.choices[0].message.content
      return this.parseResponse(content)
    } catch (error) {
      console.error("Error calling Together AI:", error)
      return null
    }
  }

  /**
   * Construct prompt for the LLM
   * @param request The analysis request
   * @returns A formatted prompt string
   */
  private constructPrompt(request: LLMAnalysisRequest): string {
    return `
You are an expert cryptocurrency trading analyst with deep knowledge of technical analysis, market psychology, and trading strategies.

Analyze the following trading signal and provide enhanced reasoning:

MARKET DATA:
- Symbol: ${request.symbol}
- Timeframe: ${request.timeframe}
- Current Price: ${request.currentPrice}
- Technical Signal: ${request.technicalSignal}
- Signal Strength: ${request.signalStrength}/100
- 24h Price Change: ${request.recentPriceAction.percentChange24h.toFixed(2)}%
- 1h Price Change: ${request.recentPriceAction.percentChange1h.toFixed(2)}%
- 24h Volume Change: ${request.recentPriceAction.volumeChange24h.toFixed(2)}%

TECHNICAL INDICATORS:
${Object.entries(request.indicators)
  .map(([key, value]) => `- ${key}: ${typeof value === "number" ? value.toFixed(4) : value}`)
  .join("\n")}

${
  request.marketContext
    ? `
MARKET CONTEXT:
${request.marketContext.btcCorrelation !== null ? `- BTC Correlation: ${request.marketContext.btcCorrelation?.toFixed(2)}` : ""}
${request.marketContext.marketSentiment ? `- Market Sentiment: ${request.marketContext.marketSentiment}` : ""}
${request.marketContext.volatilityRank !== null ? `- Volatility Rank: ${request.marketContext.volatilityRank?.toFixed(2)}` : ""}
`
    : ""
}

Based on this data, provide:
1. An enhanced signal (STRONG_BUY, BUY, NEUTRAL, SELL, or STRONG_SELL)
2. A confidence score (0-100)
3. Detailed reasoning for your analysis
4. Key factors influencing your decision (list 3-5 factors)
5. Risk assessment
6. Trading recommendation
7. Suggested time horizon for the trade

Format your response as JSON:
{
  "enhancedSignal": "SIGNAL",
  "confidence": NUMBER,
  "reasoning": "DETAILED_REASONING",
  "keyFactors": ["FACTOR_1", "FACTOR_2", "FACTOR_3"],
  "riskAssessment": "RISK_ASSESSMENT",
  "tradingRecommendation": "RECOMMENDATION",
  "timeHorizon": "TIME_HORIZON"
}
`
  }

  /**
   * Parse LLM response into structured format
   * @param content The raw response content from the LLM
   * @returns Structured analysis response
   */
  private parseResponse(content: string): LLMAnalysisResponse {
    try {
      // Extract JSON from response (in case there's additional text)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }

      const jsonStr = jsonMatch[0]
      const parsed = JSON.parse(jsonStr) as LLMAnalysisResponse

      // Validate required fields
      if (!parsed.enhancedSignal || typeof parsed.confidence !== "number") {
        throw new Error("Invalid response format")
      }

      return {
        enhancedSignal: parsed.enhancedSignal,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || "No reasoning provided",
        keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : ["No key factors provided"],
        riskAssessment: parsed.riskAssessment || "No risk assessment provided",
        tradingRecommendation: parsed.tradingRecommendation || "No trading recommendation provided",
        timeHorizon: parsed.timeHorizon || "No time horizon provided",
      }
    } catch (error) {
      console.error("Error parsing LLM response:", error, content)

      // Fallback response
      return {
        enhancedSignal: "NEUTRAL",
        confidence: 50,
        reasoning: "Unable to parse LLM response. Using neutral signal as fallback.",
        keyFactors: ["Error in LLM response parsing"],
        riskAssessment: "Unable to assess risk due to parsing error",
        tradingRecommendation: "Consider manual analysis before trading",
        timeHorizon: "Unknown",
      }
    }
  }
}

export const togetherAIService = TogetherAIService.getInstance()
