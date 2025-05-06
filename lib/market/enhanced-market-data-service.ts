import { BinanceMarketData, KLine } from '@/lib/binance/market-data';
import { calculateATR, calculateVWAP, calculateEMA } from '@/lib/indicators/basic-indicators';

interface MarketDataConfig {
  atrPeriod: number;
  vwapInterval: number;
  emaShortPeriod: number;
  emaLongPeriod: number;
}

export class EnhancedMarketDataService {
  private binance: BinanceMarketData;
  private config: MarketDataConfig;
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private atrValues: number[] = [];
  private vwapValues: number[] = [];

  constructor(binance: BinanceMarketData, config: Partial<MarketDataConfig> = {}) {
    this.binance = binance;
    this.config = {
      atrPeriod: 14,
      vwapInterval: 30,
      emaShortPeriod: 5,
      emaLongPeriod: 15,
      ...config
    };
  }

  async initialize() {
    // Load initial historical data
    const klines = await this.binance.getKLines('SOLUSDT', '1m', 100);
    this.priceHistory = klines.map((k: KLine) => parseFloat(k.close));
    this.volumeHistory = klines.map((k: KLine) => parseFloat(k.volume));
    
    // Calculate initial indicators
    this.calculateIndicators();
  }

  private calculateIndicators() {
    // Calculate ATR
    // Calculate ATR using approximate high/low values
    const atrInput = this.priceHistory.map((price, i) => ({
      high: price * 1.01,
      low: price * 0.99,
      close: price
    }));
    this.atrValues = calculateATR(atrInput, this.config.atrPeriod);

    // Calculate VWAP
    const vwapInput = this.priceHistory.map((price, i) => ({
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume: this.volumeHistory[i] || 0
    }));
    this.vwapValues = calculateVWAP(vwapInput, this.config.vwapInterval);
  }

  getCurrentATR(): number {
    return this.atrValues[this.atrValues.length - 1] || 0;
  }

  getCurrentVWAP(): number {
    return this.vwapValues[this.vwapValues.length - 1] || 0;
  }

  getDynamicEMAPeriod(): number {
    const atr = this.getCurrentATR();
    const atrThresholdHigh = this.priceHistory.slice(-100).reduce((a,b) => a+b, 0) / 100 * 0.02;
    const atrThresholdLow = atrThresholdHigh * 0.5;

    if (atr > atrThresholdHigh) {
      return Math.max(3, this.config.emaShortPeriod - 2);
    } else if (atr < atrThresholdLow) {
      return Math.min(9, this.config.emaShortPeriod + 2);
    }

    return this.config.emaShortPeriod;
  }

  getEMA(period: number): number {
    const emaValues = calculateEMA(this.priceHistory, period);
    return emaValues[emaValues.length - 1] || 0;
  }

  onNewPrice(price: number, volume: number) {
    this.priceHistory.push(price);
    this.volumeHistory.push(volume);
    if (this.priceHistory.length > 500) {
      this.priceHistory.shift();
      this.volumeHistory.shift();
    }

    this.calculateIndicators();
  }
}

export const enhancedMarketDataService = new EnhancedMarketDataService(new BinanceMarketData('', ''));
