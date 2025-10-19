/**
 * Macro Data Service
 * Fetches macro indicators: DXY, commodities, indices, treasury yields
 */

interface MacroIndicators {
  dxy: number | null; // Dollar Index
  gold: number | null; // Gold price
  silver: number | null; // Silver price
  oil: number | null; // Crude Oil
  sp500: number | null; // S&P 500
  vix: number | null; // Volatility Index
  yield10y: number | null; // 10-year Treasury Yield
  yield2y: number | null; // 2-year Treasury Yield
}

interface HistoricalMacro {
  date: string;
  dxy?: number;
  gold?: number;
  silver?: number;
  oil?: number;
  sp500?: number;
  vix?: number;
}

// Mock data for development - in production, use Alpha Vantage API
const MOCK_MACRO_DATA: MacroIndicators = {
  dxy: 103.5,
  gold: 2050,
  silver: 25.3,
  oil: 78.5,
  sp500: 5810,
  vix: 14.2,
  yield10y: 4.25,
  yield2y: 4.35,
};

const MOCK_HISTORICAL: HistoricalMacro[] = [
  { date: "2024-01-01", dxy: 102.8, gold: 2080, sp500: 5700, vix: 14.5 },
  { date: "2024-02-01", dxy: 103.2, gold: 2040, sp500: 5750, vix: 14.3 },
  { date: "2024-03-01", dxy: 103.5, gold: 2050, sp500: 5810, vix: 14.2 },
];

export async function getMacroIndicators(): Promise<MacroIndicators> {
  // In production, fetch from Alpha Vantage or similar
  // For now, return mock data
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_MACRO_DATA), 100);
  });
}

export async function getHistoricalMacro(
  days: number = 90
): Promise<HistoricalMacro[]> {
  // In production, fetch real historical data
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_HISTORICAL), 100);
  });
}

/**
 * Calculate direction trend for an indicator
 * Returns: "up", "down", or "stable"
 */
export function getTrend(current: number, previous: number): "up" | "down" | "stable" {
  const percentChange = ((current - previous) / previous) * 100;
  if (percentChange > 1) return "up";
  if (percentChange < -1) return "down";
  return "stable";
}

/**
 * Calculate percentage change
 */
export function getPercentChange(current: number, previous: number): number {
  return ((current - previous) / previous) * 100;
}

/**
 * Format macro data for display
 */
export function formatMacroValue(value: number | null, type: string): string {
  if (value === null) return "N/A";

  if (type === "percentage" || type === "yield") {
    return `${value.toFixed(2)}%`;
  } else if (type === "price") {
    return `$${value.toFixed(2)}`;
  } else if (type === "index") {
    return `${value.toFixed(0)}`;
  }
  return `${value.toFixed(2)}`;
}

/**
 * Get macro indicator metadata
 */
export const MACRO_METADATA = {
  dxy: {
    name: "Dollar Index (DXY)",
    symbol: "DXY",
    description: "US Dollar strength vs basket of currencies",
    category: "currency",
  },
  gold: {
    name: "Gold",
    symbol: "GLD",
    description: "Gold price per ounce",
    category: "commodity",
  },
  silver: {
    name: "Silver",
    symbol: "SLV",
    description: "Silver price per ounce",
    category: "commodity",
  },
  oil: {
    name: "Crude Oil",
    symbol: "CL",
    description: "WTI Crude Oil price per barrel",
    category: "commodity",
  },
  sp500: {
    name: "S&P 500",
    symbol: "SPY",
    description: "S&P 500 Index",
    category: "equity",
  },
  vix: {
    name: "VIX (Fear Index)",
    symbol: "VIX",
    description: "Market volatility index",
    category: "volatility",
  },
  yield10y: {
    name: "10Y Treasury Yield",
    symbol: "TNX",
    description: "10-year US Treasury yield",
    category: "fixed-income",
  },
  yield2y: {
    name: "2Y Treasury Yield",
    symbol: "TYX",
    description: "2-year US Treasury yield",
    category: "fixed-income",
  },
};
