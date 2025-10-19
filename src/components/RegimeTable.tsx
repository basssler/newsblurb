"use client";

import { RegimeAnalysis, MarketRegime } from "@/lib/macro/regimeDetection";

interface RegimeTableProps {
  analysis: RegimeAnalysis;
  ticker: string;
}

export default function RegimeTable({ analysis, ticker }: RegimeTableProps) {
  const { currentRegime, historicalPerformance, regimeIndicators, actionItems } = analysis;

  const regimeColors: Record<MarketRegime, { bg: string; text: string; badge: string }> = {
    "risk-on": {
      bg: "bg-green-50 dark:bg-green-900/10",
      text: "text-green-900 dark:text-green-100",
      badge: "bg-green-500",
    },
    "risk-off": {
      bg: "bg-red-50 dark:bg-red-900/10",
      text: "text-red-900 dark:text-red-100",
      badge: "bg-red-500",
    },
    neutral: {
      bg: "bg-yellow-50 dark:bg-yellow-900/10",
      text: "text-yellow-900 dark:text-yellow-100",
      badge: "bg-yellow-500",
    },
  };

  const currentColor = regimeColors[currentRegime];

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return "📈";
    if (trend === "down") return "📉";
    return "➡️";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Market Regime Analysis</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Current market environment and {ticker} performance in different regimes
        </p>
      </div>

      {/* Current Regime Badge */}
      <div className={`rounded-lg p-4 border border-slate-200 dark:border-slate-700 ${currentColor.bg}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-4 h-4 rounded-full ${currentColor.badge}`} />
          <h4 className={`text-lg font-bold ${currentColor.text}`}>
            Current Regime: {currentRegime.toUpperCase()}
          </h4>
        </div>
        <p className={`text-sm ${currentColor.text}`}>
          {analysis.interpretation}
        </p>
      </div>

      {/* Regime Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">VIX</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {regimeIndicators.vix ? regimeIndicators.vix.toFixed(1) : "N/A"}
            </p>
            <p className="text-lg mb-0.5">
              {getTrendIcon(regimeIndicators.vixTrend)}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Volatility</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">S&P 500 Trend</p>
          <div className="flex items-center gap-1">
            <p className="text-3xl">
              {getTrendIcon(regimeIndicators.sp500Trend)}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {regimeIndicators.sp500Trend}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">20-day trend</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">DXY</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {regimeIndicators.dxy ? regimeIndicators.dxy.toFixed(2) : "N/A"}
            </p>
            <p className="text-lg mb-0.5">
              {getTrendIcon(regimeIndicators.dxyTrend)}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Dollar Index</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">10Y Yield</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {regimeIndicators.yield10y
                ? regimeIndicators.yield10y.toFixed(2)
                : "N/A"}
              %
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Treasury</p>
        </div>
      </div>

      {/* Performance Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-3 font-semibold text-slate-900 dark:text-white">
                Regime
              </th>
              <th className="text-right py-3 px-3 font-semibold text-slate-900 dark:text-white">
                Avg Return/Day
              </th>
              <th className="text-right py-3 px-3 font-semibold text-slate-900 dark:text-white">
                Win Rate
              </th>
              <th className="text-right py-3 px-3 font-semibold text-slate-900 dark:text-white">
                Volatility
              </th>
              <th className="text-right py-3 px-3 font-semibold text-slate-900 dark:text-white">
                Sharpe Ratio
              </th>
              <th className="text-right py-3 px-3 font-semibold text-slate-900 dark:text-white">
                Occurrence
              </th>
            </tr>
          </thead>
          <tbody>
            {["risk-on", "risk-off", "neutral"].map((regime) => {
              const perf = historicalPerformance[regime as MarketRegime];
              const isCurrentRegime = regime === currentRegime;
              const color = regimeColors[regime as MarketRegime];

              return (
                <tr
                  key={regime}
                  className={`border-b border-slate-200 dark:border-slate-700 ${
                    isCurrentRegime ? color.bg : ""
                  }`}
                >
                  <td className={`py-3 px-3 font-semibold ${isCurrentRegime ? color.text : ""}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${color.badge}`}
                      />
                      <span>{regime.charAt(0).toUpperCase() + regime.slice(1)}</span>
                      {isCurrentRegime && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Current</span>}
                    </div>
                  </td>
                  <td className={`text-right py-3 px-3 font-mono ${
                    isCurrentRegime ? color.text : ""
                  }`}>
                    <span
                      className={
                        perf.avgReturn > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {(perf.avgReturn * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className={`text-right py-3 px-3 font-mono ${
                    isCurrentRegime ? color.text : ""
                  }`}>
                    {perf.winRate.toFixed(1)}%
                  </td>
                  <td className={`text-right py-3 px-3 font-mono ${
                    isCurrentRegime ? color.text : ""
                  }`}>
                    {(perf.volatility * 100).toFixed(2)}%
                  </td>
                  <td className={`text-right py-3 px-3 font-mono ${
                    isCurrentRegime ? color.text : ""
                  }`}>
                    {perf.sharpeRatio.toFixed(3)}
                  </td>
                  <td className={`text-right py-3 px-3 font-mono ${
                    isCurrentRegime ? color.text : ""
                  }`}>
                    {perf.occurrencePercentage.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Recommended Actions
          </p>
          <ul className="space-y-1">
            {actionItems.map((item, idx) => (
              <li key={idx} className="text-sm text-blue-900 dark:text-blue-100">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interpretation */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
        <p className="font-semibold text-slate-900 dark:text-white">📊 How to Read This:</p>
        <ul className="space-y-1 text-slate-700 dark:text-slate-300">
          <li>
            • <strong>Risk-On:</strong> Low VIX (&lt;15), rising markets, weak USD. Best for
            growth/momentum stocks
          </li>
          <li>
            • <strong>Risk-Off:</strong> High VIX (&gt;25), falling markets, strong USD.
            Favors defensive stocks
          </li>
          <li>
            • <strong>Avg Return/Day:</strong> Average daily return in this regime
          </li>
          <li>
            • <strong>Win Rate:</strong> % of up days vs down days
          </li>
          <li>
            • <strong>Sharpe Ratio:</strong> Risk-adjusted returns (higher = better)
          </li>
        </ul>
      </div>
    </div>
  );
}
