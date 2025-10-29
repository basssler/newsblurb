"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSharedAnalysis } from "@/hooks/useSharedAnalysis";
import { isShareExpired, formatShareTime, getShareLink } from "@/types/shares";
import ChartView from "@/components/ChartView";

export default function SharedAnalysisPage() {
  const params = useParams();
  const shareId = params.id as string;
  const { getShare } = useSharedAnalysis();
  const [mounted, setMounted] = useState(false);
  const [share, setShare] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Fetch the shared analysis
    const fetchedShare = getShare(shareId);

    if (!fetchedShare) {
      setError("Share not found or has expired");
      setLoading(false);
      return;
    }

    setShare(fetchedShare);
    setLoading(false);
  }, [mounted, shareId, getShare]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-blue-500 hover:text-blue-600 font-medium mb-6 inline-flex items-center gap-2">
            ← Back to Analysis
          </Link>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">Share Not Found</h1>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <Link href="/" className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
              Create New Analysis
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = share.data;
  const fundamentals = data.fundamentals || {
    pe: 0,
    evEbitda: 0,
    epsGrowth: 0,
    dividendYield: 0,
  };
  const technicals = data.technicals || {
    rsi: 0,
    sma20: 0,
    sma50: 0,
    atr: 0,
    currentPrice: 0,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-500 hover:text-blue-600 font-medium">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">📊 Shared Analysis</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Share Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                {data.ticker} Analysis - {data.horizon}
              </h2>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                Shared {formatShareTime(new Date(share.createdAt))} • {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Expires: {new Date(share.expiresAt).toLocaleDateString()} • Share ID: {share.id}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Current Price: <span className="font-bold text-lg text-blue-900 dark:text-blue-100">${technicals.currentPrice.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">Price Chart</h3>
            {data.priceHistory && data.priceHistory.length > 0 ? (
              <ChartView
                data={data.priceHistory}
                ticker={data.ticker}
                atrValue={technicals.atr}
                horizon={data.horizon}
              />
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">No chart data available</p>
            )}
          </div>

          {/* Fundamentals */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">Fundamental Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "P/E Ratio", value: fundamentals.pe.toFixed(1) },
                { label: "EV/EBITDA", value: fundamentals.evEbitda.toFixed(1) },
                { label: "EPS Growth", value: fundamentals.epsGrowth.toFixed(1) + "%" },
                { label: "Dividend Yield", value: fundamentals.dividendYield.toFixed(2) + "%" },
              ].map((metric) => (
                <div key={metric.label} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{metric.label}</p>
                  <p className="text-lg font-bold text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Technicals */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-foreground mb-4">Technical Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "RSI", value: technicals.rsi.toFixed(1) },
                { label: "SMA 20", value: `$${technicals.sma20.toFixed(2)}` },
                { label: "SMA 50", value: `$${technicals.sma50.toFixed(2)}` },
                { label: "ATR", value: `$${technicals.atr.toFixed(2)}` },
                { label: "Price", value: `$${technicals.currentPrice.toFixed(2)}` },
              ].map((metric) => (
                <div key={metric.label} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{metric.label}</p>
                  <p className="text-lg font-bold text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          {data.aiSummary && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">AI Analysis</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-foreground mb-1">{data.aiSummary.headline}</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{data.aiSummary.summary}</p>
                </div>

                {data.aiSummary.bullets.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {data.aiSummary.bullets.map((bullet: string, idx: number) => (
                        <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                          <span className="text-blue-500">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.aiSummary.learningPoint && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                    <p className="text-xs text-amber-900 dark:text-amber-100">
                      <strong>💡 Learning Point:</strong> {data.aiSummary.learningPoint}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            This shared analysis will expire on {new Date(share.expiresAt).toLocaleDateString()}.
            <br />
            <Link href="/" className="text-blue-500 hover:text-blue-600 font-medium">
              Create your own analysis →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
