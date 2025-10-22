/**
 * Console Prompts Integration
 * Manages multi-perspective analysis using Anthropic Console prompts
 * Allows users to select different analysis perspectives (bullish, bearish, risk, options, macro)
 */

export type AnalysisPerspective = "bullish" | "bearish" | "risk" | "options" | "macro";

interface PerspectiveConfig {
  id: AnalysisPerspective;
  label: string;
  description: string;
  promptId: string;
  icon: string;
}

/**
 * Mapping of analysis perspectives to Console prompt IDs
 * These IDs are from console.anthropic.com
 */
export const PERSPECTIVE_CONFIGS: Record<AnalysisPerspective, PerspectiveConfig> = {
  bullish: {
    id: "bullish",
    label: "Bullish Perspective",
    description: "Growth opportunities and upside potential",
    promptId: "20ab2890-64ac-488a-bfe4-c422cc856a00",
    icon: "📈",
  },
  bearish: {
    id: "bearish",
    label: "Bearish Perspective",
    description: "Risks and downside scenarios",
    promptId: "48de0b1e-1c25-41eb-8f32-cf544d654dba",
    icon: "📉",
  },
  risk: {
    id: "risk",
    label: "Risk Analysis",
    description: "Volatility and drawdown potential",
    promptId: "4c3a9e7-79d0-49c1-b988-07729a8cd0b7",
    icon: "⚠️",
  },
  options: {
    id: "options",
    label: "Options Strategy",
    description: "Recommended options plays",
    promptId: "d8e2668-f4d3-4432-b062-66512a939777",
    icon: "📊",
  },
  macro: {
    id: "macro",
    label: "Macro Context",
    description: "Global economic factors impact",
    promptId: "a72d4fe3-4791-4df1-a734-056fce403f00",
    icon: "🌍",
  },
};

/**
 * Analysis data to pass as variables to Console prompts
 */
export interface AnalysisVariables {
  TICKER: string;
  CURRENT_PRICE: string;
  PE_RATIO: string;
  RSI: string;
  PRICE_RANGE: string;
  REGIME: string;
  VIX: string;
  ATR: string;
  BETA: string;
  MARKET_CORRELATION: string;
  PRICE_TREND: string;
  DXY: string;
  YIELD_10Y: string;
  OIL: string;
  GOLD: string;
  SP500: string;
}

/**
 * Build variables object from analysis data
 */
export function buildAnalysisVariables(
  ticker: string,
  currentPrice: number,
  fundamentals: { pe: number; evEbitda?: number; epsGrowth?: number; dividendYield?: number },
  technicals: { rsi: number; sma20: number; sma50: number; atr: number; currentPrice: number },
  priceHistory: Array<{ date: string; close: number }>,
  macroData?: {
    dxy: number | null;
    vix: number | null;
    yield10y: number | null;
    oil: number | null;
    gold: number | null;
    sp500: number | null;
  },
  regimeAnalysis?: { currentRegime: string; volatilityRating: string },
  betaAnalysis?: { currentBeta: number }
): AnalysisVariables {
  // Calculate price trend
  const priceStart = priceHistory[0]?.close || currentPrice;
  const priceEnd = currentPrice;
  const priceChange = ((priceEnd - priceStart) / priceStart) * 100;
  const priceTrend =
    priceChange > 5
      ? "Strong uptrend"
      : priceChange > 0
        ? "Slight uptrend"
        : priceChange < -5
          ? "Strong downtrend"
          : "Slight downtrend";

  // Calculate 52-week range (using price history if available)
  const prices = priceHistory.map((p) => p.close);
  const minPrice = Math.min(...prices, currentPrice);
  const maxPrice = Math.max(...prices, currentPrice);
  const priceRange = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;

  // Determine regime
  const regime = regimeAnalysis?.currentRegime || "Unknown";

  // Correlation with market (default to 0.6 if not available)
  const marketCorrelation = betaAnalysis?.currentBeta?.toFixed(2) || "0.60";

  return {
    TICKER: ticker,
    CURRENT_PRICE: currentPrice.toFixed(2),
    PE_RATIO: fundamentals.pe.toFixed(1),
    RSI: technicals.rsi.toFixed(0),
    PRICE_RANGE: priceRange,
    REGIME: regime,
    VIX: macroData?.vix?.toFixed(1) || "15.0",
    ATR: technicals.atr.toFixed(2),
    BETA: betaAnalysis?.currentBeta?.toFixed(2) || "1.00",
    MARKET_CORRELATION: marketCorrelation,
    PRICE_TREND: priceTrend,
    DXY: macroData?.dxy?.toFixed(2) || "103.5",
    YIELD_10Y: macroData?.yield10y?.toFixed(2) || "4.2",
    OIL: macroData?.oil?.toFixed(2) || "75.0",
    GOLD: macroData?.gold?.toFixed(2) || "2050.0",
    SP500: macroData?.sp500?.toFixed(0) || "5200",
  };
}

/**
 * Call a Console prompt with variables
 * Note: This requires the Anthropic SDK or direct API call with prompt_id
 */
export async function callConsolePerspective(
  perspective: AnalysisPerspective,
  variables: AnalysisVariables,
  apiKey: string
): Promise<string> {
  const config = PERSPECTIVE_CONFIGS[perspective];

  if (!config) {
    throw new Error(`Unknown perspective: ${perspective}`);
  }

  try {
    // Call Anthropic API with the prompt ID
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        prompt_id: config.promptId,
        variables: variables,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Error calling Console prompt ${perspective}:`, error);
      throw new Error(`Failed to call Console prompt: ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      throw new Error("No content returned from Console prompt");
    }

    return content;
  } catch (error) {
    console.error(`Error in callConsolePerspective for ${perspective}:`, error);
    throw error;
  }
}

/**
 * Get all available perspectives
 */
export function getAllPerspectives(): PerspectiveConfig[] {
  return Object.values(PERSPECTIVE_CONFIGS);
}

/**
 * Get perspective config by ID
 */
export function getPerspectiveConfig(
  perspective: AnalysisPerspective
): PerspectiveConfig | undefined {
  return PERSPECTIVE_CONFIGS[perspective];
}
