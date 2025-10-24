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
