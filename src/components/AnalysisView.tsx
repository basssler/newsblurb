"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ChartView from "./ChartView";
import MacroInsights from "./MacroInsights";
import CorrelationHeatmap from "./CorrelationHeatmap";
import BetaChart from "./BetaChart";
import RegimeTable from "./RegimeTable";
import MacroEventCalendar from "./MacroEventCalendar";
import PerspectiveSelector from "./PerspectiveSelector";
import { useFavorites } from "@/hooks/useFavorites";
import { CorrelationAnalysis } from "@/lib/macro/rollingCorrelations";
import { RollingBetaPoint } from "@/lib/macro/betaRegression";
import { RegimeAnalysis } from "@/lib/macro/regimeDetection";

interface MacroContext {
  dxy: number | null;
  gold: number | null;
  oil: number | null;
  sp500: number | null;
  vix: number | null;
  yield10y: number | null;
  correlationSummary: string;
  tradeIdeas: string[];
}

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
  macroContext?: MacroContext;
}

interface AnalysisViewProps {
  ticker: string;
  horizon: "Intraday" | "1-Week" | "Long-Term";
  data?: AnalysisData;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: (enabled: boolean) => void;
  onPeriodChange?: (horizon: string, startDate?: string, endDate?: string) => void;
}

export default function AnalysisView({
  ticker,
  horizon,
  data,
  onRefresh,
  isRefreshing = false,
  lastUpdated = null,
  autoRefreshEnabled = false,
  onToggleAutoRefresh,
  onPeriodChange,
}: AnalysisViewProps) {
  const { data: session } = useSession();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<"fundamentals" | "technicals" | "charts" | "macro" | "summary">("charts");
  const [correlationAnalysis, setCorrelationAnalysis] = useState<CorrelationAnalysis | null>(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);

  const isInWatchlist = isFavorite(ticker);

  const handleToggleWatchlist = () => {
    if (!session) {
      alert("Please sign in to save favorites");
      return;
    }
    if (isInWatchlist) {
      removeFavorite(ticker);
    } else {
      addFavorite(ticker);
    }
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const fundamentals = data?.fundamentals || {
    pe: 0,
    evEbitda: 0,
    epsGrowth: 0,
    dividendYield: 0,
  };

  const technicals = data?.technicals || {
    rsi: 0,
    sma20: 0,
    sma50: 0,
    atr: 0,
    currentPrice: 0,
  };

  const priceHistory = data?.priceHistory || [];
  const aiSummary = data?.aiSummary;

  // Fetch correlation analysis when data changes
  useEffect(() => {
    if (!priceHistory || priceHistory.length === 0 || !ticker) {
      return;
    }

    const fetchCorrelations = async () => {
      setCorrelationLoading(true);
      try {
        const response = await fetch("/api/macro-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceHistory,
            ticker,
          }),
        });

        if (response.ok) {
          const analysis = await response.json();
          setCorrelationAnalysis(analysis);
        }
      } catch (error) {
        console.error("[AnalysisView] Failed to fetch correlations:", error);
      } finally {
        setCorrelationLoading(false);
      }
    };

    fetchCorrelations();
  }, [priceHistory, ticker]);

  return (
    <div className="space-y-6">
      {/* Refresh Controls */}
      {onRefresh && (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Last updated: <span className="font-medium text-foreground">{formatLastUpdated(lastUpdated)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => onToggleAutoRefresh?.(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Auto-refresh (30 min)
              </span>
            </label>
            <button
              onClick={handleToggleWatchlist}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 ${
                isInWatchlist
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
              title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isInWatchlist ? "⭐" : "☆"} {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
            >
              {isRefreshing ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Refreshing...
                </span>
              ) : (
                "↻ Refresh"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Charts (Primary) */}
      <div className="card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Price Chart</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Zoom, pan, and analyze price movement with technical indicators
              </p>
            </div>
          </div>

          {priceHistory && priceHistory.length > 0 ? (
            <ChartView
              data={priceHistory}
              ticker={ticker}
              atrValue={technicals.atr}
              horizon={horizon}
              onPeriodChange={onPeriodChange}
            />
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">No price data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Tabs */}
      <div className="card overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700 flex bg-slate-50 dark:bg-slate-800/50">
          {[
            { id: "fundamentals", label: "Fundamentals" },
            { id: "technicals", label: "Technicals" },
            { id: "charts", label: "Charts" },
            { id: "macro", label: "Macro Analysis" },
            { id: "summary", label: "AI Summary" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-4 font-medium text-center transition-all relative ${
                activeTab === tab.id
                  ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Fundamentals Tab */}
          {activeTab === "fundamentals" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Fundamental Metrics</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Key financial ratios and growth indicators</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "P/E Ratio", value: fundamentals.pe.toFixed(1) },
                  { label: "EV/EBITDA", value: fundamentals.evEbitda.toFixed(1) },
                  { label: "EPS Growth", value: fundamentals.epsGrowth.toFixed(1) + "%" },
                  { label: "Dividend Yield", value: fundamentals.dividendYield.toFixed(2) + "%" },
                ].map((metric) => (
                  <div key={metric.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{metric.label}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technicals Tab */}
          {activeTab === "technicals" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Technical Indicators</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Short-term price action and momentum signals ({horizon})</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "RSI (14)", value: technicals.rsi.toFixed(0) },
                  { label: "SMA 20", value: "$" + technicals.sma20.toFixed(2) },
                  { label: "SMA 50", value: "$" + technicals.sma50.toFixed(2) },
                  { label: "ATR", value: technicals.atr.toFixed(2) },
                ].map((metric) => (
                  <div key={metric.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{metric.label}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Tab */}
          {activeTab === "charts" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Chart Details</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Scroll to the top to interact with the main chart. Use the tools below to customize the view.
                </p>
              </div>
              {priceHistory && priceHistory.length > 0 ? (
                <ChartView data={priceHistory} ticker={ticker} atrValue={technicals.atr} horizon={horizon} onPeriodChange={onPeriodChange} />
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">No price data available</p>
                </div>
              )}
            </div>
          )}

          {/* Macro Analysis Tab */}
          {activeTab === "macro" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Macro Correlations</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">How {ticker} correlates with major economic indicators</p>
              </div>

              {correlationLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">Calculating correlations...</p>
                  </div>
                </div>
              ) : correlationAnalysis ? (
                <div className="space-y-6">
                  <CorrelationHeatmap
                    correlations={correlationAnalysis.correlations}
                    ticker={ticker}
                  />

                  {/* Interpretation */}
                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-5">
                    <p className="text-sm text-sky-900 dark:text-sky-100">
                      <span className="font-semibold">📊 What This Means: </span>
                      {correlationAnalysis.interpretation}
                    </p>
                  </div>

                  {/* Macro Event Calendar */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <MacroEventCalendar daysAhead={60} maxEvents={8} />
                  </div>

                  {/* Beta Chart */}
                  {(correlationAnalysis as any).rollingBeta && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <BetaChart data={(correlationAnalysis as any).rollingBeta} ticker={ticker} />
                    </div>
                  )}

                  {/* Regime Analysis */}
                  {(correlationAnalysis as any).regimeAnalysis && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <RegimeTable analysis={(correlationAnalysis as any).regimeAnalysis} ticker={ticker} />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">How to Read This:</p>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <li>• <strong>Green cells</strong> = Stock and indicator move in the same direction</li>
                        <li>• <strong>Red cells</strong> = Stock and indicator move in opposite directions</li>
                        <li>• <strong>Dark colors</strong> = Stronger relationship (larger correlation)</li>
                        <li>• <strong>Significance markers</strong> (*, **, ***) = Statistical confidence level</li>
                        <li>• <strong>30d, 90d, 250d</strong> = Time windows (short, medium, long-term)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">Unable to calculate correlations</p>
                </div>
              )}
            </div>
          )}

          {/* AI Summary Tab */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">AI-Powered Analysis</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Intelligent summary powered by Claude AI - Choose your perspective</p>
              </div>

              {/* Multi-Perspective Selector */}
              {priceHistory && priceHistory.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <PerspectiveSelector
                    ticker={ticker}
                    fundamentals={fundamentals}
                    technicals={technicals}
                    priceHistory={priceHistory}
                    regimeAnalysis={(correlationAnalysis as any)?.regimeAnalysis}
                    betaAnalysis={(correlationAnalysis as any)?.rollingBeta?.length > 0 ? { currentBeta: 1.0 } : undefined}
                  />
                </div>
              )}

              {/* Default AI Summary */}
              {aiSummary ? (
                <div className="space-y-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">Default Analysis</h4>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Headline</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{aiSummary.headline}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Overview</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {aiSummary.summary}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Key Points</p>
                    <ul className="space-y-2">
                      {aiSummary.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                            {idx + 1}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 pt-0.5">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl p-5">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">💡 Key Takeaway</p>
                    <p className="text-slate-700 dark:text-slate-300 italic">"{aiSummary.learningPoint}"</p>
                  </div>

                  {/* Macro Insights Section */}
                  {data?.macroContext && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <MacroInsights macroContext={data.macroContext} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">⚠️ AI Summary Unavailable</p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">The AI-powered analysis could not be generated. This may be due to:</p>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc list-inside space-y-1 mt-2">
                      <li>ANTHROPIC_API_KEY not configured in .env.local</li>
                      <li>API rate limit exceeded</li>
                      <li>Temporary API service issue</li>
                    </ul>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                      The fundamental and technical data above is still available for analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
