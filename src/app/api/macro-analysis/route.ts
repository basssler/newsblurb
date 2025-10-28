import { NextRequest, NextResponse } from "next/server";
import { analyzeCorrelations, generateMockMacroData } from "@/lib/macro/rollingCorrelations";
import { calculateRollingBetaTimeSeries, generateMockSP500Data } from "@/lib/macro/betaRegression";
import { analyzeRegimes } from "@/lib/macro/regimeDetection";
import { getCache, setCache, getCacheKey, CACHE_CONFIG, getRemainingTTL } from "@/lib/cache/kv";
import {
  fetchRealMacroData,
  convertRealMacroToLegacyFormat,
  fetchHistoricalMacroData,
  fetchHistoricalMacroDataFromYahoo,
  fetchHistoricalSP500Data,
  fetchHistoricalMacroDataAlphaVantage,
} from "@/lib/realMacroData";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceHistory, ticker } = body;

    if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length === 0) {
      return NextResponse.json(
        { error: "priceHistory is required and must be non-empty" },
        { status: 400 }
      );
    }

    if (!ticker) {
      return NextResponse.json(
        { error: "ticker is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey("macro", ticker);
    const cachedAnalysis = await getCache(cacheKey);

    if (cachedAnalysis) {
      console.log(`[MACRO-ANALYSIS] Cache HIT for ${ticker}`);
      const ttl = await getRemainingTTL(cacheKey);
      return NextResponse.json({
        ...cachedAnalysis,
        _cached: true,
        _cacheTTL: ttl,
      });
    }

    console.log(`[MACRO-ANALYSIS] Cache MISS for ${ticker}`);
    console.log(`[MACRO-ANALYSIS] Analyzing correlations for ${ticker} with ${priceHistory.length} price points`);

    // Fetch current macro data for context
    console.log(`[MACRO-ANALYSIS] Fetching current macro data...`);
    const realMacroData = await fetchRealMacroData();

    // Log real data status
    console.log(`[MACRO-ANALYSIS] Real macro data fetched:`, {
      dxy: realMacroData.dxy.value,
      vix: realMacroData.vix.value,
      yield10y: realMacroData.yield10y.value,
      oil: realMacroData.oil.value,
      gold: realMacroData.gold.value,
      sp500: realMacroData.sp500.value,
      allSuccess: realMacroData.allSuccess,
    });

    // Fetch historical macro data for correlation analysis
    console.log(`[MACRO-ANALYSIS] Fetching historical macro data...`);

    // Try Alpha Vantage + Twelve Data (most reliable with real commodity data)
    let historicalMacroData = await fetchHistoricalMacroDataAlphaVantage();
    let dataSource = "Alpha Vantage (S&P 500) + Twelve Data (Commodities)";

    // If Alpha Vantage fails, try Yahoo Finance
    if (!historicalMacroData || historicalMacroData.length === 0) {
      console.warn(`[MACRO-ANALYSIS] Alpha Vantage failed, trying Yahoo Finance...`);
      historicalMacroData = await fetchHistoricalMacroDataFromYahoo();
      dataSource = "Yahoo Finance";
    }

    // If Yahoo fails, try FRED
    if (!historicalMacroData || historicalMacroData.length === 0) {
      console.warn(`[MACRO-ANALYSIS] Yahoo Finance failed, trying FRED...`);
      historicalMacroData = await fetchHistoricalMacroData();
      dataSource = "FRED API";
    }

    // If we don't have enough historical data, fall back to mock data
    if (!historicalMacroData || historicalMacroData.length === 0) {
      console.warn(`[MACRO-ANALYSIS] No real data available, using mock data for demonstration`);
      historicalMacroData = generateMockMacroData(priceHistory);
      dataSource = "Mock (Demo)";
    }

    console.log(`[MACRO-ANALYSIS] Using ${dataSource} data with ${historicalMacroData.length} indicators`);

    // Calculate correlations with historical macro data
    const correlationAnalysis = analyzeCorrelations(priceHistory, historicalMacroData, ticker);

    const analysis = {
      ticker,
      analysisDate: correlationAnalysis.analysisDate,
      correlations: correlationAnalysis.correlations,
      interpretation: `${correlationAnalysis.interpretation} (Data source: ${dataSource})`,
    };

    // Fetch real S&P 500 data for beta analysis
    console.log(`[MACRO-ANALYSIS] Fetching S&P 500 data for beta calculation...`);
    const startDate = priceHistory[0].date; // Format: YYYY-MM-DD from stock data
    const endDate = priceHistory[priceHistory.length - 1].date;

    let sp500DataRaw = await fetchHistoricalSP500Data(startDate, endDate);

    // Convert { value } to { close } format and fall back to mock if needed
    let sp500Data: Array<{ date: string; close: number }>;
    if (!sp500DataRaw || sp500DataRaw.length === 0) {
      console.warn(`[MACRO-ANALYSIS] Failed to fetch real S&P 500 data, using mock data for beta calculation`);
      sp500Data = generateMockSP500Data(priceHistory);
    } else {
      console.log(`[MACRO-ANALYSIS] Using real S&P 500 data (${sp500DataRaw.length} points) for beta calculation`);
      // Convert value property to close property
      sp500Data = sp500DataRaw.map(d => ({ date: d.date, close: d.value }));
    }

    // Calculate rolling beta time series
    const rollingBeta = calculateRollingBetaTimeSeries(priceHistory, sp500Data);

    // Analyze market regimes
    const regimeAnalysis = analyzeRegimes(priceHistory);

    console.log(`[MACRO-ANALYSIS] Found ${analysis.correlations.length} correlation measurements, ${rollingBeta.length} beta points, and regime: ${regimeAnalysis.currentRegime}`);

    const result = {
      ...analysis,
      rollingBeta,
      regimeAnalysis,
    };

    // Cache the analysis (24 hour TTL for macro data)
    await setCache(cacheKey, result, CACHE_CONFIG.macro.ttl);
    console.log(`[MACRO-ANALYSIS] Cached analysis for ${ticker} for ${CACHE_CONFIG.macro.ttl}s`);

    return NextResponse.json({
      ...result,
      _cached: false,
      _cacheTTL: null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[MACRO-ANALYSIS] Error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to analyze correlations", details: errorMessage },
      { status: 500 }
    );
  }
}
