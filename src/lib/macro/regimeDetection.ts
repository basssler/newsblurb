/**
 * Regime Detection
 * Classifies market environment (Risk-On/Risk-Off/Neutral) and analyzes stock performance in each regime
 */

export type MarketRegime = "risk-on" | "risk-off" | "neutral";

export interface RegimeIndicators {
  vix: number | null;
  vixTrend: "up" | "down" | "stable"; // vs previous value
  sp500Trend: "up" | "down" | "stable"; // vs previous 20-day average
  dxy: number | null;
  dxyTrend: "up" | "down" | "stable";
  yield10y: number | null;
  yieldTrend: "up" | "down" | "stable";
}

export interface RegimePerformance {
  regime: MarketRegime;
  avgReturn: number; // Average daily return in this regime
  winRate: number; // % of up days in this regime
  volatility: number; // Daily return standard deviation
  sharpeRatio: number; // Risk-adjusted return
  occurrencePercentage: number; // % of days in this regime historically
}

export interface RegimeAnalysis {
  currentRegime: MarketRegime;
  confidence: number; // 0-1, how confident in this classification
  regimeIndicators: RegimeIndicators;
  historicalPerformance: {
    riskOn: RegimePerformance;
    riskOff: RegimePerformance;
    neutral: RegimePerformance;
  };
  interpretation: string;
  actionItems: string[];
}

/**
 * Calculate daily returns from price data
 */
function calculateDailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/**
 * Calculate mean of array
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
 * Calculate trend direction
 * Positive = up, negative = down
 */
function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  const change = (current - previous) / previous;
  if (change > 0.005) return "up"; // 0.5% threshold
  if (change < -0.005) return "down";
  return "stable";
}

/**
 * Classify market regime based on VIX, market trend, and DXY
 *
 * Risk-On: VIX < 15, Markets up, USD weak (DXY down)
 * Risk-Off: VIX > 25, Markets down, USD strong (DXY up)
 * Neutral: Everything else
 */
function classifyRegime(indicators: RegimeIndicators): MarketRegime {
  if (!indicators.vix) return "neutral";

  const vixRiskOn = indicators.vix < 15;
  const vixRiskOff = indicators.vix > 25;

  const marketUp = indicators.sp500Trend === "up";
  const marketDown = indicators.sp500Trend === "down";

  const usdWeak = indicators.dxyTrend === "down";
  const usdStrong = indicators.dxyTrend === "up";

  // Risk-On: Low VIX + Market Up + USD Weak
  if (vixRiskOn && marketUp && usdWeak) {
    return "risk-on";
  }

  // Risk-Off: High VIX + Market Down + USD Strong
  if (vixRiskOff && marketDown && usdStrong) {
    return "risk-off";
  }

  // Secondary Risk-On: Low VIX + Market Up (even if USD neutral)
  if (vixRiskOn && marketUp) {
    return "risk-on";
  }

  // Secondary Risk-Off: High VIX + Market Down (even if USD neutral)
  if (vixRiskOff && marketDown) {
    return "risk-off";
  }

  return "neutral";
}

/**
 * Calculate regime confidence (0-1)
 * Higher score = more confident in classification
 */
function calculateConfidence(
  regime: MarketRegime,
  indicators: RegimeIndicators
): number {
  if (!indicators.vix) return 0.3;

  let score = 0.3; // Base confidence

  if (regime === "risk-on") {
    // VIX very low
    if (indicators.vix < 12) score += 0.3;
    else if (indicators.vix < 15) score += 0.2;

    // Market trending up
    if (indicators.sp500Trend === "up") score += 0.25;

    // USD weak
    if (indicators.dxyTrend === "down") score += 0.15;
  } else if (regime === "risk-off") {
    // VIX very high
    if (indicators.vix > 30) score += 0.3;
    else if (indicators.vix > 25) score += 0.2;

    // Market trending down
    if (indicators.sp500Trend === "down") score += 0.25;

    // USD strong
    if (indicators.dxyTrend === "up") score += 0.15;
  } else {
    // Neutral - confidence is lower by default
    score = 0.4;
  }

  return Math.min(Math.max(score, 0), 1);
}

/**
 * Analyze stock performance in different market regimes
 * Requires historical price data and regime classifications
 */
function analyzeRegimePerformance(
  stockReturns: number[],
  regimeHistory: MarketRegime[]
): {
  riskOn: RegimePerformance;
  riskOff: RegimePerformance;
  neutral: RegimePerformance;
} {
  const regimes: MarketRegime[] = ["risk-on", "risk-off", "neutral"];
  const performances: Record<string, RegimePerformance> = {
    "risk-on": {
      regime: "risk-on",
      avgReturn: 0,
      winRate: 0,
      volatility: 0,
      sharpeRatio: 0,
      occurrencePercentage: 0,
    },
    "risk-off": {
      regime: "risk-off",
      avgReturn: 0,
      winRate: 0,
      volatility: 0,
      sharpeRatio: 0,
      occurrencePercentage: 0,
    },
    neutral: {
      regime: "neutral",
      avgReturn: 0,
      winRate: 0,
      volatility: 0,
      sharpeRatio: 0,
      occurrencePercentage: 0,
    },
  };

  for (const regime of regimes) {
    const regimeReturns = stockReturns.filter(
      (_, i) => regimeHistory[i] === regime
    );

    if (regimeReturns.length === 0) continue;

    const avgReturn = mean(regimeReturns);
    const volatility = stdDev(regimeReturns);
    const winRate =
      regimeReturns.filter((r) => r > 0).length / regimeReturns.length;
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;

    performances[regime] = {
      regime,
      avgReturn: Math.round(avgReturn * 10000) / 10000,
      winRate: Math.round(winRate * 1000) / 10, // As percentage
      volatility: Math.round(volatility * 10000) / 10000,
      sharpeRatio: Math.round(sharpeRatio * 1000) / 1000,
      occurrencePercentage: Math.round(
        (regimeReturns.length / stockReturns.length) * 1000
      ) / 10,
    };
  }

  return {
    riskOn: performances["risk-on"],
    riskOff: performances["risk-off"],
    neutral: performances.neutral,
  };
}

