/**
 * Technical indicator calculations for enhanced charts
 */

interface PricePoint {
  date: string;
  close: number;
}

interface EnhancedPricePoint extends PricePoint {
  sma20?: number;
  sma50?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  atrUpper?: number;
  atrLower?: number;
}

/**
 * Calculate Simple Moving Average
 * Uses available data if less than period
 */
export function calculateSMA(
  prices: number[],
  period: number
): number | undefined {
  if (prices.length === 0) return undefined;
  // Use the minimum of period or available data
  const effectivePeriod = Math.min(period, prices.length);
  const slice = prices.slice(-effectivePeriod);
  return slice.reduce((a, b) => a + b, 0) / effectivePeriod;
}

/**
 * Calculate Standard Deviation
 */
function calculateStdDev(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const squaredDiffs = slice.map((x) => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  return Math.sqrt(variance);
}

/**
 * Calculate Bollinger Bands
 * Returns upper, middle (SMA), and lower bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
} | undefined {
  const middle = calculateSMA(prices, period);
  if (!middle) return undefined;

  const stdDev = calculateStdDev(prices, period);

  return {
    middle,
    upper: middle + stdDev * stdDevMultiplier,
    lower: middle - stdDev * stdDevMultiplier,
  };
}

/**
 * Calculate support levels (local minima)
 * Works with limited data by adjusting window size
 */
export function calculateSupportLevels(
  prices: number[],
  windowSize: number = 5
): number[] {
  const supports: number[] = [];

  // Adjust window size for small datasets
  const effectiveWindowSize = Math.min(windowSize, Math.floor(prices.length / 4));
  const minWindow = Math.max(1, effectiveWindowSize);

  for (let i = minWindow; i < prices.length - minWindow; i++) {
    let isLocal = true;
    const current = prices[i];

    for (let j = Math.max(0, i - minWindow); j <= Math.min(prices.length - 1, i + minWindow); j++) {
      if (j !== i && prices[j] < current) {
        isLocal = false;
        break;
      }
    }

    if (isLocal && supports.length === 0) {
      supports.push(current);
    } else if (
      isLocal &&
      Math.abs(current - supports[supports.length - 1]) > current * 0.02
    ) {
      supports.push(current);
    }
  }

  return supports.slice(-3); // Return last 3 support levels
}

/**
 * Calculate resistance levels (local maxima)
 * Works with limited data by adjusting window size
 */
export function calculateResistanceLevels(
  prices: number[],
  windowSize: number = 5
): number[] {
  const resistances: number[] = [];

  // Adjust window size for small datasets
  const effectiveWindowSize = Math.min(windowSize, Math.floor(prices.length / 4));
  const minWindow = Math.max(1, effectiveWindowSize);

  for (let i = minWindow; i < prices.length - minWindow; i++) {
    let isLocal = true;
    const current = prices[i];

    for (let j = Math.max(0, i - minWindow); j <= Math.min(prices.length - 1, i + minWindow); j++) {
      if (j !== i && prices[j] > current) {
        isLocal = false;
        break;
      }
    }

    if (isLocal && resistances.length === 0) {
      resistances.push(current);
    } else if (
      isLocal &&
      Math.abs(current - resistances[resistances.length - 1]) > current * 0.02
    ) {
      resistances.push(current);
    }
  }

  return resistances.slice(-3); // Return last 3 resistance levels
}

/**
 * Calculate ATR-based volatility bands
 */
export function calculateATRBands(
  prices: number[],
  atrValue: number,
  multiplier: number = 1.5
): {
  upper: number;
  lower: number;
  middle: number;
} {
  const currentPrice = prices[prices.length - 1];
  const atrBand = atrValue * multiplier;

  return {
    middle: currentPrice,
    upper: currentPrice + atrBand,
    lower: currentPrice - atrBand,
  };
}

/**
 * Enhance price data with all technical indicators
 */
export function enhancePriceData(
  data: PricePoint[],
  atrValue: number
): EnhancedPricePoint[] {
  console.log(`[TI] Enhancing ${data.length} price points`);
  const prices = data.map((d) => d.close);

  const enhanced = data.map((point, index) => {
    const historicalPrices = prices.slice(0, index + 1);

    const sma20 = calculateSMA(historicalPrices, 20);
    const sma50 = calculateSMA(historicalPrices, 50);
    const bbands = calculateBollingerBands(historicalPrices, 20, 2);

    if (index === data.length - 1) {
      console.log(`[TI] Last point - SMA20: ${sma20}, SMA50: ${sma50}, BB Upper: ${bbands?.upper}`);
    }

    return {
      ...point,
      sma20,
      sma50,
      bbUpper: bbands?.upper,
      bbMiddle: bbands?.middle,
      bbLower: bbands?.lower,
    };
  });

  console.log(`[TI] Enhanced samples:`, enhanced.slice(-1));
  return enhanced;
}

/**
 * Calculate mean reversion zones (Bollinger Bands for long-term)
 */
export function calculateMeanReversionZones(
  prices: number[],
  period: number = 50
): {
  overbought: number;
  average: number;
  oversold: number;
} {
  const sma = calculateSMA(prices, period);
  if (!sma) {
    return {
      overbought: prices[prices.length - 1] * 1.05,
      average: prices[prices.length - 1],
      oversold: prices[prices.length - 1] * 0.95,
    };
  }

  const stdDev = calculateStdDev(prices, period);

  return {
    overbought: sma + stdDev * 1.5,
    average: sma,
    oversold: sma - stdDev * 1.5,
  };
}
