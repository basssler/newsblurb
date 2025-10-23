/**
 * Real Macro Data Fetcher - FRED + Twelve Data Edition
 * Replaces mock data with actual market data from official sources
 *
 * Data Sources:
 * - FRED (Federal Reserve): VIX, DXY, 10Y Yield, Oil, Gold (24hr cache)
 * - Twelve Data: Real-time VIX, S&P 500 (5min cache)
 */

import { getCache, setCache, getCacheKey } from "@/lib/cache/kv";

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
