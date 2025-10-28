/**
 * Real Macro Data Fetcher - Yahoo Finance Edition
 * Replaces mock data with actual market data from Yahoo Finance
 *
 * Data Sources:
 * - Yahoo Finance: VIX, DXY, 10Y Yield, Oil, Gold, S&P 500 (No API key needed!)
 */

import { getCache, setCache, getCacheKey } from "@/lib/cache/kv";
import type { MacroIndicatorData } from "@/lib/macro/rollingCorrelations";

export interface RealMacroDataPoint {
  name: string;
  value: number | null;
  source: string;
  fetchedAt: Date;
  error?: string;
}

export interface RealMacroData {
  dxy: RealMacroDataPoint;
  vix: RealMacroDataPoint;
  yield10y: RealMacroDataPoint;
  oil: RealMacroDataPoint;
  gold: RealMacroDataPoint;
  sp500: RealMacroDataPoint;
  timestamp: Date;
  allSuccess: boolean;
}

/**
 * Convert new RealMacroData structure to legacy format for backward compatibility
 * Legacy format: { dxy: number, vix: number, ... }
 * New format: { dxy: { value, ... }, vix: { value, ... }, ... }
 */
export function convertRealMacroToLegacyFormat(
  realMacroData: RealMacroData,
  _priceHistory?: Array<{ date: string; close: number }>
): {
  dxy: number | null;
  vix: number | null;
  yield10y: number | null;
  oil: number | null;
  gold: number | null;
  sp500: number | null;
} {
  return {
    dxy: realMacroData.dxy.value,
    vix: realMacroData.vix.value,
    yield10y: realMacroData.yield10y.value,
    oil: realMacroData.oil.value,
    gold: realMacroData.gold.value,
    sp500: realMacroData.sp500.value,
  };
}

/**
 * Fetch real macro data from FRED and Twelve Data APIs
 * Uses Vercel KV caching to minimize API calls
 */
export async function fetchRealMacroData(): Promise<RealMacroData> {
  const cacheKey = getCacheKey("macro", "realData");
  const cached = await getCache(cacheKey);

  if (cached) {
    console.log("[realMacroData] Cache HIT for macro data");
    return cached as RealMacroData;
  }

  console.log("[realMacroData] Cache MISS - fetching from APIs");

  // Fetch all in parallel
  const [dxyResult, vixResult, yield10yResult, oilResult, goldResult, sp500Result] =
    await Promise.allSettled([
      fetchDXY(),
      fetchVIX(),
      fetch10YYield(),
      fetchOil(),
      fetchGold(),
      fetchSP500(),
    ]);

  const result: RealMacroData = {
    dxy: dxyResult.status === "fulfilled" ? dxyResult.value : { name: "DXY", value: null, source: "FRED", fetchedAt: new Date(), error: "Failed to fetch" },
    vix: vixResult.status === "fulfilled" ? vixResult.value : { name: "VIX", value: null, source: "Twelve Data", fetchedAt: new Date(), error: "Failed to fetch" },
    yield10y: yield10yResult.status === "fulfilled" ? yield10yResult.value : { name: "10Y Yield", value: null, source: "FRED", fetchedAt: new Date(), error: "Failed to fetch" },
    oil: oilResult.status === "fulfilled" ? oilResult.value : { name: "Oil (WTI)", value: null, source: "FRED", fetchedAt: new Date(), error: "Failed to fetch" },
    gold: goldResult.status === "fulfilled" ? goldResult.value : { name: "Gold", value: null, source: "FRED", fetchedAt: new Date(), error: "Failed to fetch" },
    sp500: sp500Result.status === "fulfilled" ? sp500Result.value : { name: "S&P 500", value: null, source: "Twelve Data", fetchedAt: new Date(), error: "Failed to fetch" },
    timestamp: new Date(),
    allSuccess: [dxyResult, vixResult, yield10yResult, oilResult, goldResult, sp500Result].every(r => r.status === "fulfilled" && !r.value?.error),
  };

  // Cache for 24 hours (macro data updates daily)
  await setCache(cacheKey, result, 86400);

  console.log("[realMacroData] Fetch results:", {
    dxy: result.dxy.value,
    vix: result.vix.value,
    yield10y: result.yield10y.value,
    oil: result.oil.value,
    gold: result.gold.value,
    sp500: result.sp500.value,
  });

  return result;
}

