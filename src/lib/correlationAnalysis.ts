/**
 * Correlation Analysis Engine
 * Detects relationships between stock and macro indicators
 * Suggests trade ideas based on macro correlations
 */

export interface CorrelationInsight {
  indicator: string;
  symbol: string;
  relationship: "positive" | "negative" | "inverse";
  strength: "strong" | "moderate" | "weak";
  explanation: string;
  implication: string;
  tradeIdea?: string;
}

/**
 * Analyze stock sector for macro sensitivities
 */
export function getSectorMacroSensitivities(
  sector: string
): Record<string, "high" | "medium" | "low"> {
  const sensitivities: Record<string, Record<string, "high" | "medium" | "low">> = {
    Technology: {
      dxy: "high", // Tech sensitive to dollar strength
      vix: "high", // Risk-off asset
      sp500: "high", // Correlated with market
      yield10y: "high", // Discount rate sensitive
      gold: "low",
      oil: "low",
    },
    Healthcare: {
      dxy: "medium",
      vix: "low", // Defensive
      sp500: "medium",
      yield10y: "medium",
      gold: "low",
      oil: "low",
    },
    Energy: {
      oil: "high",
      dxy: "high",
      sp500: "medium",
      vix: "medium",
      gold: "low",
      yield10y: "medium",
    },
    Financials: {
      yield10y: "high", // Interest rate sensitive
      dxy: "medium",
      sp500: "high",
      vix: "medium",
      gold: "low",
      oil: "low",
    },
    Utilities: {
      yield10y: "high", // Discount rate sensitive
      vix: "medium", // Defensive
      dxy: "low",
      sp500: "medium",
      gold: "medium",
      oil: "medium",
    },
    Materials: {
      oil: "high",
      gold: "high",
      silver: "high",
      dxy: "high",
      sp500: "medium",
      vix: "medium",
    },
    Industrials: {
      oil: "medium",
      dxy: "high",
      sp500: "high",
      vix: "medium",
      yield10y: "medium",
      gold: "low",
    },
    ConsumerDiscretionary: {
      sp500: "high",
      dxy: "medium",
      yield10y: "medium",
      vix: "high",
      gold: "low",
      oil: "low",
    },
  };

  return sensitivities[sector] || sensitivities.Technology;
}

/**
 * Generate correlation insights based on macro data
 */
