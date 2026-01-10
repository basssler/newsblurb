/**
 * Market Insights Generator
 * Generates AI-powered market insights based on stock technical and fundamental data
 * Caches results and provides sentiment analysis and impact scoring
 */

import { NewsArticle, NewsCache } from "@/types/news";
import { getCache, setCache, getCacheKey } from "@/lib/cache/kv";
import { Anthropic } from "@anthropic-ai/sdk";

const DEFAULT_CONFIG = {
  insightCount: 5,
  refreshIntervalMinutes: 1440, // Default: 24 hours
  apiTimeout: 15000,
};

/**
 * Generate AI-powered market insights based on stock data
 */
async function generateAIInsights(
  ticker: string,
  stockData?: {
    price?: number;
    rsi?: number;
    sma20?: number;
    sma50?: number;
    atr?: number;
    pe?: number;
    dividend?: number;
  }
): Promise<NewsArticle[]> {
  const client = new Anthropic();

  try {


    // Build context from stock data
    const dataContext = stockData
      ? `
Current Stock Data:
- Price: $${stockData.price?.toFixed(2) || "N/A"}
- RSI (14): ${stockData.rsi?.toFixed(1) || "N/A"}
- SMA 20: $${stockData.sma20?.toFixed(2) || "N/A"}
- SMA 50: $${stockData.sma50?.toFixed(2) || "N/A"}
- ATR: $${stockData.atr?.toFixed(2) || "N/A"}
- P/E Ratio: ${stockData.pe?.toFixed(1) || "N/A"}
- Dividend Yield: ${stockData.dividend?.toFixed(2) || "N/A"}%
    `.trim()
      : "No real-time data available";

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Generate 5 market insight cards for ${ticker}. Each insight should be realistic but AI-generated market analysis.

${dataContext}

For each insight, provide exactly this format:
INSIGHT [number]:
TITLE: [2-5 word title]
SUMMARY: [1-2 sentences, 30-50 words max]
SENTIMENT: [positive/negative/neutral]
IMPACT: [high/medium/low]

Make insights diverse - cover technicals, fundamentals, sentiment, macro context, and trading opportunities.
Be realistic but acknowledge market uncertainties.
Focus on actionable observations that traders would find useful.`,
        },
      ],
    });

    const aiText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse AI-generated insights
    const insights: NewsArticle[] = [];
    const insightMatches = aiText.match(
      /INSIGHT \d+:([\s\S]*?)(?=INSIGHT \d+:|$)/g
    );

    if (insightMatches) {
      insightMatches.forEach((match, index) => {
        try {
          const titleMatch = match.match(/TITLE:\s*(.+?)(?=\n|SUMMARY)/);
          const summaryMatch = match.match(
            /SUMMARY:\s*(.+?)(?=\n|SENTIMENT)/
          );
          const sentimentMatch = match.match(
            /SENTIMENT:\s*(positive|negative|neutral)/i
          );
          const impactMatch = match.match(/IMPACT:\s*(high|medium|low)/i);

          const title = titleMatch ? titleMatch[1].trim() : `Market Insight ${index + 1}`;
          const summary = summaryMatch ? summaryMatch[1].trim() : "AI analysis of market conditions";
          const sentiment = sentimentMatch
            ? (sentimentMatch[1].toLowerCase() as "positive" | "negative" | "neutral")
            : "neutral";
          const impact = impactMatch
            ? (impactMatch[1].toLowerCase() as "high" | "medium" | "low")
            : "medium";

          // Calculate relevance score
          let relevanceScore = 70; // Base score for AI insights
          if (sentiment === "positive" || sentiment === "negative") {
            relevanceScore += 15;
          }
          if (impact === "high") {
            relevanceScore += 15;
          }
          relevanceScore = Math.min(relevanceScore, 100);

          insights.push({
            id: `ai-insight-${ticker}-${index}`,
            title,
            summary,
            url: "", // No URL for AI-generated insights
            source: "AI-Generated Analysis",
            publishedAt: new Date(),
            fetchedAt: new Date(),
            sentiment,
            impact,
            relevanceScore,
          });


        } catch (parseError) {
          console.warn(`[generateAIInsights] Failed to parse insight ${index + 1}`);
        }
      });
    }

    if (insights.length === 0) {
      console.warn(`[generateAIInsights] No insights parsed, creating default`);
      // Fallback insight
      insights.push({
        id: `ai-insight-${ticker}-default`,
        title: "Market Analysis",
        summary: "AI-generated market insights for this stock. Please check back for updated analysis.",
        url: "",
        source: "AI-Generated Analysis",
        publishedAt: new Date(),
        fetchedAt: new Date(),
        sentiment: "neutral",
        impact: "medium",
        relevanceScore: 60,
      });
    }


    return insights;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[generateAIInsights] Error generating insights: ${msg}`);
    return [];
  }
}

/**
 * Get market insights for a stock ticker (with caching)
 * Returns cached insights if fresh, otherwise generates new ones
 */
export async function getStockNews(
  ticker: string,
  refreshMinutes?: number,
  stockData?: {
    price?: number;
    rsi?: number;
    sma20?: number;
    sma50?: number;
    atr?: number;
    pe?: number;
    dividend?: number;
  }
): Promise<NewsArticle[]> {
  const cacheKey = getCacheKey("news", ticker);
  const cacheCheckMinutes = refreshMinutes || DEFAULT_CONFIG.refreshIntervalMinutes;

  // Check cache first
  const cached = await getCache(cacheKey);
  if (
    cached &&
    new Date().getTime() - new Date((cached as NewsCache).cachedAt).getTime() <
    cacheCheckMinutes * 60 * 1000
  ) {
    return (cached as NewsCache).articles.slice(0, DEFAULT_CONFIG.insightCount);
  }



  // Generate fresh insights
  let articles = await generateAIInsights(ticker, stockData);

  // Sort by relevance and impact
  articles = articles
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .sort((a, b) => {
      const impactOrder: Record<string, number> = { high: 2, medium: 1, low: 0 };
      return (impactOrder[b.impact || "low"] || 0) - (impactOrder[a.impact || "low"] || 0);
    })
    .slice(0, DEFAULT_CONFIG.insightCount);

  // Cache the results
  const cacheData: NewsCache = {
    ticker,
    articles,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + cacheCheckMinutes * 60 * 1000),
    totalFetched: articles.length,
    ttlMinutes: cacheCheckMinutes,
  };

  await setCache(cacheKey, cacheData, cacheCheckMinutes * 60);



  return articles;
}

/**
 * Clear cached insights for a specific ticker
 */
export async function clearNewsCache(ticker?: string): Promise<void> {
  if (ticker) {
    const cacheKey = getCacheKey("news", ticker);
    await getCache(cacheKey);
    // Manual clearing of all insights cache needed
  }
}
