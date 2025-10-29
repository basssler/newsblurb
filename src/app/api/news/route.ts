/**
 * News API Endpoint
 * GET /api/news?ticker=AAPL&refresh=1440
 *
 * Returns stock-specific news articles with AI-generated summaries and relevance scores
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

    console.log(
      `[NEWS-API] Fetching news for ${ticker.toUpperCase()} (refresh: ${refreshMinutes}min)`
    );

    // Fetch articles
    const articles = await getStockNews(ticker.toUpperCase(), refreshMinutes);

    // Build response
    const response: NewsResponse = {
      ticker: ticker.toUpperCase(),
      articles,
      cached: articles.length > 0 && refreshMinutes < 60, // Simple heuristic
      cacheExpires: new Date(Date.now() + refreshMinutes * 60 * 1000),
      preferences: {
        defaultCount: 3,
        refreshIntervalMinutes: refreshMinutes,
        sources: [
          "finance.yahoo.com",
          "reuters.com",
          "bloomberg.com",
          "cnbc.com",
        ],
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
    console.error("[NEWS-API] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to fetch news",
        details: errorMessage,
        articles: [], // Return empty array as fallback
      },
      { status: 500 }
    );
  }
}