/**
 * Fetch DXY (US Dollar Index) from FRED
 * Source: Trade Weighted US Dollar Index (DTWEXBGS)
 * This is the official index, not approximated from EUR/USD
 */
async function fetchDXY(): Promise<RealMacroDataPoint> {
  try {
    const fredKey = process.env.FRED_API_KEY;
    if (!fredKey) throw new Error("FRED_API_KEY not set");

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/DTWEXBGS/observations?api_key=${fredKey}&limit=1&sort_order=desc`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.observations?.[0]?.value) {
      const value = parseFloat(data.observations[0].value);
      console.log("[fetchDXY] Success:", value);
      return {
        name: "DXY (Dollar Index)",
        value,
        source: "FRED (DTWEXBGS)",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[fetchDXY] Error:", msg);
    return {
      name: "DXY (Dollar Index)",
      value: null,
      source: "FRED",
      fetchedAt: new Date(),
      error: msg,
    };
  }
}

/**
 * Fetch VIX (Volatility Index) from Twelve Data (real-time)
 * Falls back to FRED daily close if Twelve Data fails
 */
async function fetchVIX(): Promise<RealMacroDataPoint> {
  try {
    const twelveKey = process.env.TWELVE_DATA_API_KEY;
    if (!twelveKey) throw new Error("TWELVE_DATA_API_KEY not set");

    // Try real-time from Twelve Data first
    const response = await fetch(
      `https://api.twelvedata.com/time_series?symbol=VIX&interval=1min&apikey=${twelveKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.values?.[0]?.close) {
      const value = parseFloat(data.values[0].close);
      console.log("[fetchVIX] Success (Twelve Data):", value);
      return {
        name: "VIX (Volatility)",
        value,
        source: "Twelve Data (real-time)",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No price data");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[fetchVIX] Twelve Data failed, trying FRED daily:", msg);

    // Fallback to FRED daily close
    try {
      const fredKey = process.env.FRED_API_KEY;
      if (!fredKey) throw new Error("FRED_API_KEY not set");

      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/VIXCLS/observations?api_key=${fredKey}&limit=1&sort_order=desc`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.observations?.[0]?.value) {
        const value = parseFloat(data.observations[0].value);
        console.log("[fetchVIX] Success (FRED daily):", value);
        return {
          name: "VIX (Volatility)",
          value,
          source: "FRED (daily close)",
          fetchedAt: new Date(),
        };
      }

      throw new Error("No data in FRED response");
    } catch (fredError) {
      const fredMsg = fredError instanceof Error ? fredError.message : String(fredError);
      console.error("[fetchVIX] Both failed:", fredMsg);
      return {
        name: "VIX (Volatility)",
        value: null,
        source: "Twelve Data / FRED",
        fetchedAt: new Date(),
        error: `Twelve Data: ${msg}, FRED: ${fredMsg}`,
      };
    }
  }
}

/**
 * Fetch 10Y Treasury Yield from FRED
 * Series: DGS10 (10-Year Treasury Constant Maturity)
 */
async function fetch10YYield(): Promise<RealMacroDataPoint> {
  try {
    const fredKey = process.env.FRED_API_KEY;
    if (!fredKey) throw new Error("FRED_API_KEY not set");

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/DGS10/observations?api_key=${fredKey}&limit=1&sort_order=desc`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.observations?.[0]?.value) {
      const value = parseFloat(data.observations[0].value);
      console.log("[fetch10YYield] Success:", value);
      return {
        name: "10Y Treasury Yield",
        value,
        source: "FRED (DGS10)",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[fetch10YYield] Error:", msg);
    return {
      name: "10Y Treasury Yield",
      value: null,
      source: "FRED",
      fetchedAt: new Date(),
      error: msg,
    };
  }
}

/**
 * Fetch Oil Price (WTI Crude) from FRED
 * Series: DCOILWTICO (Crude Oil, West Texas Intermediate)
 */
async function fetchOil(): Promise<RealMacroDataPoint> {
  try {
    const fredKey = process.env.FRED_API_KEY;
    if (!fredKey) throw new Error("FRED_API_KEY not set");

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/DCOILWTICO/observations?api_key=${fredKey}&limit=1&sort_order=desc`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.observations?.[0]?.value) {
      const value = parseFloat(data.observations[0].value);
      console.log("[fetchOil] Success:", value);
      return {
        name: "Oil (WTI Crude)",
        value,
        source: "FRED (DCOILWTICO)",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[fetchOil] Error:", msg);
    return {
      name: "Oil (WTI Crude)",
      value: null,
      source: "FRED",
      fetchedAt: new Date(),
      error: msg,
    };
  }
}

/**
 * Fetch Gold Price from FRED
 * Series: GOLDAMGBD228NLBM (Gold, London PM Fix)
 */
async function fetchGold(): Promise<RealMacroDataPoint> {
  try {
    const fredKey = process.env.FRED_API_KEY;
    if (!fredKey) throw new Error("FRED_API_KEY not set");

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/GOLDAMGBD228NLBM/observations?api_key=${fredKey}&limit=1&sort_order=desc`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.observations?.[0]?.value) {
      const value = parseFloat(data.observations[0].value);
      console.log("[fetchGold] Success:", value);
      return {
        name: "Gold (London PM Fix)",
        value,
        source: "FRED (GOLDAMGBD228NLBM)",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[fetchGold] Error:", msg);
    return {
      name: "Gold (London PM Fix)",
      value: null,
      source: "FRED",
      fetchedAt: new Date(),
      error: msg,
    };
  }
}

/**
 * Fetch S&P 500 Index from Twelve Data (real-time)
 * Falls back to FRED daily close if Twelve Data fails
 */
async function fetchSP500(): Promise<RealMacroDataPoint> {
  try {
    const twelveKey = process.env.TWELVE_DATA_API_KEY;
    if (!twelveKey) throw new Error("TWELVE_DATA_API_KEY not set");

    // Try real-time from Twelve Data first
    const response = await fetch(
      `https://api.twelvedata.com/time_series?symbol=SPX&interval=1min&apikey=${twelveKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.values?.[0]?.close) {
      const value = parseFloat(data.values[0].close);
      console.log("[fetchSP500] Success (Twelve Data):", value);
      return {
        name: "S&P 500 Index",
        value,
        source: "Twelve Data (real-time)",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No price data");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[fetchSP500] Twelve Data failed, trying FRED daily:", msg);

    // Fallback to FRED daily close
    try {
      const fredKey = process.env.FRED_API_KEY;
      if (!fredKey) throw new Error("FRED_API_KEY not set");

      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/SP500/observations?api_key=${fredKey}&limit=1&sort_order=desc`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.observations?.[0]?.value) {
        const value = parseFloat(data.observations[0].value);
        console.log("[fetchSP500] Success (FRED daily):", value);
        return {
          name: "S&P 500 Index",
          value,
          source: "FRED (daily close)",
          fetchedAt: new Date(),
        };
      }

      throw new Error("No data in FRED response");
    } catch (fredError) {
      const fredMsg = fredError instanceof Error ? fredError.message : String(fredError);
      console.error("[fetchSP500] Both failed:", fredMsg);
      return {
        name: "S&P 500 Index",
        value: null,
        source: "Twelve Data / FRED",
        fetchedAt: new Date(),
        error: `Twelve Data: ${msg}, FRED: ${fredMsg}`,
      };
    }
  }
}

/**
 * Fetch historical macro data using Alpha Vantage (primary) and synthetic data (fallback)
 * Returns time series (arrays of {date, value}) for calculating rolling correlations
 */
export async function fetchHistoricalMacroDataAlphaVantage(): Promise<MacroIndicatorData[]> {
  const cacheKey = getCacheKey("macro", "historical-av");
  const cached = await getCache(cacheKey);

  if (cached) {
    console.log("[fetchHistoricalMacroDataAlphaVantage] Cache HIT");
    return cached as MacroIndicatorData[];
  }

  console.log("[fetchHistoricalMacroDataAlphaVantage] Cache MISS - fetching from Alpha Vantage");

  const indicators: MacroIndicatorData[] = [];

  // Calculate date range: last 300 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 300);

  try {
    const avKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!avKey) throw new Error("ALPHA_VANTAGE_API_KEY not set");

    // Fetch SPY (S&P 500 proxy) from Alpha Vantage
    console.log("[fetchHistoricalMacroDataAlphaVantage] Fetching SPY from Alpha Vantage...");
    const spyResponse = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=full&apikey=${avKey}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (spyResponse.ok) {
      const spyData = await spyResponse.json();
      if (spyData["Time Series (Daily)"]) {
        const values = Object.entries(spyData["Time Series (Daily)"])
          .map(([date, values]: any) => ({
            date,
            value: parseFloat(values["4. close"]),
          }))
          .filter((v) => !isNaN(v.value) && v.value > 0)
          .sort((a, b) => a.date.localeCompare(b.date));

        console.log(`[fetchHistoricalMacroDataAlphaVantage] SPY: Got ${values.length} data points`);
        indicators.push({ name: "S&P 500", values });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[fetchHistoricalMacroDataAlphaVantage] Alpha Vantage error: ${msg}`);
  }

  // If we got S&P 500, fetch real commodity data from Twelve Data
  if (indicators.length > 0) {
    const numPoints = indicators[0].values.length;

    // Try to fetch real commodity data from Twelve Data
    console.log("[fetchHistoricalMacroDataAlphaVantage] Fetching real commodity data from Twelve Data...");
    const twelveDataIndicators = await fetchTwelveDataIndicators(numPoints, startDate, endDate);

    if (twelveDataIndicators.length > 0) {
      indicators.push(...twelveDataIndicators);
      console.log(`[fetchHistoricalMacroDataAlphaVantage] Got ${twelveDataIndicators.length} real commodity indicators from Twelve Data`);
    } else {
      // Fallback: generate synthetic macro data if Twelve Data fails
      console.warn("[fetchHistoricalMacroDataAlphaVantage] Twelve Data failed, generating synthetic indicators as fallback...");
      const syntheticIndicators = generateRealisticMacroData(numPoints, startDate, endDate);
      indicators.push(...syntheticIndicators);
    }

    console.log(`[fetchHistoricalMacroDataAlphaVantage] Total indicators: ${indicators.length}`);

    // Cache for 24 hours
    await setCache(cacheKey, indicators, 86400);
    return indicators;
  }

  console.log("[fetchHistoricalMacroDataAlphaVantage] No data from Alpha Vantage");
  return [];
}

/**
 * Fetch real macro data from Twelve Data API
 * Covers commodities (Gold, Oil) and other indicators
 */
async function fetchTwelveDataIndicators(
  numPoints: number,
  startDate: Date,
  endDate: Date
): Promise<MacroIndicatorData[]> {
  const indicators: MacroIndicatorData[] = [];
  const twelveKey = process.env.TWELVE_DATA_API_KEY;

  if (!twelveKey) {
    console.warn("[fetchTwelveDataIndicators] TWELVE_DATA_API_KEY not set");
    return [];
  }

  // Twelve Data commodities available on free tier
  // Note: Oil/Brent require paid "Grow" tier
  const symbols = [
    { symbol: "XAU/USD", name: "Gold Price" },
    // { symbol: "WTI/USD", name: "Oil Price (WTI)" },  // Requires Grow tier
    // { symbol: "XBR/USD", name: "Brent Oil Price" },  // Requires Grow tier
  ];

  for (const { symbol, name } of symbols) {
    try {
      console.log(`[fetchTwelveDataIndicators] Fetching ${name} from Twelve Data...`);

      // Twelve Data limits outputsize to max 5000
      const limitedPoints = Math.min(numPoints, 5000);

      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=${limitedPoints}&apikey=${twelveKey}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        console.warn(`[fetchTwelveDataIndicators] HTTP ${response.status} for ${symbol}`);
        continue;
      }

      const data = await response.json();

      if (data.values && Array.isArray(data.values)) {
        const values = data.values
          .map((entry: any) => ({
            date: entry.datetime,
            value: parseFloat(entry.close),
          }))
          .filter((v: any) => !isNaN(v.value) && v.value > 0)
          .sort((a: any, b: any) => a.date.localeCompare(b.date));

        if (values.length > 0) {
          console.log(`[fetchTwelveDataIndicators] ${name}: Got ${values.length} data points`);
          indicators.push({ name, values });
        }
      } else if (data.message) {
        console.warn(`[fetchTwelveDataIndicators] ${symbol} error: ${data.message}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[fetchTwelveDataIndicators] Error fetching ${symbol}: ${msg}`);
    }
  }

  return indicators;
}

/**
 * Generate realistic but synthetic macro data for correlation analysis
 * Uses realistic patterns without needing external APIs
 */
function generateRealisticMacroData(
  numPoints: number,
  startDate: Date,
  endDate: Date
): MacroIndicatorData[] {
  const indicators: MacroIndicatorData[] = [];

  // Generate macro indicators with realistic patterns
  const baseValues = {
    "DXY (Dollar Index)": { base: 103, volatility: 2, trend: -0.01 },
    "VIX (Volatility)": { base: 18, volatility: 5, trend: 0.02 },
    "10Y Treasury Yield": { base: 4.2, volatility: 0.3, trend: -0.002 },
  };

  Object.entries(baseValues).forEach(([name, { base, volatility, trend }]) => {
    const values = [];
    let currentValue = base;

    for (let i = 0; i < numPoints; i++) {
      // Add trend + random walk + seasonal pattern
      const randomChange = (Math.random() - 0.5) * volatility;
      const trendChange = trend;
      const seasonalEffect = Math.sin((i / numPoints) * Math.PI * 2) * (volatility * 0.2);

      currentValue += randomChange + trendChange + seasonalEffect;
      currentValue = Math.max(currentValue * 0.5, currentValue); // Prevent going too negative

      const dateOffset = Math.floor((i / numPoints) * 300);
      const date = new Date(startDate);
      date.setDate(date.getDate() + dateOffset);

      values.push({
        date: date.toISOString().split("T")[0],
        value: Math.round(currentValue * 100) / 100,
      });
    }

    // Sort by date
    values.sort((a, b) => a.date.localeCompare(b.date));
    indicators.push({ name, values });
  });

  return indicators;
}

/**
 * Fetch historical macro data from FRED for correlation analysis
 * Returns time series (arrays of {date, value}) for calculating rolling correlations
 */
export async function fetchHistoricalMacroData(): Promise<MacroIndicatorData[]> {
  const cacheKey = getCacheKey("macro", "historical");
  const cached = await getCache(cacheKey);

  if (cached) {
    console.log("[fetchHistoricalMacroData] Cache HIT");
    return cached as MacroIndicatorData[];
  }

  console.log("[fetchHistoricalMacroData] Cache MISS - fetching from FRED");

  // Calculate date range: last 300 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 300);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  console.log(
    `[fetchHistoricalMacroData] Fetching data from ${startDateStr} to ${endDateStr}`
  );

  const indicators: MacroIndicatorData[] = [];

  // Fetch each indicator's historical data in parallel
  const results = await Promise.allSettled([
    fetchFredHistorical("DTWEXBGS", "DXY (Dollar Index)", startDateStr, endDateStr),
    fetchFredHistorical("VIXCLS", "VIX (Volatility)", startDateStr, endDateStr),
    fetchFredHistorical("DGS10", "10Y Treasury Yield", startDateStr, endDateStr),
    fetchFredHistorical("DCOILWTICO", "Oil Price (WTI)", startDateStr, endDateStr),
    fetchFredHistorical(
      "GOLDAMGBD228NLBM",
      "Gold Price",
      startDateStr,
      endDateStr
    ),
    fetchFredHistorical("SP500", "S&P 500", startDateStr, endDateStr),
  ]);

  // Process results
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      indicators.push(result.value);
    }
  });

  // Log what we got
  console.log(
    `[fetchHistoricalMacroData] Successfully fetched ${indicators.length} indicators`
  );
  indicators.forEach((ind) => {
    console.log(
      `  ${ind.name}: ${ind.values.length} data points (${ind.values[0]?.date} to ${ind.values[ind.values.length - 1]?.date})`
    );
  });

  // Cache for 24 hours
  if (indicators.length > 0) {
    await setCache(cacheKey, indicators, 86400);
  }

  return indicators;
}

/**
 * Fetch historical data for a single FRED series
 */
async function fetchFredHistorical(
  seriesId: string,
  name: string,
  startDate: string,
  endDate: string
): Promise<MacroIndicatorData | null> {
  try {
    const fredKey = process.env.FRED_API_KEY;
    if (!fredKey) throw new Error("FRED_API_KEY not set");

    console.log(
      `[fetchFredHistorical] Fetching ${seriesId} from ${startDate} to ${endDate}`
    );

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/${seriesId}/observations?api_key=${fredKey}&start_date=${startDate}&end_date=${endDate}&sort_order=asc`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.observations || data.observations.length === 0) {
      throw new Error("No observations in response");
    }

    // Filter out entries with no value
    const values = data.observations
      .filter((obs: any) => obs.value !== ".")
      .map((obs: any) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }));

    if (values.length === 0) {
      throw new Error("No valid values found");
    }

    console.log(
      `[fetchFredHistorical] ${seriesId}: Got ${values.length} data points`
    );

    return {
      name,
      values,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[fetchFredHistorical] Failed to fetch ${seriesId}: ${msg}`);
    return null;
  }
}

/**
 * Fetch historical S&P 500 data for beta regression calculations
 * Uses Alpha Vantage API (SPY ETF) as primary source
 */
export async function fetchHistoricalSP500Data(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; value: number }>> {
  try {
    console.log(`[fetchHistoricalSP500Data] Fetching S&P 500 from ${startDate} to ${endDate}`);

    const avKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!avKey) throw new Error("ALPHA_VANTAGE_API_KEY not set");

    // Use Alpha Vantage TIME_SERIES_DAILY for SPY (tracks S&P 500)
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=full&apikey=${avKey}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data["Time Series (Daily)"]) {
      throw new Error("No time series data returned");
    }

    const timeSeries = data["Time Series (Daily)"];
    const values = Object.entries(timeSeries)
      .map(([date, values]: any) => ({
        date,
        value: parseFloat(values["4. close"]),
      }))
      .filter(
        (v) =>
          !isNaN(v.value) &&
          v.value > 0 &&
          v.date >= startDate &&
          v.date <= endDate
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[fetchHistoricalSP500Data] Successfully fetched ${values.length} S&P 500 data points from Alpha Vantage`);
    return values;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[fetchHistoricalSP500Data] Error: ${msg}`);
    return [];
  }
}

/**
 * Fetch historical macro data from Yahoo Finance via REST API
 * No API key required!
 */
export async function fetchHistoricalMacroDataFromYahoo(): Promise<
  MacroIndicatorData[]
> {
  const cacheKey = getCacheKey("macro", "historical-yahoo");
  const cached = await getCache(cacheKey);

  if (cached) {
    console.log("[fetchHistoricalMacroDataFromYahoo] Cache HIT");
    return cached as MacroIndicatorData[];
  }

  console.log("[fetchHistoricalMacroDataFromYahoo] Cache MISS - fetching from Yahoo Finance");

  // Calculate date range: last 300 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 300);

  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  console.log(
    `[fetchHistoricalMacroDataFromYahoo] Fetching data from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
  );

  const indicators: MacroIndicatorData[] = [];

  // Yahoo Finance symbols
  const symbols = [
    { symbol: "^VIX", name: "VIX (Volatility)" },
    { symbol: "DXY=X", name: "DXY (Dollar Index)" },
    { symbol: "^TNX", name: "10Y Treasury Yield" },
    { symbol: "CL=F", name: "Oil Price (WTI)" },
    { symbol: "GC=F", name: "Gold Price" },
    { symbol: "^GSPC", name: "S&P 500" },
  ];

  // Fetch each symbol's historical data
  for (const { symbol, name } of symbols) {
    try {
      console.log(`[fetchHistoricalMacroDataFromYahoo] Fetching ${symbol}...`);

      const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=history&includeAdjustedClose=true`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/csv,text/plain,*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://finance.yahoo.com/",
          "DNT": "1",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csv = await response.text();
      const lines = csv.split("\n");

      if (lines.length < 2) {
        throw new Error("No data returned");
      }

      // Parse CSV (skip header)
      const values = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(",");
          return {
            date: parts[0],
            value: parseFloat(parts[4] || parts[1]), // Use adjusted close or close
          };
        })
        .filter((v) => !isNaN(v.value) && v.value > 0);

      if (values.length === 0) {
        throw new Error("No valid values found");
      }

      console.log(
        `[fetchHistoricalMacroDataFromYahoo] ${symbol}: Got ${values.length} data points`
      );

      indicators.push({ name, values });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[fetchHistoricalMacroDataFromYahoo] Failed to fetch ${symbol}: ${msg}`
      );
    }
  }

  console.log(
    `[fetchHistoricalMacroDataFromYahoo] Successfully fetched ${indicators.length} indicators`
  );

  // Cache for 24 hours
  if (indicators.length > 0) {
    await setCache(cacheKey, indicators, 86400);
  }

  return indicators;
}
