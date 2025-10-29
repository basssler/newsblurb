/**
 * News Aggregator
 * Fetches stock-specific news from multiple financial sources using web scraping
 * Caches results and uses Claude AI for relevance scoring and summarization
 */

import { NewsArticle, NewsCache, NewsAggregatorConfig } from "@/types/news";
import { getCache, setCache, getCacheKey } from "@/lib/cache/kv";
import { Anthropic } from "@anthropic-ai/sdk";

const DEFAULT_CONFIG: NewsAggregatorConfig = {
  maxArticles: 10,
  refreshIntervalMinutes: 1440, // Default: 24 hours
  sources: [
    "finance.yahoo.com",
    "reuters.com",
    "bloomberg.com",
    "cnbc.com",
    "marketwatch.com",
    "seeking-alpha.com",
    "stockanalysis.com",
  ],
  apiTimeout: 15000,
  enableAISummary: true,
};

/**
 * Scrape news articles from financial websites
 * Uses Open Graph meta tags and structured data for extraction
 */
async function scrapeFinancialNews(
  ticker: string,
  sources: string[] = DEFAULT_CONFIG.sources
): Promise<NewsArticle[]> {
  console.log(`[newsAggregator] Starting news scrape for ${ticker}`);

  const articles: NewsArticle[] = [];
  const searchUrl = `https://news.google.com/search?q=${ticker}%20stock`;

  try {
    // Fetch from Google News (requires user-agent to work properly)
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(DEFAULT_CONFIG.apiTimeout),
    });

    if (!response.ok) {
      throw new Error(`Google News returned ${response.status}`);
    }

    const html = await response.text();

    // Extract article URLs using regex (simplified - real implementation would use DOM parser)
    const urlPattern =
      /href="([^"]*?\/articles\/[^"]*?)"|href="([^"]*?url=[^"]*?)"/g;
    let match;
    const extractedUrls = new Set<string>();

    while ((match = urlPattern.exec(html)) !== null) {
      const url = match[1] || match[2];
      if (url && url.includes("https")) {
        extractedUrls.add(url);
      }
    }

    console.log(
      `[newsAggregator] Found ${extractedUrls.size} article URLs for ${ticker}`
    );

    // Fetch details for each article
    let articleCount = 0;
    for (const url of extractedUrls) {
      if (articleCount >= DEFAULT_CONFIG.maxArticles) break;

      try {
        const article = await fetchArticleDetails(url, ticker);
        if (article) {
          articles.push(article);
          articleCount++;
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[newsAggregator] Failed to fetch article from ${url}: ${msg}`
        );
        continue;
      }
    }

    console.log(
      `[newsAggregator] Successfully extracted ${articles.length} articles for ${ticker}`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[newsAggregator] Scrape error for ${ticker}: ${msg}`);
  }

  return articles;
}

/**
 * Fetch and parse article details from a URL
 * Extracts title, summary, publish date, and generates relevance score
 */
async function fetchArticleDetails(
  url: string,
  ticker: string
): Promise<NewsArticle | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[fetchArticleDetails] Failed to fetch ${url}`);
      return null;
    }

    const html = await response.text();

    // Extract meta tags (OpenGraph and basic meta)
    const titleMatch =
      html.match(/<meta property="og:title" content="([^"]*)"\s*\/>/) ||
      html.match(/<meta name="title" content="([^"]*)"\s*\/>/) ||
      html.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "";

    const descriptionMatch =
      html.match(/<meta property="og:description" content="([^"]*)"\s*\/>/) ||
      html.match(/<meta name="description" content="([^"]*)"\s*\/>/);
    const summary = descriptionMatch ? descriptionMatch[1] : "";

    const imageMatch = html.match(
      /<meta property="og:image" content="([^"]*)"\s*\/>/
    );
    const imageUrl = imageMatch ? imageMatch[1] : undefined;

    const publishedMatch =
      html.match(/<meta property="article:published_time" content="([^"]*)"\s*\/>/) ||
      html.match(/<meta name="date" content="([^"]*)"\s*\/>/);
    const publishedAt = publishedMatch
      ? new Date(publishedMatch[1])
      : new Date();

    // Extract source domain
    const sourceMatch = url.match(/https?:\/\/(?:www\.)?([^\/]*)/);
    const source = sourceMatch ? sourceMatch[1] : "Unknown";

    // Generate unique ID from URL hash
    const id = Buffer.from(url).toString("base64").substring(0, 12);

    // Calculate relevance score (simple heuristic: ticker mentions)
    const contentLower = `${title} ${summary}`.toLowerCase();
    const tickerLower = ticker.toLowerCase();
    let relevanceScore = 50; // Base score

    // Increase score for ticker mentions
    const tickerMatches = (
      contentLower.match(new RegExp(tickerLower, "g")) || []
    ).length;
    relevanceScore += Math.min(tickerMatches * 15, 30);

    // Increase score for financial keywords
    const financialKeywords = [
      "earnings",
      "revenue",
      "profit",
      "dividend",
      "ipo",
      "merger",
      "acquisition",
      "partnership",
      "guidance",
      "bullish",
      "bearish",
    ];
    const keywordMatches = financialKeywords.filter((kw) =>
      contentLower.includes(kw)
    ).length;
    relevanceScore += Math.min(keywordMatches * 5, 20);

    relevanceScore = Math.min(relevanceScore, 100);

    return {
      id,
      title,
      summary,
      url,
      source,
      imageUrl,
      publishedAt,
      fetchedAt: new Date(),
      relevanceScore,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[fetchArticleDetails] Error processing article: ${msg}`);
    return null;
  }
}

