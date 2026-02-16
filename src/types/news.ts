/**
 * News Article Types
 * Defines structure for stock-specific news articles
 */

export interface NewsArticle {
  id: string; // Unique identifier (hash of URL or timestamp-based)
  title: string;
  summary: string; // Claude AI-generated summary
  content?: string; // Optional full article content
  url: string;
  source: string; // News source (Bloomberg, Reuters, etc.)
  imageUrl?: string; // Featured image if available
  publishedAt: Date;
  fetchedAt: Date; // When this article was fetched/cached
  relevanceScore: number; // 0-100: How relevant to the stock
  sentiment?: "positive" | "negative" | "neutral"; // AI-determined sentiment
  impact?: "high" | "medium" | "low"; // Estimated market impact
  tags?: string[]; // Auto-extracted topics
}

export interface NewsCache {
  ticker: string;
  articles: NewsArticle[];
  cachedAt: Date;
  expiresAt: Date;
  totalFetched: number;
  ttlMinutes: number;
}

export interface NewsPreferences {
  defaultCount: number; // 3 for free, 5-10 for premium
  refreshIntervalMinutes: number; // 1440 (1 day), 360 (6h), 60 (1h), 1 (live)
  sources: string[]; // Preferred news sources
  includeAnalyst?: boolean; // Include analyst notes
  includePressReleases?: boolean; // Include company press releases
  minRelevanceScore?: number; // Only include articles above threshold
}

export interface NewsResponse {
  ticker: string;
  articles: NewsArticle[];
  /**
   * True if this response was served from cache (vs freshly generated).
   * Note: serialized over JSON, so Date fields arrive as strings in the browser.
   */
  cached: boolean;
  /** Server-side timestamp for when the cached/generated insights were last updated. */
  lastUpdatedAt?: Date;
  cacheExpires: Date;
  preferences: NewsPreferences;
}

export interface NewsAggregatorConfig {
  maxArticles: number;
  refreshIntervalMinutes: number;
  sources: string[];
  apiTimeout: number; // ms
  enableAISummary: boolean;
}
