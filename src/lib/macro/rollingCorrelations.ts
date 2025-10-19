/**
 * Rolling Correlation Analysis
 * Measures correlation between stock returns and macro indicators over multiple time windows
 */

export interface MacroIndicatorData {
  name: string;
  values: Array<{ date: string; value: number }>;
}

export interface CorrelationResult {
  indicator: string;
  window: 30 | 90 | 250;
  correlation: number;
  pValue: number;
  sampleSize: number;
  significance: "***" | "**" | "*" | "ns"; // ns = not significant
}

export interface CorrelationAnalysis {
  ticker: string;
  analysisDate: string;
  correlations: CorrelationResult[];
  interpretation: string;
}

/**
 * Calculate log returns from price data
 * More statistically sound than simple returns for financial data
 */
function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const logReturn = Math.log(prices[i] / prices[i - 1]);
    returns.push(logReturn);
  }
  return returns;
}

/**
 * Calculate mean of an array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - avg, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const xMean = mean(x);
  const yMean = mean(y);

  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;

  for (let i = 0; i < x.length; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xSumSq * ySumSq);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calculate p-value using t-distribution approximation
 * For Pearson correlation coefficient
 */
function calculatePValue(correlation: number, n: number): number {
  if (n < 3) return 1;

  const t = Math.abs(correlation) * Math.sqrt(n - 2) / Math.sqrt(1 - correlation * correlation);

  // Approximate p-value using t-distribution
  // This is a simplified approximation; for production use a proper t-distribution library
  const pApprox = 2 * (1 - normCDF(t));
  return Math.min(pApprox, 1);
}

/**
 * Approximate normal CDF (used for p-value calculation)
 */
function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absx = Math.abs(x);

  const t = 1.0 / (1.0 + p * absx);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const y = 1.0 - (a5 * t5 + a4 * t4 + a3 * t3 + a2 * t2 + a1 * t) * Math.exp(-absx * absx);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Get significance level based on p-value
 */
function getSignificance(pValue: number): "***" | "**" | "*" | "ns" {
  if (pValue < 0.01) return "***"; // p < 0.01
  if (pValue < 0.05) return "**"; // p < 0.05
  if (pValue < 0.1) return "*"; // p < 0.1
  return "ns"; // not significant
}

/**
 * Calculate rolling correlation for a given window size
 */
function calculateWindowCorrelation(
  stockReturns: number[],
  macroReturns: number[],
  windowSize: number
): CorrelationResult | null {
  if (stockReturns.length < windowSize || macroReturns.length < windowSize) {
    return null;
  }

  const correlation = calculatePearsonCorrelation(
    stockReturns.slice(-windowSize),
    macroReturns.slice(-windowSize)
  );

  const pValue = calculatePValue(correlation, windowSize);

  return {
    indicator: "", // Will be set by caller
    window: windowSize as 30 | 90 | 250,
    correlation: Math.round(correlation * 1000) / 1000, // Round to 3 decimals
    pValue: Math.round(pValue * 10000) / 10000,
    sampleSize: windowSize,
    significance: getSignificance(pValue),
  };
}

/**
 * Analyze correlation between stock and macro indicators
 */
export function analyzeCorrelations(
  stockPriceHistory: Array<{ date: string; close: number }>,
  macroIndicators: MacroIndicatorData[],
  ticker: string
): CorrelationAnalysis {
  // Calculate stock log returns
  const stockPrices = stockPriceHistory.map((p) => p.close);
  const stockReturns = calculateLogReturns(stockPrices);

  const correlations: CorrelationResult[] = [];
  const windows: (30 | 90 | 250)[] = [30, 90, 250];

  // For each macro indicator
  for (const indicator of macroIndicators) {
    const indicatorPrices = indicator.values.map((v) => v.value);
    const indicatorReturns = calculateLogReturns(indicatorPrices);

    // Calculate for each window size
    for (const window of windows) {
      const result = calculateWindowCorrelation(stockReturns, indicatorReturns, window);
      if (result) {
        result.indicator = indicator.name;
        correlations.push(result);
      }
    }
  }

  // Generate interpretation
  const strongPositive = correlations.filter((c) => c.correlation > 0.5 && c.significance !== "ns");
  const strongNegative = correlations.filter((c) => c.correlation < -0.5 && c.significance !== "ns");

  let interpretation = "";
  if (strongPositive.length > 0) {
    interpretation += `${ticker} shows strong positive correlation with ${strongPositive
      .map((c) => c.indicator)
      .join(", ")}. `;
  }
  if (strongNegative.length > 0) {
    interpretation += `${ticker} shows strong negative correlation with ${strongNegative
      .map((c) => c.indicator)
      .join(", ")}. `;
  }
  if (interpretation === "") {
    interpretation = `${ticker} shows weak correlations with major macro indicators.`;
  }

  return {
    ticker,
    analysisDate: new Date().toISOString().split("T")[0],
    correlations,
    interpretation,
  };
}

/**
 * Get mock macro indicator data for testing/development
 * In production, these would come from real APIs (Yahoo Finance, Alpha Vantage, FRED, etc.)
 */
export function generateMockMacroData(
  stockPriceHistory: Array<{ date: string; close: number }>
): MacroIndicatorData[] {
  const dates = stockPriceHistory.map((p) => p.date);
  const startIndex = Math.floor(Math.random() * 100);

  return [
    {
      name: "DXY (Dollar Index)",
      values: dates.map((date, i) => ({
        date,
        value: 100 + Math.sin(i * 0.05) * 5 + Math.random() * 2,
      })),
    },
    {
      name: "VIX (Volatility)",
      values: dates.map((date, i) => ({
        date,
        value: 15 + Math.cos(i * 0.03) * 8 + Math.random() * 3,
      })),
    },
    {
      name: "10Y Treasury Yield",
      values: dates.map((date, i) => ({
        date,
        value: 4 + Math.sin(i * 0.02) * 1 + Math.random() * 0.5,
      })),
    },
    {
      name: "Oil Price (WTI)",
      values: dates.map((date, i) => ({
        date,
        value: 80 + Math.sin(i * 0.04) * 15 + Math.random() * 5,
      })),
    },
    {
      name: "Gold Price",
      values: dates.map((date, i) => ({
        date,
        value: 2000 + Math.cos(i * 0.03) * 200 + Math.random() * 50,
      })),
    },
    {
      name: "S&P 500",
      values: dates.map((date, i) => ({
        date,
        value: 4500 + i * 2 + Math.sin(i * 0.02) * 200 + Math.random() * 100,
      })),
    },
  ];
}
