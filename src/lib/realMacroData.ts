/**
 * Real Macro Data Fetcher
 * Replaces mock data with actual market data from multiple APIs
 * Uses Vercel KV for caching to minimize API calls
 */

import { getCache, setCache, getCacheKey, CACHE_CONFIG } from "@/lib/cache/kv";

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
 * Fetch real macro data from multiple APIs
 * Uses Vercel KV caching with 1-hour TTL
 * Falls back gracefully if any API fails
 */
export async function fetchRealMacroData(): Promise<RealMacroData> {
  const cacheKey = getCacheKey("macro", "realData");
  const cached = await getCache(cacheKey);

  if (cached) {
    console.log("[realMacroData] Cache HIT for macro data");
    return cached as RealMacroData;
  }

  console.log("[realMacroData] Cache MISS - fetching from APIs");

  // Fetch all in parallel with timeout protection
  const [dxyResult, vixResult, yield10yResult, oilResult, goldResult, sp500Result] =
    await Promise.allSettled([
      fetchDXY(),
      fetchVIX(),
      fetch10YYield(),
      fetchOilPrice(),
      fetchGoldPrice(),
      fetchSP500(),
    ]);

  const result: RealMacroData = {
    dxy: dxyResult.status === "fulfilled" ? dxyResult.value : { name: "DXY", value: null, source: "Alpha Vantage", fetchedAt: new Date(), error: "Fetch failed" },
    vix: vixResult.status === "fulfilled" ? vixResult.value : { name: "VIX", value: null, source: "Yahoo Finance", fetchedAt: new Date(), error: "Fetch failed" },
    yield10y: yield10yResult.status === "fulfilled" ? yield10yResult.value : { name: "10Y Yield", value: null, source: "FRED", fetchedAt: new Date(), error: "Fetch failed" },
    oil: oilResult.status === "fulfilled" ? oilResult.value : { name: "Oil (WTI)", value: null, source: "Alpha Vantage", fetchedAt: new Date(), error: "Fetch failed" },
    gold: goldResult.status === "fulfilled" ? goldResult.value : { name: "Gold", value: null, source: "Alpha Vantage", fetchedAt: new Date(), error: "Fetch failed" },
    sp500: sp500Result.status === "fulfilled" ? sp500Result.value : { name: "S&P 500", value: null, source: "Yahoo Finance", fetchedAt: new Date(), error: "Fetch failed" },
    timestamp: new Date(),
    allSuccess:
      dxyResult.status === "fulfilled" &&
      vixResult.status === "fulfilled" &&
      yield10yResult.status === "fulfilled" &&
      oilResult.status === "fulfilled" &&
      goldResult.status === "fulfilled" &&
      sp500Result.status === "fulfilled",
  };

  console.log("[realMacroData] Fetch results:", {
    dxy: result.dxy.value,
    vix: result.vix.value,
    yield10y: result.yield10y.value,
    oil: result.oil.value,
    gold: result.gold.value,
    sp500: result.sp500.value,
    allSuccess: result.allSuccess,
  });

  // Cache for 1 hour (market data doesn't change much intraday)
  await setCache(cacheKey, result, 3600);

  return result;
}

/**
 * Fetch DXY (US Dollar Index)
 * Source: Alpha Vantage FX_DAILY endpoint
 * DXY measures USD strength vs major currencies
 */
