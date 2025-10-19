"use client";

import { useState } from "react";
import { CorrelationResult } from "@/lib/macro/rollingCorrelations";

interface CorrelationHeatmapProps {
  correlations: CorrelationResult[];
  ticker: string;
}

/**
 * Map correlation value (-1 to 1) to color
 * Green = positive, Red = negative, White = neutral
 */
function getCorrelationColor(value: number): string {
  if (value > 0.5) return "bg-green-600"; // Strong positive
  if (value > 0.3) return "bg-green-400"; // Moderate positive
  if (value > 0.1) return "bg-green-200"; // Weak positive
  if (value > -0.1) return "bg-slate-100 dark:bg-slate-700"; // Neutral
  if (value > -0.3) return "bg-red-200"; // Weak negative
  if (value > -0.5) return "bg-red-400"; // Moderate negative
  return "bg-red-600"; // Strong negative
}

/**
 * Get text color for readability
 */
function getTextColor(bgColor: string): string {
  if (bgColor.includes("green-600") || bgColor.includes("red-600")) return "text-white";
  if (bgColor.includes("slate")) return "text-slate-900 dark:text-white";
  return "text-slate-900";
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

export default function CorrelationHeatmap({
  correlations,
  ticker,
}: CorrelationHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  // Get unique indicators and windows
  const indicators = Array.from(new Set(correlations.map((c) => c.indicator)));
  const windows = [30, 90, 250] as const;

  // Build matrix: rows = indicators, columns = windows
  const getCorrelation = (indicator: string, window: 30 | 90 | 250) => {
    return correlations.find((c) => c.indicator === indicator && c.window === window);
  };

  const handleMouseEnter = (
    event: React.MouseEvent<HTMLDivElement>,
    correlation: CorrelationResult | undefined
  ) => {
    if (!correlation) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const significanceText = {
      "***": "p < 0.01 (Highly significant)",
      "**": "p < 0.05 (Significant)",
      "*": "p < 0.1 (Moderately significant)",
      ns: "Not statistically significant",
    };

    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      content: (
        <div className="space-y-1">
          <p className="font-semibold">{correlation.indicator}</p>
          <p className="text-sm">
            {correlation.window}-day correlation: <span className="font-mono font-bold">{correlation.correlation.toFixed(3)}</span>
          </p>
          <p className="text-xs">{significanceText[correlation.significance]}</p>
          <p className="text-xs text-slate-400">n = {correlation.sampleSize}</p>
        </div>
      ),
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Macro Correlations</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          How {ticker} price moves correlate with macro indicators across different timeframes
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span>Strong Positive (0.5+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 rounded" />
          <span>Weak Positive (0.1-0.3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600" />
          <span>Neutral (-0.1 to 0.1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 rounded" />
          <span>Weak Negative (-0.1 to -0.3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span>Strong Negative (-0.5)</span>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto">
        <div className="inline-block border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="flex">
            {/* Empty corner */}
            <div className="w-32 h-12 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Indicator</span>
            </div>

            {/* Window headers */}
            {windows.map((window) => (
              <div
                key={window}
                className="w-24 h-12 bg-slate-100 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 flex items-center justify-center"
              >
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {window}d
                </span>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {indicators.map((indicator) => (
            <div key={indicator} className="flex">
              {/* Indicator name */}
              <div className="w-32 bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 flex items-center justify-start px-3 py-3">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                  {indicator}
                </span>
              </div>

              {/* Correlation cells */}
              {windows.map((window) => {
                const corr = getCorrelation(indicator, window);
                const bgColor = corr ? getCorrelationColor(corr.correlation) : "bg-slate-100 dark:bg-slate-800";
                const textColor = getTextColor(bgColor);

                return (
                  <div
                    key={`${indicator}-${window}`}
                    className={`w-24 h-16 border-r border-b border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-75 ${bgColor}`}
                    onMouseEnter={(e) => handleMouseEnter(e, corr)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {corr ? (
                      <div className="text-center">
                        <div className={`text-sm font-bold ${textColor}`}>
                          {corr.correlation.toFixed(2)}
                        </div>
                        <div className={`text-xs ${textColor}`}>{corr.significance}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50 pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 20}px`,
            transform: "translate(-50%, -100%)",
            maxWidth: "200px",
            whiteSpace: "normal",
          }}
        >
          {tooltip.content}
          {/* Tooltip arrow */}
          <div
            className="absolute w-2 h-2 bg-slate-900"
            style={{
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      )}

      {/* Interpretation */}
      {correlations.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">📊 Interpretation: </span>
            Correlations marked with * are statistically significant. Use longer windows (250d) for trend-based relationships, shorter windows (30d) for immediate market dynamics.
          </p>
        </div>
      )}
    </div>
  );
}
