/**
 * Performance Analytics
 * Tracks and analyzes trading performance metrics
 */
import { errorHandler } from "../error-handling"

export interface Trade {
  id: string
  symbol: string
  side: "BUY" | "SELL"
  entryPrice: number
  exitPrice: number | null
  quantity: number
  entryTime: number
  exitTime: number | null
  pnl: number | null
  pnlPercent: number | null
  fees: number
  stopLoss: number | null
  takeProfit: number | null
  strategy: string
  timeframe: string
  notes: string
  tags: string[]
}

export interface PerformanceSummary {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  winRate: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  averageHoldingTime: number
  netProfit: number
  grossProfit: number
  grossLoss: number
  totalFees: number
  sharpeRatio: number | null
  sortinoRatio: number | null
  maxDrawdown: number
  maxDrawdownPercent: number
  expectancy: number
  averageRRR: number
  profitPerDay: number
  tradesPerDay: number
}

export interface EquityPoint {
  timestamp: number
  equity: number
  drawdown: number
  drawdownPercent: number
}

export interface PerformanceByTimeframe {
  timeframe: string
  trades: number
  winRate: number
  profitFactor: number
  netProfit: number
}

export interface PerformanceBySymbol {
  symbol: string
  trades: number
  winRate: number
  profitFactor: number
  netProfit: number
}

export interface PerformanceByStrategy {
  strategy: string
  trades: number
  winRate: number
  profitFactor: number
  netProfit: number
}

export class PerformanceAnalytics {
  private static instance: PerformanceAnalytics
  private trades: Trade[] = []
  private equityCurve: EquityPoint[] = []
  private initialEquity = 10000
  private currentEquity = 10000
  private highWaterMark = 10000
  private startDate: number = Date.now()

  private constructor() {
    // Initialize with a starting point in the equity curve
    this.equityCurve.push({
      timestamp: Date.now(),
      equity: this.initialEquity,
      drawdown: 0,
      drawdownPercent: 0,
    })
  }

