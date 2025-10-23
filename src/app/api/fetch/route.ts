import { NextRequest, NextResponse } from "next/server";
import {
  getDailyTimeSeries,
  getIntradayTimeSeries,
  getGlobalQuote,
  generateMockFundamentals,
} from "@/lib/alphaVantage";
import { getCache, setCache, getCacheKey, CACHE_CONFIG, getRemainingTTL } from "@/lib/cache/kv";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, horizon, startDate, endDate } = body;

    if (!ticker) {
      return NextResponse.json(
        { error: "Ticker is required" },
        { status: 400 }
      );
    }

    const tickerSymbol = ticker.toUpperCase();

    // Check cache first (only for standard horizons, not custom date ranges)
    const isCached = horizon !== "Custom";
    let cacheKey = "";
    let cachedData = null;

    if (isCached) {
      cacheKey = getCacheKey("fetch", tickerSymbol, horizon);
      cachedData = await getCache(cacheKey);

      if (cachedData) {
        console.log(`[FETCH API] Cache HIT for ${tickerSymbol} (${horizon})`);
        const ttl = await getRemainingTTL(cacheKey);
        return NextResponse.json({
          ...cachedData,
          _cached: true,
          _cacheTTL: ttl,
        });
      }
      console.log(`[FETCH API] Cache MISS for ${tickerSymbol} (${horizon})`);
    }

    // Fetch data based on horizon
    let priceHistory;
    let currentQuote;

    try {
      console.log(`[FETCH API] Requesting data for ${tickerSymbol} (${horizon})`);
      console.log(`[FETCH API] Alpha Vantage API Key: ${process.env.ALPHA_VANTAGE_API_KEY ? "SET" : "NOT SET"}`);

      // Get current quote
      console.log(`[FETCH API] Getting global quote...`);
      currentQuote = await getGlobalQuote(tickerSymbol);
      console.log(`[FETCH API] Quote received:`, currentQuote);

      // Fetch appropriate time series based on horizon
      if (horizon === "Intraday") {
        console.log(`[FETCH API] Fetching intraday data...`);
        priceHistory = await getIntradayTimeSeries(tickerSymbol);
      } else if (horizon === "Custom" && startDate && endDate) {
        // Custom date range
        console.log(`[FETCH API] Fetching daily data for custom range (${startDate} to ${endDate})...`);
        priceHistory = await getDailyTimeSeries(tickerSymbol);

        // Filter to the custom date range
        priceHistory = priceHistory.filter(
          (p) => p.date >= startDate && p.date <= endDate
        );
        console.log(`[FETCH API] Filtered to ${priceHistory.length} points in custom range`);
      } else {
        // 1-Week and Long-Term both use daily data
        console.log(`[FETCH API] Fetching daily data...`);
        priceHistory = await getDailyTimeSeries(tickerSymbol);

        // Limit to appropriate number of days
        // Important: Keep enough data for SMA50 to calculate (need at least 50 points)
        if (horizon === "1-Week") {
          priceHistory = priceHistory.slice(0, 60); // ~3 months for context
        } else {
          priceHistory = priceHistory.slice(0, 250); // Roughly 1 year of data
        }
      }

      console.log(`[FETCH API] Received ${priceHistory.length} price points`);

      // Reverse to get oldest first for the chart
      priceHistory = priceHistory.reverse();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(`[FETCH API] Error for ${tickerSymbol}:`, errorMessage);
      console.error(`[FETCH API] Full error:`, error);

      // If it's a rate limit error, return 429
      if (errorMessage.includes("rate limit")) {
        console.warn(`[FETCH API] Rate limit hit`);
        return NextResponse.json(
          {
            error: "Alpha Vantage API rate limit exceeded. Please try again in a moment.",
          },
          { status: 429 }
        );
      }

      console.warn(`[FETCH API] Falling back to mock data for ${tickerSymbol}`);

      // Generate ticker-specific mock data (same approach as generateMockFundamentals)
      const hash = tickerSymbol
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

      const basePrice = 100 + (hash % 200); // $100-$300 range
      const volatility = 3 + (hash % 7); // Different volatility per stock (3-10%)

      // Generate 30 days of mock price history
      const mockDays = 30;
      const mockHistory = [];
      for (let i = 0; i < mockDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (mockDays - i));

        // Ticker-specific but realistic variation
        const variation = Math.sin(hash + i * 0.5) * volatility + (Math.random() - 0.5) * 2;
        const price = Math.max(basePrice * 0.9, basePrice + variation); // Prevent extreme lows

        mockHistory.push({
          date: date.toISOString().split('T')[0],
          close: Math.round(price * 100) / 100,
        });
      }

      priceHistory = mockHistory;
      const startPrice = mockHistory[0].close;
      const endPrice = mockHistory[mockHistory.length - 1].close;
      const changePercent = ((endPrice - startPrice) / startPrice) * 100;

      currentQuote = {
        price: endPrice,
        symbol: tickerSymbol,
        volume: 1000000 + (hash % 100000000), // $1M-$100M range
        changePercent: Math.round(changePercent * 100) / 100,
      };
    }

    const data = {
      ticker: tickerSymbol,
      price: currentQuote?.price || 0,
      fundamentals: generateMockFundamentals(tickerSymbol),
      priceHistory: priceHistory.map((p) => ({
        date: p.date,
        close: p.close,
      })),
    };

    // Cache the response (only for standard horizons)
    if (isCached && cacheKey) {
      await setCache(cacheKey, data, CACHE_CONFIG.fetch.ttl);
      console.log(`[FETCH API] Cached ${tickerSymbol} (${horizon}) for ${CACHE_CONFIG.fetch.ttl}s`);
    }

    return NextResponse.json({
      ...data,
      _cached: false,
      _cacheTTL: null,
    });
  } catch (error) {
    console.error("Error in /api/fetch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
