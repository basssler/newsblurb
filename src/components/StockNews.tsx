"use client";

import React, { useState, useEffect } from "react";
import type { NewsArticle } from "@/types/news";
import { formatLastUpdatedTimestamp } from "@/lib/formatLastUpdated";

interface StockNewsProps {
  ticker: string;
  maxArticles?: number;
}

export function StockNews({ ticker, maxArticles = 3 }: StockNewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [cached, setCached] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/news?ticker=${ticker}&refresh=1440`,
          {
            signal: AbortSignal.timeout(20000),
          }
        );

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        setArticles(
          (data.articles || []).slice(0, maxArticles)
        );
        setCached(Boolean(data.cached));
        setLastUpdatedAt(data.lastUpdatedAt);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[StockNews] Error loading news: ${msg}`);
        setError("Failed to load news articles");
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, [ticker, maxArticles]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-200 dark:bg-slate-700 h-24 rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
        <p className="text-slate-600 dark:text-slate-400">
          Unable to generate market insights at this time. Please try again later.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Last updated: {formatLastUpdatedTimestamp(lastUpdatedAt)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Freshness indicator (server-provided) */}
      <div className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-between gap-3">
        <span>
          Last updated: {formatLastUpdatedTimestamp(lastUpdatedAt)}
        </span>
        {cached && (
          <span className="font-medium">Cached</span>
        )}
      </div>

      {/* Article list */}
      {articles.map((article) => (
        <article
          key={article.id}
          className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors hover:shadow-md dark:hover:shadow-lg"
        >
          {/* Header with metadata */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              {/* Title */}
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline line-clamp-2"
                >
                  {article.title}
                </a>
              ) : (
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {article.title}
                </p>
              )}

              {/* Source and date */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {article.source}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  •
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {formatDate(article.publishedAt)}
                </span>
              </div>
            </div>

            {/* Relevance badge */}
            <div className="flex-shrink-0">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-sm ${getRelevanceColor(article.relevanceScore)}`}
              >
                {article.relevanceScore}
              </div>
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-3">
            {article.summary}
          </p>

          {/* Tags: Sentiment and Impact */}
          <div className="flex gap-2 items-center">
            {article.sentiment && (
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getSentimentColor(article.sentiment)}`}
              >
                {article.sentiment.charAt(0).toUpperCase() +
                  article.sentiment.slice(1)}
              </span>
            )}
            {article.impact && (
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getImpactColor(article.impact)}`}
              >
                {article.impact === "high" && "🔴"}
                {article.impact === "medium" && "🟡"}
                {article.impact === "low" && "🟢"}
                {article.impact.charAt(0).toUpperCase() +
                  article.impact.slice(1)}{" "}
                Impact
              </span>
            )}
          </div>

          {/* Read more link (only if URL exists) */}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline mt-3"
            >
              Read full article →
            </a>
          )}
        </article>
      ))}

      {/* Footer */}
      <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2">
        Showing {articles.length} of {articles.length} articles
        <span className="ml-2">
          {articles.length > 0 && "Powered by Claude AI"}
        </span>
      </div>
    </div>
  );
}

/**
 * Helper functions
 */

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRelevanceColor(
  score: number
): string {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
  if (score >= 60) return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
  if (score >= 40) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
}

function getSentimentColor(
  sentiment: "positive" | "negative" | "neutral"
): string {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    case "negative":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    case "neutral":
    default:
      return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
  }
}

function getImpactColor(
  impact: "high" | "medium" | "low"
): string {
  switch (impact) {
    case "high":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    case "medium":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    case "low":
    default:
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
  }
}
