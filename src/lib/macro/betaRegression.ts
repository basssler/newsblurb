/**
 * Beta Regression Analysis
 * Measures systematic risk and market sensitivity
 */

export interface BetaResult {
  beta30d: number;
  beta90d: number;
  beta250d: number;
  alpha: number;
  rSquared: number;
  classification: "defensive" | "neutral" | "aggressive";
  interpretation: string;
}

export interface RegressionMetrics {
  slope: number; // Beta
  intercept: number; // Alpha
  rSquared: number;
  correlation: number;
}

/**
 * Calculate log returns from price data
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
 * Calculate covariance between two arrays
 */
function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const xMean = mean(x);
  const yMean = mean(y);

  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - xMean) * (y[i] - yMean);
  }

  return sum / (x.length - 1);
}

/**
 * Calculate variance
 */
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - avg, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1);
}

/**
 * Perform linear regression: Y = intercept + slope * X
 * Returns slope (beta), intercept (alpha), and R-squared
 */
function linearRegression(x: number[], y: number[]): RegressionMetrics {
  if (x.length !== y.length || x.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      correlation: 0,
    };
  }

  const xMean = mean(x);
  const yMean = mean(y);

  const cov = covariance(x, y);
  const xVariance = variance(x);

  if (xVariance === 0) {
    return {
      slope: 0,
      intercept: yMean,
      rSquared: 0,
      correlation: 0,
    };
  }

  const slope = cov / xVariance;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let ssRes = 0; // Sum of squared residuals
  let ssTot = 0; // Total sum of squares
  for (let i = 0; i < x.length; i++) {
    const predicted = intercept + slope * x[i];
    const actual = y[i];
    ssRes += Math.pow(actual - predicted, 2);
    ssTot += Math.pow(actual - yMean, 2);
  }

  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Calculate correlation coefficient
  const xStdDev = stdDev(x);
  const yStdDev = stdDev(y);
  const correlation =
    xStdDev === 0 || yStdDev === 0 ? 0 : cov / (xStdDev * yStdDev);

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 10000) / 10000,
    rSquared: Math.round(rSquared * 1000) / 1000,
    correlation: Math.round(correlation * 1000) / 1000,
  };
}

/**
 * Calculate beta for a given window size
 */
function calculateBetaForWindow(
  stockReturns: number[],
  marketReturns: number[],
  windowSize: number
): number | null {
  if (
    stockReturns.length < windowSize ||
    marketReturns.length < windowSize
  ) {
    return null;
  }

  const metrics = linearRegression(
    marketReturns.slice(-windowSize),
    stockReturns.slice(-windowSize)
  );

  return metrics.slope;
}

/**
 * Classify beta value
 */
function classifyBeta(beta: number): "defensive" | "neutral" | "aggressive" {
  if (beta < 0.8) return "defensive";
  if (beta > 1.2) return "aggressive";
  return "neutral";
}

/**
 * Analyze beta against S&P 500
 */
