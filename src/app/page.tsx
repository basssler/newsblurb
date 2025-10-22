"use client";

import { useState } from "react";
import AnalysisView from "@/components/AnalysisView";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

interface AnalysisData {
  fundamentals: {
    pe: number;
    evEbitda: number;
    epsGrowth: number;
    dividendYield: number;
  };
  technicals: {
    rsi: number;
    sma20: number;
    sma50: number;
    atr: number;
    currentPrice: number;
  };
  priceHistory: Array<{ date: string; close: number }>;
  aiSummary?: {
    headline: string;
    summary: string;
    bullets: string[];
    learningPoint: string;
  };
}

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [horizon, setHorizon] = useState<"Intraday" | "1-Week" | "Long-Term">(
    "1-Week"
  );
  const [newsBlurb, setNewsBlurb] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const handleAnalyzeInternal = async (
    analyzeHorizon?: "Intraday" | "1-Week" | "Long-Term" | string,
    startDate?: string,
    endDate?: string
  ) => {
    if (!ticker.trim()) {
      alert("Please enter a ticker symbol");
      return;
    }

    setLoading(true);
    setError("");
    setShowAnalysis(true);

    // Use provided horizon or fall back to current horizon
    const effectiveHorizon = analyzeHorizon || horizon;

    // Store custom dates if provided
    if (startDate && endDate) {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }

    try {
      // Fetch fundamental data
      const fetchRes = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          horizon: effectiveHorizon,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      if (!fetchRes.ok) throw new Error("Failed to fetch data");
      const fetchData = await fetchRes.json();

      // Analyze technical indicators
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceHistory: fetchData.priceHistory,
          ticker,
        }),
      });

      if (!analyzeRes.ok) throw new Error("Failed to analyze data");
      const technicals = await analyzeRes.json();

      // Get AI summary with retry logic
      let aiSummary = undefined;
      let explainAttempts = 0;
      const maxAttempts = 2;

      while (explainAttempts < maxAttempts && !aiSummary) {
        try {
          const explainRes = await fetch("/api/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker,
              fundamentals: fetchData.fundamentals,
              technicals,
              priceHistory: fetchData.priceHistory,
            }),
          });

          if (explainRes.ok) {
            aiSummary = await explainRes.json();
          } else {
            console.warn(
              `AI summary fetch failed (attempt ${explainAttempts + 1}):`,
              explainRes.status
            );
          }
        } catch (err) {
          console.warn(
            `AI summary fetch error (attempt ${explainAttempts + 1}):`,
            err
          );
        }

        explainAttempts++;

        // Add small delay before retry
        if (explainAttempts < maxAttempts && !aiSummary) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setAnalysisData({
        fundamentals: fetchData.fundamentals,
        technicals,
        priceHistory: fetchData.priceHistory,
        aiSummary,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during analysis"
      );
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Wrapper functions to handle event-based callbacks
  const handleRefresh = async () => {
    // Re-use current horizon and custom dates
    await handleAnalyzeInternal(
      horizon,
      customStartDate || undefined,
      customEndDate || undefined
    );
  };

  const handlePeriodChange = (
    newHorizon: string,
    startDate?: string,
    endDate?: string
  ) => {
    // Update parent horizon state to reflect the new period
    if (newHorizon !== "Custom") {
      setHorizon(newHorizon as "Intraday" | "1-Week" | "Long-Term");
    }
    handleAnalyzeInternal(newHorizon, startDate, endDate);
  };

  const handleInitialAnalyze = async () => {
    // Check if custom dates are set and valid
    if (showCustomDatePicker && customStartDate && customEndDate) {
      await handleAnalyzeInternal("Custom", customStartDate, customEndDate);
    } else {
      await handleAnalyzeInternal(horizon);
    }
  };

  // Setup auto-refresh hook
  useAutoRefresh({
    isEnabled: autoRefreshEnabled && showAnalysis,
    interval: 30 * 60 * 1000, // 30 minutes
    onRefresh: handleRefresh,
  });

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-5 dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative">
        {!showAnalysis ? (
          // Welcome/Search Screen
          <div className="min-h-screen flex flex-col items-center justify-center px-4">
            {/* Header */}
            <div className="text-center mb-12 max-w-2xl">
              <div className="mb-6">
                <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
                  NewsBlurb
                </h1>
                <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full" />
              </div>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                AI-powered stock analysis. Understand any stock in seconds.
              </p>
            </div>

            {/* Search Card */}
            <div className="w-full max-w-2xl card p-8 md:p-10 shadow-xl">
              <div className="space-y-6">
                {/* Primary Input */}
                <div>
                  <label className="text-label mb-3 block">
                    Search Stock
                  </label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="Type ticker (e.g., AAPL, MSFT, TSLA)"
                    className="input-base w-full text-lg"
                  />
                </div>

                {/* Time Horizon */}
                <div>
                  <label className="text-label mb-3 block">
                    Analysis Period
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {["Intraday", "1-Week", "Long-Term", "Custom"].map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          if (h === "Custom") {
                            // Enable custom date picker
                            setShowCustomDatePicker(true);
                            setHorizon("1-Week"); // Reset to default for date selection
                          } else {
                            setHorizon(h as "Intraday" | "1-Week" | "Long-Term");
                            setShowCustomDatePicker(false);
                            setCustomStartDate(null);
                            setCustomEndDate(null);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                          (h !== "Custom" && horizon === h)
                            ? "bg-blue-500 text-white shadow-md"
                            : (h === "Custom" && showCustomDatePicker)
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                {showCustomDatePicker && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Custom Date Range
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate || ""}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate || ""}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCustomStartDate(null);
                        setCustomEndDate(null);
                        setShowCustomDatePicker(false);
                        setHorizon("1-Week");
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear custom dates
                    </button>
                  </div>
                )}

                {/* Optional News Blurb */}
                <div>
                  <label className="text-label mb-3 block">
                    News Context <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={newsBlurb}
                    onChange={(e) => setNewsBlurb(e.target.value)}
                    placeholder="Paste news snippet for additional context..."
                    className="input-base w-full resize-none"
                    rows={3}
                  />
                </div>

                {/* Analyze Button */}
                <button
                  onClick={handleInitialAnalyze}
                  disabled={loading}
                  className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    "Analyze Stock"
                  )}
                </button>
              </div>
            </div>

            {/* Footer hint */}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-8">
              ✨ Powered by AI analysis • Real-time data • Technical + Fundamental
            </p>
          </div>
        ) : (
          // Analysis Screen
          <div className="min-h-screen">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
              <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowAnalysis(false)}
                    className="text-blue-500 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
                  >
                    ← Back
                  </button>
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                  <h2 className="text-2xl font-bold text-foreground">{ticker}</h2>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
              {error && (
                <div className="mb-6 card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-4">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="card p-12 text-center">
                  <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Analyzing your stock...</p>
                </div>
              ) : analysisData ? (
                <AnalysisView
                  ticker={ticker}
                  horizon={horizon}
                  data={analysisData}
                  onRefresh={handleRefresh}
                  isRefreshing={loading}
                  lastUpdated={lastUpdated}
                  autoRefreshEnabled={autoRefreshEnabled}
                  onToggleAutoRefresh={setAutoRefreshEnabled}
                  onPeriodChange={handlePeriodChange}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