  public static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics()
    }
    return PerformanceAnalytics.instance
  }

  /**
   * Set initial equity
   */
  public setInitialEquity(equity: number): void {
    this.initialEquity = equity
    this.currentEquity = equity
    this.highWaterMark = equity
    this.startDate = Date.now()

    // Reset equity curve
    this.equityCurve = [
      {
        timestamp: Date.now(),
        equity,
        drawdown: 0,
        drawdownPercent: 0,
      },
    ]
  }

  /**
   * Record a new trade
   */
  public recordTrade(trade: Omit<Trade, "id">): string {
    try {
      // Generate a unique ID
      const id = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // Create the full trade object
      const fullTrade: Trade = {
        ...trade,
        id,
      }

      // Add to trades array
      this.trades.push(fullTrade)

      // Update equity if the trade is closed
      if (fullTrade.exitPrice !== null && fullTrade.pnl !== null) {
        this.updateEquity(fullTrade.exitTime || Date.now(), fullTrade.pnl)
      }

      return id
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "recordTrade", trade },
        severity: "medium",
      })

      return ""
    }
  }

  /**
   * Update a trade
   */
  public updateTrade(id: string, updates: Partial<Trade>): boolean {
    try {
      const index = this.trades.findIndex((t) => t.id === id)

      if (index === -1) {
        return false
      }

      const oldTrade = this.trades[index]
      const updatedTrade = { ...oldTrade, ...updates }

      // If the trade was previously open and is now closed, update equity
      if (oldTrade.exitPrice === null && updatedTrade.exitPrice !== null && updatedTrade.pnl !== null) {
        this.updateEquity(updatedTrade.exitTime || Date.now(), updatedTrade.pnl)
      }

      // Update the trade
      this.trades[index] = updatedTrade

      return true
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "updateTrade", id, updates },
        severity: "medium",
      })

      return false
    }
  }

  /**
   * Get a trade by ID
   */
  public getTrade(id: string): Trade | null {
    return this.trades.find((t) => t.id === id) || null
  }

  /**
   * Get all trades
   */
  public getAllTrades(): Trade[] {
    return [...this.trades]
  }

  /**
   * Get open trades
   */
  public getOpenTrades(): Trade[] {
    return this.trades.filter((t) => t.exitPrice === null)
  }

  /**
   * Get closed trades
   */
  public getClosedTrades(): Trade[] {
    return this.trades.filter((t) => t.exitPrice !== null)
  }

  /**
   * Update equity curve
   */
  private updateEquity(timestamp: number, pnl: number): void {
    // Update current equity
    this.currentEquity += pnl

    // Update high water mark if needed
    if (this.currentEquity > this.highWaterMark) {
      this.highWaterMark = this.currentEquity
    }

    // Calculate drawdown
    const drawdown = this.highWaterMark - this.currentEquity
    const drawdownPercent = drawdown / this.highWaterMark

    // Add to equity curve
    this.equityCurve.push({
      timestamp,
      equity: this.currentEquity,
      drawdown,
      drawdownPercent,
    })
  }

  /**
   * Get equity curve
   */
  public getEquityCurve(): EquityPoint[] {
    return [...this.equityCurve]
  }

  /**
   * Calculate performance summary
   */
  public getPerformanceSummary(): PerformanceSummary {
    try {
      const closedTrades = this.getClosedTrades()

      if (closedTrades.length === 0) {
        return this.getEmptyPerformanceSummary()
      }

      // Basic counts
      const totalTrades = closedTrades.length
      const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0).length
      const losingTrades = closedTrades.filter((t) => (t.pnl || 0) < 0).length
      const breakEvenTrades = closedTrades.filter((t) => (t.pnl || 0) === 0).length

      // Win rate
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0

      // Profit and loss
      const grossProfit = closedTrades.reduce((sum, trade) => sum + Math.max(0, trade.pnl || 0), 0)
      const grossLoss = Math.abs(closedTrades.reduce((sum, trade) => sum + Math.min(0, trade.pnl || 0), 0))
      const netProfit = grossProfit - grossLoss

      // Profit factor
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0

      // Average win and loss
      const averageWin =
        winningTrades > 0
          ? closedTrades.filter((t) => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades
          : 0

      const averageLoss =
        losingTrades > 0
          ? Math.abs(closedTrades.filter((t) => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0)) /
            losingTrades
          : 0

      // Largest win and loss
      const largestWin = closedTrades.reduce((max, trade) => Math.max(max, trade.pnl || 0), 0)
      const largestLoss = Math.abs(closedTrades.reduce((min, trade) => Math.min(min, trade.pnl || 0), 0))

      // Average holding time
      const holdingTimes = closedTrades
        .filter((t) => t.exitTime && t.entryTime)
        .map((t) => (t.exitTime as number) - t.entryTime)

      const averageHoldingTime =
        holdingTimes.length > 0 ? holdingTimes.reduce((sum, time) => sum + time, 0) / holdingTimes.length : 0

      // Total fees
      const totalFees = closedTrades.reduce((sum, trade) => sum + (trade.fees || 0), 0)

      // Calculate max drawdown
      const maxDrawdown = Math.max(...this.equityCurve.map((p) => p.drawdown))
      const maxDrawdownPercent = Math.max(...this.equityCurve.map((p) => p.drawdownPercent))

      // Calculate Sharpe and Sortino ratios
      const dailyReturns = this.calculateDailyReturns()
      const sharpeRatio = this.calculateSharpeRatio(dailyReturns)
      const sortinoRatio = this.calculateSortinoRatio(dailyReturns)

      // Calculate expectancy
      const expectancy = winRate * averageWin - (1 - winRate) * averageLoss

      // Calculate average risk-reward ratio
      const tradesWithStops = closedTrades.filter((t) => t.stopLoss !== null && t.entryPrice !== null)
      let averageRRR = 0

      if (tradesWithStops.length > 0) {
        const rrrValues = tradesWithStops.map((t) => {
          const entryPrice = t.entryPrice as number
          const stopLoss = t.stopLoss as number
          const risk = Math.abs(entryPrice - stopLoss)

          if (t.exitPrice !== null && risk > 0) {
            const reward = Math.abs(t.exitPrice - entryPrice)
            return reward / risk
          }
          return 0
        })

        averageRRR = rrrValues.reduce((sum, rrr) => sum + rrr, 0) / tradesWithStops.length
      }

      // Calculate trades per day and profit per day
      const tradingDays = Math.max(1, (Date.now() - this.startDate) / (1000 * 60 * 60 * 24))
      const tradesPerDay = totalTrades / tradingDays
      const profitPerDay = netProfit / tradingDays

      return {
        totalTrades,
        winningTrades,
        losingTrades,
        breakEvenTrades,
        winRate,
        profitFactor,
        averageWin,
        averageLoss,
        largestWin,
        largestLoss,
        averageHoldingTime,
        netProfit,
        grossProfit,
        grossLoss,
        totalFees,
        sharpeRatio,
        sortinoRatio,
        maxDrawdown,
        maxDrawdownPercent,
        expectancy,
        averageRRR,
        profitPerDay,
        tradesPerDay,
      }
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "getPerformanceSummary" },
        severity: "medium",
      })

      return this.getEmptyPerformanceSummary()
    }
  }

  /**
   * Get empty performance summary
   */
  private getEmptyPerformanceSummary(): PerformanceSummary {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageHoldingTime: 0,
      netProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      totalFees: 0,
      sharpeRatio: null,
      sortinoRatio: null,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      expectancy: 0,
      averageRRR: 0,
      profitPerDay: 0,
      tradesPerDay: 0,
    }
  }

  /**
   * Calculate daily returns
   */
  private calculateDailyReturns(): number[] {
    if (this.equityCurve.length < 2) {
      return []
    }

    // Group equity points by day
    const dailyEquity: Map<string, number> = new Map()

    this.equityCurve.forEach((point) => {
      const date = new Date(point.timestamp).toISOString().split("T")[0]
      dailyEquity.set(date, point.equity)
    })

    // Convert to array and sort by date
    const sortedDailyEquity = Array.from(dailyEquity.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    // Calculate daily returns
    const dailyReturns: number[] = []

    for (let i = 1; i < sortedDailyEquity.length; i++) {
      const previousEquity = sortedDailyEquity[i - 1][1]
      const currentEquity = sortedDailyEquity[i][1]

      const dailyReturn = (currentEquity - previousEquity) / previousEquity
      dailyReturns.push(dailyReturn)
    }

    return dailyReturns
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(dailyReturns: number[]): number | null {
    if (dailyReturns.length < 30) {
      return null // Not enough data
    }

    // Calculate average daily return
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length

    // Calculate standard deviation of returns
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length
    const stdDev = Math.sqrt(variance)

    // Assume risk-free rate of 0 for simplicity
    const riskFreeRate = 0

    // Calculate annualized Sharpe ratio
    // Assuming 252 trading days in a year
    return stdDev > 0 ? ((avgReturn - riskFreeRate) / stdDev) * Math.sqrt(252) : null
  }

  /**
   * Calculate Sortino ratio
   */
  private calculateSortinoRatio(dailyReturns: number[]): number | null {
    if (dailyReturns.length < 30) {
      return null // Not enough data
    }

    // Calculate average daily return
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length

    // Calculate downside deviation (only negative returns)
    const negativeReturns = dailyReturns.filter((ret) => ret < 0)

    if (negativeReturns.length === 0) {
      return null // No negative returns
    }

    const downsideVariance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length

    const downsideDeviation = Math.sqrt(downsideVariance)

    // Assume risk-free rate of 0 for simplicity
    const riskFreeRate = 0

    // Calculate annualized Sortino ratio
    // Assuming 252 trading days in a year
    return downsideDeviation > 0 ? ((avgReturn - riskFreeRate) / downsideDeviation) * Math.sqrt(252) : null
  }

  /**
   * Get performance breakdown by timeframe
   */
  public getPerformanceByTimeframe(): PerformanceByTimeframe[] {
    const closedTrades = this.getClosedTrades()
    const timeframes = new Set(closedTrades.map((t) => t.timeframe))

    return Array.from(timeframes).map((timeframe) => {
      const timeframeTrades = closedTrades.filter((t) => t.timeframe === timeframe)
      const totalTrades = timeframeTrades.length
      const winningTrades = timeframeTrades.filter((t) => (t.pnl || 0) > 0).length
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0

      const grossProfit = timeframeTrades.reduce((sum, trade) => sum + Math.max(0, trade.pnl || 0), 0)
      const grossLoss = Math.abs(timeframeTrades.reduce((sum, trade) => sum + Math.min(0, trade.pnl || 0), 0))
      const netProfit = grossProfit - grossLoss
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0

      return {
        timeframe,
        trades: totalTrades,
        winRate,
        profitFactor,
        netProfit,
      }
    })
  }

  /**
   * Get performance breakdown by symbol
   */
  public getPerformanceBySymbol(): PerformanceBySymbol[] {
    const closedTrades = this.getClosedTrades()
    const symbols = new Set(closedTrades.map((t) => t.symbol))

    return Array.from(symbols).map((symbol) => {
      const symbolTrades = closedTrades.filter((t) => t.symbol === symbol)
      const totalTrades = symbolTrades.length
      const winningTrades = symbolTrades.filter((t) => (t.pnl || 0) > 0).length
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0

      const grossProfit = symbolTrades.reduce((sum, trade) => sum + Math.max(0, trade.pnl || 0), 0)
      const grossLoss = Math.abs(symbolTrades.reduce((sum, trade) => sum + Math.min(0, trade.pnl || 0), 0))
      const netProfit = grossProfit - grossLoss
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0

      return {
        symbol,
        trades: totalTrades,
        winRate,
        profitFactor,
        netProfit,
      }
    })
  }

  /**
   * Get performance breakdown by strategy
   */
  public getPerformanceByStrategy(): PerformanceByStrategy[] {
    const closedTrades = this.getClosedTrades()
    const strategies = new Set(closedTrades.map((t) => t.strategy))

    return Array.from(strategies).map((strategy) => {
      const strategyTrades = closedTrades.filter((t) => t.strategy === strategy)
      const totalTrades = strategyTrades.length
      const winningTrades = strategyTrades.filter((t) => (t.pnl || 0) > 0).length
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0

      const grossProfit = strategyTrades.reduce((sum, trade) => sum + Math.max(0, trade.pnl || 0), 0)
      const grossLoss = Math.abs(strategyTrades.reduce((sum, trade) => sum + Math.min(0, trade.pnl || 0), 0))
      const netProfit = grossProfit - grossLoss
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0

      return {
        strategy,
        trades: totalTrades,
        winRate,
        profitFactor,
        netProfit,
      }
    })
  }

  /**
   * Export performance data to JSON
   */
  public exportToJson(): string {
    try {
      const data = {
        trades: this.trades,
        equityCurve: this.equityCurve,
        initialEquity: this.initialEquity,
        currentEquity: this.currentEquity,
        highWaterMark: this.highWaterMark,
        startDate: this.startDate,
        summary: this.getPerformanceSummary(),
        byTimeframe: this.getPerformanceByTimeframe(),
        bySymbol: this.getPerformanceBySymbol(),
        byStrategy: this.getPerformanceByStrategy(),
      }

      return JSON.stringify(data, null, 2)
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "exportToJson" },
        severity: "low",
      })

      return JSON.stringify({ error: "Failed to export performance data" })
    }
  }

  /**
   * Import performance data from JSON
   */
  public importFromJson(json: string): boolean {
    try {
      const data = JSON.parse(json)

      if (!data.trades || !data.equityCurve || !data.initialEquity) {
        throw new Error("Invalid performance data format")
      }

      this.trades = data.trades
      this.equityCurve = data.equityCurve
      this.initialEquity = data.initialEquity
      this.currentEquity = data.currentEquity
      this.highWaterMark = data.highWaterMark
      this.startDate = data.startDate

      return true
    } catch (error) {
      errorHandler.handleError(error, {
        context: { action: "importFromJson" },
        severity: "medium",
      })

      return false
    }
  }

  /**
   * Clear all performance data
   */
  public clearData(): void {
    this.trades = []
    this.equityCurve = [
      {
        timestamp: Date.now(),
        equity: this.initialEquity,
        drawdown: 0,
        drawdownPercent: 0,
      },
    ]
    this.currentEquity = this.initialEquity
    this.highWaterMark = this.initialEquity
    this.startDate = Date.now()
  }
}

// Export singleton instance
export const performanceAnalytics = PerformanceAnalytics.getInstance()