export function generateCorrelationInsights(
  currentPrice: number,
  priceHistory: Array<{ close: number }>,
  macroData: Record<string, number | null>,
  sector: string = "Technology"
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];

  // DXY - Dollar strength inversely affects exporters
  if (macroData.dxy) {
    insights.push({
      indicator: "Dollar Index",
      symbol: "DXY",
      relationship: "inverse",
      strength: "strong",
      explanation:
        "Strong dollar (↑DXY) reduces earnings for US exporters when converted back to USD",
      implication:
        sector === "Technology"
          ? "Tech companies earn ~40% revenue overseas - stronger dollar pressures margins"
          : "Consider export exposure of this company",
      tradeIdea:
        macroData.dxy > 104
          ? "Consider defensive positioning; watch for further dollar appreciation"
          : "Dollar weakness could be a tailwind for this stock",
    });
  }

  // VIX - Risk-off indicator
  if (macroData.vix) {
    const riskAssessment =
      macroData.vix > 20 ? "elevated" : macroData.vix > 15 ? "moderate" : "low";
    insights.push({
      indicator: "VIX (Fear Index)",
      symbol: "VIX",
      relationship: "inverse",
      strength: "moderate",
      explanation:
        "Higher VIX indicates market stress; risk-on assets underperform during volatility spikes",
      implication: `Current VIX at ${macroData.vix.toFixed(1)} suggests ${riskAssessment} market anxiety`,
      tradeIdea:
        macroData.vix > 20
          ? "Risk-off environment; consider taking profits or hedging"
          : "Low VIX suggests complacency; watch for reversals",
    });
  }

  // Treasury Yields - Discount rate for equities
  if (macroData.yield10y) {
    insights.push({
      indicator: "10-Year Treasury Yield",
      symbol: "TNX",
      relationship: "inverse",
      strength: sector === "Technology" ? "strong" : "moderate",
      explanation:
        "Higher yields make bonds more attractive, increasing discount rates for growth stocks",
      implication:
        sector === "Technology"
          ? "Tech is highly sensitive to rates; 10Y at " +
            macroData.yield10y.toFixed(2) +
            "% impacts valuation significantly"
          : "Monitor yield trends for valuation implications",
      tradeIdea:
        macroData.yield10y > 4.5
          ? "High rates headwind for growth; watch support levels"
          : "Lower rates supportive of higher multiples",
    });
  }

  // Gold - Inflation hedge and risk-off
  if (macroData.gold) {
    insights.push({
      indicator: "Gold",
      symbol: "GLD",
      relationship: "inverse",
      strength: "weak",
      explanation:
        "Rising gold often signals inflation concerns or risk-off sentiment",
      implication: "Gold strength can indicate broader market uncertainty",
      tradeIdea:
        macroData.gold > 2050
          ? "Gold at highs; suggests cautious market sentiment"
          : "Lower gold prices; risk appetite may be intact",
    });
  }

  // Oil - Commodity/Inflation indicator
  if (macroData.oil) {
    const oilSensitivity = sector === "Energy" ? "strong" : "weak";
    insights.push({
      indicator: "Crude Oil",
      symbol: "CL",
      relationship: "positive",
      strength: oilSensitivity as any,
      explanation:
        "Rising oil affects transportation costs and inflation expectations",
      implication:
        sector === "Energy"
          ? "Oil is primary driver; currently at $" + macroData.oil.toFixed(2)
          : "Watch oil for inflation signals",
      tradeIdea:
        macroData.oil > 80
          ? "Higher oil = inflation pressure; could limit Fed cuts"
          : "Lower oil supportive for consumer and margins",
    });
  }

  // S&P 500 - Market correlation
  if (macroData.sp500) {
    insights.push({
      indicator: "S&P 500 Index",
      symbol: "SPY",
      relationship: "positive",
      strength: "moderate",
      explanation:
        "Stock generally moves with broader market; track relative strength",
      implication:
        "If SPY trends up but this stock lags, sector/company-specific weakness",
      tradeIdea:
        "Monitor relative strength vs SPY; underperformance may signal issue",
    });
  }

  return insights;
}

/**
 * Generate macro-informed trade ideas
 */
export function generateTradeIdeas(
  insights: CorrelationInsight[],
  currentPrice: number,
  rsi?: number
): string[] {
  const ideas: string[] = [];

  // Combine insights for trade setup
  const hasNegativeEnvironment = insights.some(
    (i) => i.relationship === "inverse" && i.strength === "strong"
  );
  const hasPositiveEnvironment = insights.some(
    (i) => i.relationship === "positive" && i.strength === "strong"
  );

  if (hasNegativeEnvironment) {
    ideas.push("Strong headwind environment: Consider tighter stop losses");
    ideas.push("Look for oversold bounces (RSI < 30) as trading opportunities");
  }

  if (hasPositiveEnvironment) {
    ideas.push("Supportive macro backdrop: Favor breakout strategies");
    ideas.push("Watch for resistance breakouts with volume confirmation");
  }

  if (rsi && rsi < 30) {
    ideas.push("Oversold technical setup: Watch for mean reversion bounce");
  } else if (rsi && rsi > 70) {
    ideas.push("Overbought territory: Consider profit-taking near resistance");
  }

  return ideas.length > 0
    ? ideas
    : [
        "Monitor macro indicators for directional bias",
        "Combine with technical support/resistance for entry points",
      ];
}

/**
 * Format insights for display in natural language
 */
export function formatInsightsSummary(insights: CorrelationInsight[]): string {
  if (insights.length === 0) return "No significant macro correlations detected.";

  const strongInsights = insights.filter((i) => i.strength === "strong");

  if (strongInsights.length === 0) return "Macro backdrop is mixed; focus on company specifics.";

  const summary = strongInsights
    .slice(0, 3)
    .map((i) => `${i.indicator} (${i.relationship}): ${i.implication}`)
    .join(" | ");

  return summary;
}
