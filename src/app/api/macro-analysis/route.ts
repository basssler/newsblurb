import { NextRequest, NextResponse } from "next/server";
import { analyzeCorrelations, generateMockMacroData } from "@/lib/macro/rollingCorrelations";
import { calculateRollingBetaTimeSeries, generateMockSP500Data } from "@/lib/macro/betaRegression";
import { analyzeRegimes } from "@/lib/macro/regimeDetection";
import { getCache, setCache, getCacheKey, CACHE_CONFIG, getRemainingTTL } from "@/lib/cache/kv";

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

    // Generate mock macro data (in production, would fetch real data from Yahoo Finance, FRED, etc.)
    const macroData = generateMockMacroData(priceHistory);

    // Analyze correlations
    const analysis = analyzeCorrelations(priceHistory, macroData, ticker);

    // Generate mock S&P 500 data for beta analysis
    const sp500Data = generateMockSP500Data(priceHistory);

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
