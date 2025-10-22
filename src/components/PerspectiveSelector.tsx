"use client";

import { useState } from "react";
import { AnalysisPerspective, PERSPECTIVE_CONFIGS, getAllPerspectives } from "@/lib/consolePrompts";

interface PerspectiveSelectorProps {
  ticker: string;
  fundamentals: {
    pe: number;
    evEbitda?: number;
    epsGrowth?: number;
    dividendYield?: number;
  };
  technicals: {
    rsi: number;
    sma20: number;
    sma50: number;
    atr: number;
    currentPrice: number;
  };
  priceHistory: Array<{ date: string; close: number }>;
  regimeAnalysis?: { currentRegime: string; volatilityRating: string };
  betaAnalysis?: { currentBeta: number };
  onAnalysisComplete?: (analysis: any) => void;
}

export default function PerspectiveSelector({
  ticker,
  fundamentals,
  technicals,
  priceHistory,
  regimeAnalysis,
  betaAnalysis,
  onAnalysisComplete,
}: PerspectiveSelectorProps) {
  const [selectedPerspective, setSelectedPerspective] = useState<AnalysisPerspective>("bullish");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const perspectives = getAllPerspectives();

  const handlePerspectiveSelect = async (perspective: AnalysisPerspective) => {
    setSelectedPerspective(perspective);
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch("/api/explain-perspective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          perspective,
          fundamentals,
          technicals,
          priceHistory,
          regimeAnalysis,
          betaAnalysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch analysis");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      onAnalysisComplete?.(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("[PerspectiveSelector] Error:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Perspective Buttons */}
      <div className="flex flex-wrap gap-2">
        {perspectives.map((perspective) => {
          const config = PERSPECTIVE_CONFIGS[perspective.id];
          const isActive = selectedPerspective === perspective.id;

          return (
            <button
              key={perspective.id}
              onClick={() => handlePerspectiveSelect(perspective.id)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                isActive
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-lg"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
              title={config.description}
            >
              <span>{config.icon}</span>
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Perspective Description */}
      {selectedPerspective && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold">{PERSPECTIVE_CONFIGS[selectedPerspective].label}:</span>{" "}
            {PERSPECTIVE_CONFIGS[selectedPerspective].description}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              Generating {PERSPECTIVE_CONFIGS[selectedPerspective].label.toLowerCase()}...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Error</p>
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && !loading && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
          {/* If JSON structured response */}
          {analysis.headline ? (
            <>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {analysis.headline}
                </h4>
              </div>

              {analysis.summary && (
                <div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
              )}

              {analysis.bullets && Array.isArray(analysis.bullets) && (
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    Key Points:
                  </p>
                  <ul className="space-y-2">
                    {analysis.bullets.map((bullet: string, idx: number) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                          {idx + 1}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 pt-0.5">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.learningPoint && (
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    💡 Learning Point
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                    {analysis.learningPoint}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* If plain text response */
            <div className="bg-slate-50 dark:bg-slate-700 rounded p-4">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {analysis.content || JSON.stringify(analysis, null, 2)}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            Analysis generated for {ticker} • {selectedPerspective} perspective
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && !error && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            Select a perspective above to generate analysis
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          <span className="font-semibold">ℹ️ Five Perspectives:</span> Choose how you want to analyze{" "}
          {ticker}. Each perspective provides a different lens on the same data:
          <br />• <strong>Bullish</strong> - Growth and upside • <strong>Bearish</strong> - Risks and
          downside • <strong>Risk</strong> - Volatility & protection • <strong>Options</strong> - Strategy
          plays • <strong>Macro</strong> - Global context
        </p>
      </div>
    </div>
  );
}