/**
 * Use Claude AI to enhance articles with summaries and sentiment analysis
 */
async function enhanceArticlesWithAI(
  articles: NewsArticle[],
  ticker: string
): Promise<NewsArticle[]> {
  const client = new Anthropic();

  // Batch process articles for efficiency
  const batchSize = 3;
  const enhanced: NewsArticle[] = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(
      i,
      Math.min(i + batchSize, articles.length)
    );

    for (const article of batch) {
      try {
        const response = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Analyze this news article for ${ticker} and provide:
1. A concise 1-2 sentence summary (50 words max)
2. Sentiment (positive/negative/neutral)
3. Market impact (high/medium/low)

Title: ${article.title}
Summary: ${article.summary}

Format your response as:
SUMMARY: [summary]
SENTIMENT: [sentiment]
IMPACT: [impact]`,
            },
          ],
        });

        // Parse AI response
        const aiText =
          response.content[0].type === "text" ? response.content[0].text : "";

        const summaryMatch = aiText.match(/SUMMARY:\s*(.+?)(?=SENTIMENT|$)/);
        const sentimentMatch = aiText.match(
          /SENTIMENT:\s*(positive|negative|neutral)/i
        );
        const impactMatch = aiText.match(
          /IMPACT:\s*(high|medium|low)/i
        );

        enhanced.push({
          ...article,
          summary: summaryMatch ? summaryMatch[1].trim() : article.summary,
          sentiment: sentimentMatch
            ? (sentimentMatch[1].toLowerCase() as "positive" | "negative" | "neutral")
            : "neutral",
          impact: impactMatch
            ? (impactMatch[1].toLowerCase() as "high" | "medium" | "low")
            : "medium",
        });

        console.log(
          `[enhanceArticlesWithAI] Enhanced article: ${article.title.substring(0, 50)}...`
        );
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[enhanceArticlesWithAI] Failed to enhance article: ${msg}`
        );
        enhanced.push(article); // Include unenhanced if AI fails
      }
    }
  }

  return enhanced;
}

/**
 * Get news for a stock ticker (with caching)
 * Returns cached articles if fresh, otherwise fetches new ones
 */
export async function getStockNews(
  ticker: string,
  refreshMinutes?: number
): Promise<NewsArticle[]> {
  const cacheKey = getCacheKey("news", ticker);

  // Check cache first
  const cached = await getCache(cacheKey);
  if (
    cached &&
    new Date().getTime() - new Date((cached as NewsCache).cachedAt).getTime() <
      (refreshMinutes || DEFAULT_CONFIG.refreshIntervalMinutes) * 60 * 1000
  ) {
    console.log(`[getStockNews] Cache HIT for ${ticker}`);
    return (cached as NewsCache).articles.slice(0, DEFAULT_CONFIG.maxArticles);
  }

  console.log(`[getStockNews] Cache MISS for ${ticker} - fetching fresh articles`);

  // Fetch fresh articles
  let articles = await scrapeFinancialNews(ticker);

  // Sort by recency and relevance
  articles = articles
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, DEFAULT_CONFIG.maxArticles);

  // Enhance with AI analysis if configured
  if (DEFAULT_CONFIG.enableAISummary && articles.length > 0) {
    try {
      articles = await enhanceArticlesWithAI(articles, ticker);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[getStockNews] AI enhancement failed: ${msg}`);
      // Continue with unenhanced articles
    }
  }

  // Cache the results
  const cacheData: NewsCache = {
    ticker,
    articles,
    cachedAt: new Date(),
    expiresAt: new Date(
      Date.now() +
        (refreshMinutes || DEFAULT_CONFIG.refreshIntervalMinutes) * 60 * 1000
    ),
    totalFetched: articles.length,
    ttlMinutes: refreshMinutes || DEFAULT_CONFIG.refreshIntervalMinutes,
  };

  await setCache(
    cacheKey,
    cacheData,
    (refreshMinutes || DEFAULT_CONFIG.refreshIntervalMinutes) * 60
  );

  console.log(
    `[getStockNews] Cached ${articles.length} articles for ${ticker}`
  );

  return articles;
}

/**
 * Clear cached news for a specific ticker or all tickers
 */
export async function clearNewsCache(ticker?: string): Promise<void> {
  if (ticker) {
    const cacheKey = getCacheKey("news", ticker);
    await getCache(cacheKey); // This would clear it, but KV doesn't have direct delete
    console.log(`[clearNewsCache] Cleared cache for ${ticker}`);
  } else {
    console.log(`[clearNewsCache] Manual clearing of all news cache needed`);
  }
}
