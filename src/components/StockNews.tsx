"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mermaid from "./Mermaid"; // Assuming Mermaid component is created
import type { NewsArticle } from "@/types/news";

interface StockNewsProps {
  ticker: string;
  maxArticles?: number;
}

export function StockNews({ ticker, maxArticles = 3 }: StockNewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [cached, setCached] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        setCached(data.cached);

        // Auto-expand the first item if specific analysis exists
        if (data.articles?.length > 0 && data.articles[0].analysis) {
          setExpandedId(data.articles[0].id);
        }

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-200 dark:bg-slate-700 h-32 rounded-lg"
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
      <div className="p-6 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-slate-600 dark:text-slate-400">
          Unable to generate market insights at this time. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cache indicator */}
      {cached && (
        <div className="flex justify-end">
          <div className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Cached results • 24h freshness
          </div>
        </div>
      )}

      {/* Article list */}
      <div className="grid gap-6">
        {articles.map((article) => {
          const isExpanded = expandedId === article.id;
          const hasAnalysis = !!article.analysis;

          return (
            <article
              key={article.id}
              className={`
                group relative
                bg-white dark:bg-slate-900 
                border rounded-xl transition-all duration-300
                ${isExpanded ? 'shadow-lg ring-1 ring-blue-500/20' : 'hover:shadow-md'}
                ${getBorderColor(article.sentiment)}
              `}
            >
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${getAccentColor(article.sentiment)}`}></div>

              <div className="p-5 pl-7">
                {/* Header with metadata */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    {/* Title */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getSentimentBadgeColor(article.sentiment)}`}>
                        {article.sentiment || 'NEUTRAL'}
                      </span>
                      {article.impact === 'high' && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 uppercase tracking-wider">
                          HIGH IMPACT
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {article.url ? (
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {article.title}
                        </a>
                      ) : (
                        article.title
                      )}
                    </h3>

                    {/* Source and date */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Relevance Score */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg p-2 min-w-[60px]">
                    <span className={`text-lg font-bold ${getScoreColor(article.relevanceScore)}`}>
                      {article.relevanceScore}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Score</span>
                  </div>
                </div>

                {/* Summary / Content */}
                <div className="mt-4">
                  {isExpanded && hasAnalysis ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:text-slate-600 dark:prose-li:text-slate-300">
                      {/* Mermaid Diagram */}
                      {article.diagram && (
                        <div className="my-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Visual Analysis</h4>
                          <Mermaid chart={article.diagram} />
                        </div>
                      )}

                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {article.analysis || article.summary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {article.summary}
                    </p>
                  )}
                </div>

                {/* Expand/Collapse Action */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  {hasAnalysis ? (
                    <button
                      onClick={() => toggleExpand(article.id)}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? 'Show Less' : 'Read Deep Dive'}
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No detailed analysis available</span>
                  )}

                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      Original Source
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
        AI Analysis generated by Claude 3.5 Sonnet • Accurate as of {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getBorderColor(sentiment?: string): string {
  switch (sentiment) {
    case "positive": return "border-green-200 dark:border-green-900/30";
    case "negative": return "border-red-200 dark:border-red-900/30";
    default: return "border-slate-200 dark:border-slate-700";
  }
}

function getAccentColor(sentiment?: string): string {
  switch (sentiment) {
    case "positive": return "bg-green-500";
    case "negative": return "bg-red-500";
    default: return "bg-slate-400";
  }
}

function getSentimentBadgeColor(sentiment?: string): string {
  switch (sentiment) {
    case "positive": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "negative": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
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
