"use client";

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

interface MacroInsightsProps {
  macroContext: MacroContext;
}

export default function MacroInsights({ macroContext }: MacroInsightsProps) {
  if (!macroContext || (!macroContext.dxy && !macroContext.vix)) {
    return null;
  }

  const indicators = [
    {
      label: "Dollar Index (DXY)",
      value: macroContext.dxy,
      format: (v: number) => `${v.toFixed(2)}`,
      color: "blue",
      description: "USD strength vs basket of currencies",
    },
    {
      label: "VIX (Fear Index)",
      value: macroContext.vix,
      format: (v: number) => `${v.toFixed(1)}`,
      color: macroContext.vix && macroContext.vix > 20 ? "red" : "green",
      description: "Market volatility and risk appetite",
    },
    {
      label: "10Y Treasury Yield",
      value: macroContext.yield10y,
      format: (v: number) => `${v.toFixed(2)}%`,
      color: "purple",
      description: "Discount rate for equity valuations",
    },
    {
      label: "Oil Price",
      value: macroContext.oil,
      format: (v: number) => `$${v.toFixed(2)}`,
      color: "orange",
      description: "Commodity and inflation indicator",
    },
    {
      label: "Gold Price",
      value: macroContext.gold,
      format: (v: number) => `$${v.toFixed(0)}`,
      color: "yellow",
      description: "Safe-haven and inflation hedge",
    },
    {
      label: "S&P 500",
      value: macroContext.sp500,
      format: (v: number) => `${v.toFixed(0)}`,
      color: "indigo",
      description: "Broad market index",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400",
  };

  return (
    <div className="space-y-6">
      {/* Macro Indicators Grid */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
          🌍 Macro Market Indicators
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {indicators.map((indicator) => {
            if (indicator.value === null || indicator.value === undefined)
              return null;

            const color = colorMap[indicator.color] || colorMap.blue;

            return (
              <div
                key={indicator.label}
                className={`border rounded-xl p-4 ${color}`}
              >
                <p className="text-xs font-medium opacity-75 mb-1">
                  {indicator.label}
                </p>
                <p className="text-lg font-bold">
                  {indicator.format(indicator.value)}
                </p>
                <p className="text-xs opacity-60 mt-2">{indicator.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Correlation Analysis */}
      {macroContext.correlationSummary && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">
            🔗 Correlation Analysis
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {macroContext.correlationSummary}
          </p>
        </div>
      )}

      {/* Trade Ideas */}
      {macroContext.tradeIdeas && macroContext.tradeIdeas.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-3 uppercase tracking-wider">
            💡 Macro-Informed Trade Ideas
          </h4>
          <ul className="space-y-2">
            {macroContext.tradeIdeas.map((idea, idx) => (
              <li
                key={idx}
                className="flex gap-3 text-sm text-blue-900 dark:text-blue-100"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-2">ℹ️ About Macro Analysis:</p>
        <p className="leading-relaxed">
          Stock prices are influenced not only by company fundamentals but also by
          broader macro conditions: interest rates, currency strength, commodity prices,
          and market volatility. This analysis identifies how global factors may impact
          this specific stock.
        </p>
      </div>
    </div>
  );
}
