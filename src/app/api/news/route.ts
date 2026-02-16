/**
 * Market Insights API Endpoint
 * GET /api/news?ticker=AAPL&refresh=1440
 *
 * Returns AI-generated market insights with sentiment and impact analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { getStockNews } from "@/lib/newsAggregator";
import type { NewsResponse } from "@/types/news";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    const refreshStr = searchParams.get("refresh");

    // Validate ticker
    if (!ticker || ticker.length < 1 || ticker.length > 5) {
      return NextResponse.json(
        { error: "Invalid ticker symbol" },
        { status: 400 }
      );
    }

    // Parse refresh interval (minutes), default to 1440 (24 hours)
    let refreshMinutes = 1440;
    if (refreshStr) {
      const parsed = parseInt(refreshStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        refreshMinutes = parsed;
      }
    }

    // Optional: Parse stock data from query params (for AI context)
    const stockData = {
      price: searchParams.get("price") ? parseFloat(searchParams.get("price")!) : undefined,
      rsi: searchParams.get("rsi") ? parseFloat(searchParams.get("rsi")!) : undefined,
      sma20: searchParams.get("sma20") ? parseFloat(searchParams.get("sma20")!) : undefined,
      sma50: searchParams.get("sma50") ? parseFloat(searchParams.get("sma50")!) : undefined,
      atr: searchParams.get("atr") ? parseFloat(searchParams.get("atr")!) : undefined,
      pe: searchParams.get("pe") ? parseFloat(searchParams.get("pe")!) : undefined,
      dividend: searchParams.get("dividend") ? parseFloat(searchParams.get("dividend")!) : undefined,
    };



    // Generate insights
    const result = await getStockNews(ticker.toUpperCase(), refreshMinutes, stockData);

    // Build response
    const response: NewsResponse = {
      ticker: ticker.toUpperCase(),
      articles: result.articles,
      cached: result.fromCache,
      lastUpdatedAt: result.cachedAt,
      cacheExpires: result.expiresAt,
      preferences: {
        defaultCount: 5,
        refreshIntervalMinutes: refreshMinutes,
        sources: ["AI-Generated Analysis"],
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `public, max-age=${refreshMinutes * 60}`,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[INSIGHTS-API] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to generate insights",
        details: errorMessage,
        articles: [], // Return empty array as fallback
      },
      { status: 500 }
    );
  }
}