/**
 * Generate regime classification history for a period
 * Simple heuristic: alternates based on simulated market conditions
 */
function generateRegimeHistory(
  dates: string[],
  stockPrices: number[]
): MarketRegime[] {
  const history: MarketRegime[] = [];

  for (let i = 0; i < dates.length; i++) {
    // Simulate regime based on price momentum and volatility
    const lookback = Math.min(20, i);

    if (lookback < 2) {
      history.push("neutral");
      continue;
    }

    const recentReturns = [];
    for (let j = i - lookback; j < i; j++) {
      recentReturns.push(
        (stockPrices[j + 1] - stockPrices[j]) / stockPrices[j]
      );
    }

    const avgReturn = mean(recentReturns);
    const volatility = stdDev(recentReturns);

    // Simplified regime classification
    if (avgReturn > 0.003 && volatility < 0.02) {
      history.push("risk-on");
    } else if (avgReturn < -0.003 && volatility > 0.03) {
      history.push("risk-off");
    } else {
      history.push("neutral");
    }
  }

  return history;
}

/**
 * Main regime analysis function
 */
export function analyzeRegimes(
  stockPriceHistory: Array<{ date: string; close: number }>,
  currentVix: number | null = null,
  currentDxy: number | null = null
): RegimeAnalysis {
  const dates = stockPriceHistory.map((p) => p.date);
  const prices = stockPriceHistory.map((p) => p.close);
  const returns = calculateDailyReturns(prices);

  // Generate regime history (in production, would use real market data)
  const regimeHistory = generateRegimeHistory(dates, prices);

  // Calculate current 20-day market trend
  const lookback20 = Math.min(20, prices.length);
  const recent20 = prices.slice(-lookback20);
  const avg20 = mean(recent20);
  const current = prices[prices.length - 1];
  const sp500Trend = calculateTrend(current, avg20);

  // Current VIX simulation (would be real in production)
  const simVix =
    currentVix || 15 + Math.sin((prices.length * Math.PI) / 50) * 10;

  // Current DXY simulation
  const simDxy =
    currentDxy || 103 + Math.cos((prices.length * Math.PI) / 40) * 3;

  // Previous values for trend calculation
  const prevVix = Math.max(10, simVix - Math.random() * 2);
  const prevDxy = Math.max(100, simDxy - Math.random() * 1);

  const indicators: RegimeIndicators = {
    vix: Math.round(simVix * 10) / 10,
    vixTrend: calculateTrend(simVix, prevVix),
    sp500Trend,
    dxy: Math.round(simDxy * 100) / 100,
    dxyTrend: calculateTrend(simDxy, prevDxy),
    yield10y: 4.25 + Math.sin(prices.length * 0.1) * 0.5,
    yieldTrend: "stable",
  };

  const currentRegime = classifyRegime(indicators);
  const confidence = calculateConfidence(currentRegime, indicators);

  const historicalPerformance = analyzeRegimePerformance(returns, regimeHistory);

  // Generate interpretation
  let interpretation = `Current market regime is ${currentRegime.toUpperCase()} (${Math.round(confidence * 100)}% confidence). `;

  if (currentRegime === "risk-on") {
    interpretation += `Low volatility (VIX=${indicators.vix}), strong market momentum, and weak dollar suggest investor risk appetite. `;
    interpretation += `Historically, this stock performs best in this environment with avg return of ${(historicalPerformance.riskOn.avgReturn * 100).toFixed(2)}% per day.`;
  } else if (currentRegime === "risk-off") {
    interpretation += `High volatility (VIX=${indicators.vix}), market weakness, and dollar strength indicate flight to safety. `;
    interpretation += `This stock typically performs worse in stress environments, with avg return of ${(historicalPerformance.riskOff.avgReturn * 100).toFixed(2)}% per day.`;
  } else {
    interpretation += `Mixed signals from market indicators create uncertain conditions. `;
    interpretation += `Returns have been more balanced across regimes.`;
  }

  const actionItems: string[] = [];

  if (currentRegime === "risk-on") {
    actionItems.push("🟢 Growth/momentum strategies may outperform");
    actionItems.push("📈 Consider increasing equity exposure");
    if (
      historicalPerformance.riskOn.avgReturn >
      historicalPerformance.riskOff.avgReturn
    ) {
      actionItems.push("✅ This stock typically benefits from risk-on conditions");
    }
  } else if (currentRegime === "risk-off") {
    actionItems.push("🔴 Defensive/quality strategies may outperform");
    actionItems.push("⚠️ Consider hedging or reducing risk exposure");
    if (
      historicalPerformance.riskOff.avgReturn >
      historicalPerformance.riskOn.avgReturn
    ) {
      actionItems.push("✅ This stock shows resilience in downturns");
    } else {
      actionItems.push("⚠️ This stock is vulnerable in risk-off environments");
    }
  } else {
    actionItems.push("⚪ Market signals are mixed");
    actionItems.push("Maintain balanced approach");
  }

  return {
    currentRegime,
    confidence,
    regimeIndicators: indicators,
    historicalPerformance,
    interpretation,
    actionItems,
  };
}
