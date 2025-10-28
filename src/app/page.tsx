"use client";

import { useState } from "react";
import AnalysisView from "@/components/AnalysisView";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import ProgressStepper from "@/components/ProgressStepper";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { useProgressiveAnalysis } from "@/hooks/useProgressiveAnalysis";
import { createAnalysisError, parseApiError, AnalysisError } from "@/types/errors";

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
  const [partialAnalysisData, setPartialAnalysisData] = useState<Partial<AnalysisData> | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [useProgressiveLoading, setUseProgressiveLoading] = useState(true);

  const progressiveAnalysis = useProgressiveAnalysis();

  const handleAnalyzeInternal = async (
    analyzeHorizon?: "Intraday" | "1-Week" | "Long-Term" | string,
    startDate?: string,
    endDate?: string
  ) => {
    if (!ticker.trim()) {
      alert("Please enter a ticker symbol");
      return;
    }

    setShowAnalysis(true);
    setError(null);
    setPartialAnalysisData(null);

    // Use provided horizon or fall back to current horizon
    const effectiveHorizon = analyzeHorizon || horizon;

    // Store custom dates if provided
    if (startDate && endDate) {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }

    if (useProgressiveLoading) {
      // Progressive loading mode
      progressiveAnalysis.startAnalysis();
      setLoading(true);

      try {
        // PHASE 1: Fetch fundamental data (critical)
        progressiveAnalysis.updatePhaseProgress('fetching', 25);
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

        if (!fetchRes.ok) {
          const errorData = await fetchRes.json().catch(() => ({}));
          if (fetchRes.status === 404) {
            throw createAnalysisError('INVALID_TICKER', errorData.error || 'Ticker not found', {
              statusCode: 404,
              suggestion: `Check the ticker symbol and try again (e.g., AAPL, MSFT, TSLA)`,
            });
          }
          if (fetchRes.status === 429) {
            throw createAnalysisError('RATE_LIMIT', errorData.error || 'Rate limit reached', {
              statusCode: 429,
              retryAfter: 60,
            });
          }
          throw createAnalysisError('API_ERROR', errorData.error || 'Failed to fetch market data', {
            statusCode: fetchRes.status,
          });
        }
        const fetchData = await fetchRes.json();
        progressiveAnalysis.updatePhaseProgress('fetching', 100);
        progressiveAnalysis.completePhase('fetching');

        // Show price chart immediately
        setPartialAnalysisData({
          priceHistory: fetchData.priceHistory,
          fundamentals: fetchData.fundamentals,
        });

        // PHASE 2: Analyze technical indicators (critical)
        progressiveAnalysis.nextPhase('analyzing');
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceHistory: fetchData.priceHistory,
            ticker,
          }),
        });

        if (!analyzeRes.ok) {
          throw createAnalysisError('API_ERROR', 'Failed to analyze technical indicators', {
            statusCode: analyzeRes.status,
            suggestion: 'Try again with a different time period',
          });
        }
        const technicals = await analyzeRes.json();
        progressiveAnalysis.completePhase('analyzing');

        // Update with technicals (now chart is fully interactive)
        setPartialAnalysisData({
          priceHistory: fetchData.priceHistory,
          fundamentals: fetchData.fundamentals,
          technicals,
        });

        // PHASE 3: Get AI summary (non-blocking)
        progressiveAnalysis.nextPhase('explaining');
        let aiSummary = undefined;
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
          }
        } catch (err) {
          console.warn("AI summary fetch failed:", err);
        }
        progressiveAnalysis.completePhase('explaining');

        // Update with AI summary
        setPartialAnalysisData({
          priceHistory: fetchData.priceHistory,
          fundamentals: fetchData.fundamentals,
          technicals,
          aiSummary,
        });

        // PHASE 4: Fetch macro analysis (non-blocking)
        progressiveAnalysis.nextPhase('macro');
        // Macro analysis is fetched in AnalysisView via useEffect
        progressiveAnalysis.completePhase('macro');

        // Complete analysis and show full data
        setAnalysisData({
          fundamentals: fetchData.fundamentals,
          technicals,
          priceHistory: fetchData.priceHistory,
          aiSummary,
        });
        progressiveAnalysis.completeAnalysis();
        setLastUpdated(new Date());
        setPartialAnalysisData(null); // Clear partial data
      } catch (err) {
        let analysisError: AnalysisError;

        if (err instanceof Error && 'type' in err) {
          analysisError = err as AnalysisError;
        } else if (err instanceof TypeError) {
          analysisError = createAnalysisError('NETWORK', err.message);
        } else {
          analysisError = createAnalysisError('API_ERROR', err instanceof Error ? err.message : 'Unknown error');
        }

        progressiveAnalysis.setPhaseError(progressiveAnalysis.state.currentPhase, analysisError.userMessage);
        setError(analysisError);
        console.error("Analysis error:", analysisError);
      } finally {
        setLoading(false);
      }
    } else {
      // Legacy non-progressive mode (fallback)
      setLoading(true);
      try {
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

        let aiSummary = undefined;
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
          }
        } catch (err) {
          console.warn("AI summary failed:", err);
        }

        setAnalysisData({
          fundamentals: fetchData.fundamentals,
          technicals,
          priceHistory: fetchData.priceHistory,
          aiSummary,
        });
        setLastUpdated(new Date());
      } catch (err) {
        setError(createAnalysisError('API_ERROR', err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
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

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await handleAnalyzeInternal(
        horizon,
        customStartDate || undefined,
        customEndDate || undefined
      );
    } finally {
      setIsRetrying(false);
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
                {/* Primary Input - Autocomplete */}
                <TickerAutocomplete
                  value={ticker}
                  onChange={setTicker}
                  placeholder="Type ticker (e.g., AAPL, MSFT, TSLA)"
                />

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
                <div className="mb-6 card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        {error.type === 'INVALID_TICKER' && '❌ Ticker Not Found'}
                        {error.type === 'RATE_LIMIT' && '⏱️ Rate Limit Reached'}
                        {error.type === 'NETWORK' && '🌐 Connection Error'}
                        {error.type === 'API_ERROR' && '⚠️ Service Error'}
                        {error.type === 'TIMEOUT' && '⏳ Analysis Timeout'}
                        {!['INVALID_TICKER', 'RATE_LIMIT', 'NETWORK', 'API_ERROR', 'TIMEOUT'].includes(error.type) && '❌ Error'}
                      </h3>
                      <p className="text-red-800 dark:text-red-200 mb-2">{error.userMessage}</p>
                      {error.suggestion && (
                        <p className="text-sm text-red-700 dark:text-red-300">💡 {error.suggestion}</p>
                      )}
                    </div>
                    {error.retryable && (
                      <button
                        onClick={handleRetry}
                        disabled={isRetrying || loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        {isRetrying ? '🔄 Retrying...' : '🔄 Retry'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loading && useProgressiveLoading ? (
                // Show progress stepper with progressive updates
                <div className="space-y-6">
                  <ProgressStepper state={progressiveAnalysis.state} ticker={ticker} />

                  {/* Show partial data as it becomes available */}
                  {partialAnalysisData && partialAnalysisData.priceHistory && partialAnalysisData.technicals && (
                    <div className="mt-8">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        📊 Loading analysis details below...
                      </p>
                      <AnalysisView
                        ticker={ticker}
                        horizon={horizon}
                        data={partialAnalysisData as AnalysisData}
                        onRefresh={handleRefresh}
                        isRefreshing={loading}
                        lastUpdated={lastUpdated}
                        autoRefreshEnabled={autoRefreshEnabled}
                        onToggleAutoRefresh={setAutoRefreshEnabled}
                        onPeriodChange={handlePeriodChange}
                      />
                    </div>
                  )}
                </div>
              ) : loading ? (
                // Fallback for legacy mode
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