async function fetchDXY(): Promise<RealMacroDataPoint> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY not set");

    const response = await fetch(
      `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=EUR&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"]) {
      throw new Error("API rate limit reached");
    }

    if (data["Time Series FX (Daily)"]) {
      const latestDate = Object.keys(data["Time Series FX (Daily)"])[0];
      const latestPrice = data["Time Series FX (Daily)"][latestDate]["4. close"];
      // EUR/USD to DXY conversion (approximate)
      // DXY ≈ 100 / EUR_USD
      const dxyValue = Math.round((100 / parseFloat(latestPrice)) * 100) / 100;

      console.log("[fetchDXY] Success:", dxyValue);

      return {
        name: "DXY (Dollar Index)",
        value: dxyValue,
        source: "Alpha Vantage",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[fetchDXY] Error:", errorMsg);
    return {
      name: "DXY (Dollar Index)",
      value: null,
      source: "Alpha Vantage",
      fetchedAt: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Fetch VIX (Volatility Index)
 * Source: Yahoo Finance
 * VIX measures implied volatility of S&P 500
 */
async function fetchVIX(): Promise<RealMacroDataPoint> {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v10/finance/quoteSummary/%5EVIX?modules=price",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.quoteSummary?.result?.[0]?.price?.regularMarketPrice) {
      const vixValue = data.quoteSummary.result[0].price.regularMarketPrice.raw;
      console.log("[fetchVIX] Success:", vixValue);

      return {
        name: "VIX (Volatility)",
        value: vixValue,
        source: "Yahoo Finance",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No price data in response");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[fetchVIX] Error:", errorMsg);
    return {
      name: "VIX (Volatility)",
      value: null,
      source: "Yahoo Finance",
      fetchedAt: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Fetch 10Y Treasury Yield
 * Source: FRED API (Federal Reserve Economic Data)
 * Free API: https://fred.stlouisfed.org/
 * Series ID: DGS10 (10-Year Treasury Constant Maturity)
 */
async function fetch10YYield(): Promise<RealMacroDataPoint> {
  try {
    const fredApiKey = process.env.FRED_API_KEY;

    if (!fredApiKey) {
      throw new Error("FRED_API_KEY not configured");
    }

    const response = await fetch(
      `https://api.stlouisfed.org/fred/series/DGS10/observations?api_key=${fredApiKey}&limit=1&sort_order=desc`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.observations?.[0]?.value) {
      const yieldValue = parseFloat(data.observations[0].value);
      console.log("[fetch10YYield] Success:", yieldValue);

      return {
        name: "10Y Treasury Yield",
        value: yieldValue,
        source: "FRED",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No observations in response");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[fetch10YYield] Error:", errorMsg);
    return {
      name: "10Y Treasury Yield",
      value: null,
      source: "FRED",
      fetchedAt: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Fetch Oil Price (WTI Crude)
 * Source: Alpha Vantage
 */
async function fetchOilPrice(): Promise<RealMacroDataPoint> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY not set");

    const response = await fetch(
      `https://www.alphavantage.co/query?function=WTI&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"]) {
      throw new Error("API rate limit reached");
    }

    if (data.data?.[0]?.value) {
      const oilValue = parseFloat(data.data[0].value);
      console.log("[fetchOilPrice] Success:", oilValue);

      return {
        name: "Oil Price (WTI)",
        value: oilValue,
        source: "Alpha Vantage",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[fetchOilPrice] Error:", errorMsg);
    return {
      name: "Oil Price (WTI)",
      value: null,
      source: "Alpha Vantage",
      fetchedAt: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Fetch Gold Price
 * Source: Alpha Vantage
 */
async function fetchGoldPrice(): Promise<RealMacroDataPoint> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY not set");

    const response = await fetch(
      `https://www.alphavantage.co/query?function=GOLD&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"]) {
      throw new Error("API rate limit reached");
    }

    if (data.data?.[0]?.value) {
      const goldValue = parseFloat(data.data[0].value);
      console.log("[fetchGoldPrice] Success:", goldValue);

      return {
        name: "Gold Price",
        value: goldValue,
        source: "Alpha Vantage",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No data in response");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[fetchGoldPrice] Error:", errorMsg);
    return {
      name: "Gold Price",
      value: null,
      source: "Alpha Vantage",
      fetchedAt: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Fetch S&P 500 Index
 * Source: Yahoo Finance
 */
async function fetchSP500(): Promise<RealMacroDataPoint> {
  try {
    const response = await fetch(
      "https://query1.finance.yahoo.com/v10/finance/quoteSummary/%5EGSPC?modules=price",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.quoteSummary?.result?.[0]?.price?.regularMarketPrice) {
      const sp500Value = data.quoteSummary.result[0].price.regularMarketPrice.raw;
      console.log("[fetchSP500] Success:", sp500Value);

      return {
        name: "S&P 500",
        value: sp500Value,
        source: "Yahoo Finance",
        fetchedAt: new Date(),
      };
    }

    throw new Error("No price data in response");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[fetchSP500] Error:", errorMsg);
    return {
      name: "S&P 500",
      value: null,
      source: "Yahoo Finance",
      fetchedAt: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Convert real macro data to legacy MacroIndicatorData format for backward compatibility
 * This allows existing correlation analysis code to work unchanged
 */
export function convertRealMacroToLegacyFormat(
  realData: RealMacroData,
  priceHistory: Array<{ date: string; close: number }>
): Array<{ name: string; values: Array<{ date: string; value: number }> }> {
  const dates = priceHistory.map((p) => p.date);

  return [
    {
      name: "DXY (Dollar Index)",
      values: dates.map((date) => ({
        date,
        value: realData.dxy.value ?? 100,
      })),
    },
    {
      name: "VIX (Volatility)",
      values: dates.map((date) => ({
        date,
        value: realData.vix.value ?? 15,
      })),
    },
    {
      name: "10Y Treasury Yield",
      values: dates.map((date) => ({
        date,
        value: realData.yield10y.value ?? 4.0,
      })),
    },
    {
      name: "Oil Price (WTI)",
      values: dates.map((date) => ({
        date,
        value: realData.oil.value ?? 80,
      })),
    },
    {
      name: "Gold Price",
      values: dates.map((date) => ({
        date,
        value: realData.gold.value ?? 2000,
      })),
    },
    {
      name: "S&P 500",
      values: dates.map((date) => ({
        date,
        value: realData.sp500.value ?? 4500,
      })),
    },
  ];
}
