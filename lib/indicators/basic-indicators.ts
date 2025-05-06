export function calculateATR(prices: {high: number, low: number, close: number}[], period = 14): number[] {
  const trValues: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevClose = prices[i-1].close;
    const highLow = prices[i].high - prices[i].low;
    const highClose = Math.abs(prices[i].high - prevClose);
    const lowClose = Math.abs(prices[i].low - prevClose);
    trValues.push(Math.max(highLow, highClose, lowClose));
  }

  const atrValues: number[] = [];
  let atr = trValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  atrValues.push(atr);

  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period;
    atrValues.push(atr);
  }

  return atrValues;
}

export function calculateVWAP(prices: {high: number, low: number, close: number, volume: number}[], interval = 30): number[] {
  const vwapValues: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < prices.length; i++) {
    const typicalPrice = (prices[i].high + prices[i].low + prices[i].close) / 3;
    cumulativeTPV += typicalPrice * prices[i].volume;
    cumulativeVolume += prices[i].volume;

    if ((i + 1) % interval === 0 || i === prices.length - 1) {
      vwapValues.push(cumulativeTPV / cumulativeVolume);
      cumulativeTPV = 0;
      cumulativeVolume = 0;
    }
  }

  return vwapValues;
}

export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaValues: number[] = [];
  let ema = prices[0];
  emaValues.push(ema);

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emaValues.push(ema);
  }

  return emaValues;
}