export function analyzeBeta(
  stockPriceHistory: Array<{ date: string; close: number }>,
  marketPriceHistory: Array<{ date: string; close: number }>,
  ticker: string,
  riskFreeRate: number = 0.02 // 2% annual
): BetaResult {
  const stockPrices = stockPriceHistory.map((p) => p.close);
  const marketPrices = marketPriceHistory.map((p) => p.close);

  const stockReturns = calculateLogReturns(stockPrices);
  const marketReturns = calculateLogReturns(marketPrices);

  const windows: (30 | 90 | 250)[] = [30, 90, 250];
  const betas: Record<number, number | null> = {};

  for (const window of windows) {
    betas[window] = calculateBetaForWindow(
      stockReturns,
      marketReturns,
      window
    );
  }

  // Use 250-day beta for overall classification (long-term)
  const beta250 = betas[250] ?? betas[90] ?? betas[30] ?? 1;
  const beta90 = betas[90] ?? betas[30] ?? beta250;
  const beta30 = betas[30] ?? beta90;

  // Calculate alpha (excess return above market)
  // Alpha = Average Stock Return - (Risk-Free Rate + Beta * (Average Market Return - Risk-Free Rate))
  const avgStockReturn = mean(stockReturns);
  const avgMarketReturn = mean(marketReturns);
  const marketRiskPremium = avgMarketReturn - riskFreeRate / 252; // Annualized to daily

  const alpha =
    avgStockReturn - (riskFreeRate / 252 + beta250 * marketRiskPremium);

  // Calculate R-squared using 250-day window (best estimate)
  const metrics = linearRegression(
    marketReturns.slice(-250),
    stockReturns.slice(-250)
  );
  const rSquared = metrics.rSquared;

  // Generate interpretation
  const classification = classifyBeta(beta250);
  let interpretation = `${ticker} is a `;

  if (classification === "defensive") {
    interpretation += `defensive stock (β=${beta250.toFixed(2)}) that moves less than the market. `;
    interpretation += `In down markets, it typically falls less. In up markets, it rises less.`;
  } else if (classification === "aggressive") {
    interpretation += `growth/aggressive stock (β=${beta250.toFixed(2)}) that moves more than the market. `;
    interpretation += `In up markets, it typically outperforms. In down markets, it falls more.`;
  } else {
    interpretation += `market-neutral stock (β=${beta250.toFixed(2)}) that moves in line with the market. `;
    interpretation += `Its performance closely tracks the S&P 500.`;
  }

  if (Math.abs(alpha) > 0.0005) {
    interpretation += ` It shows ${alpha > 0 ? "positive" : "negative"} alpha (${(alpha * 252 * 100).toFixed(1)}% annualized excess return).`;
  }

  interpretation += ` R² of ${(rSquared * 100).toFixed(1)}% suggests the market explains ${(rSquared * 100).toFixed(0)}% of price movements.`;

  return {
    beta30d: Math.round(beta30 * 1000) / 1000,
    beta90d: Math.round(beta90 * 1000) / 1000,
    beta250d: Math.round(beta250 * 1000) / 1000,
    alpha: Math.round(alpha * 100000) / 100000,
    rSquared: Math.round(rSquared * 1000) / 1000,
    classification,
    interpretation,
  };
}

/**
 * Generate mock S&P 500 price history
 * Typically less volatile than individual stocks
 */
export function generateMockSP500Data(
  stockPriceHistory: Array<{ date: string; close: number }>
): Array<{ date: string; close: number }> {
  const startPrice = 4500;
  return stockPriceHistory.map((_, i) => ({
    date: stockPriceHistory[i].date,
    // S&P 500 grows steadily with some volatility
    close:
      startPrice +
      i * 2 +
      Math.sin(i * 0.02) * 100 +
      Math.random() * 50,
  }));
}

/**
 * Rolling Beta Time Series
 * For charting rolling beta over time with multiple windows
 */
export interface RollingBetaPoint {
  date: string;
  beta30d: number | null;
  beta90d: number | null;
  beta250d: number | null;
}

/**
 * Calculate rolling beta for each date in the timeline
 * Returns array of {date, beta30d, beta90d, beta250d}
 */
export function calculateRollingBetaTimeSeries(
  stockPriceHistory: Array<{ date: string; close: number }>,
  marketPriceHistory: Array<{ date: string; close: number }>
): RollingBetaPoint[] {
  const stockPrices = stockPriceHistory.map((p) => p.close);
  const marketPrices = marketPriceHistory.map((p) => p.close);

  const stockReturns = calculateLogReturns(stockPrices);
  const marketReturns = calculateLogReturns(marketPrices);

  const timeSeries: RollingBetaPoint[] = [];
  const windows = [30, 90, 250] as const;

  // Calculate rolling betas for each point
  for (let i = 0; i < stockPriceHistory.length; i++) {
    const point: RollingBetaPoint = {
      date: stockPriceHistory[i].date,
      beta30d: null,
      beta90d: null,
      beta250d: null,
    };

    // For each window size
    for (const window of windows) {
      const startIdx = Math.max(0, i - window + 1);

      if (i - startIdx + 1 >= window && stockReturns.slice(startIdx, i + 1).length >= window) {
        const metrics = linearRegression(
          marketReturns.slice(startIdx, i + 1),
          stockReturns.slice(startIdx, i + 1)
        );
        const key = `beta${window}d` as const;
        point[key] = Math.round(metrics.slope * 1000) / 1000;
      }
    }

    timeSeries.push(point);
  }

  return timeSeries;
}
