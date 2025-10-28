"use client";

import { useState, useRef, useEffect } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { RollingBetaPoint } from "@/lib/macro/betaRegression";

interface BetaChartProps {
  data: RollingBetaPoint[];
  ticker: string;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    payload?: Record<string, any>;
  }>;
}) => {
  if (active && payload && payload.length && payload[0].payload) {
    const date = payload[0].payload.date;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold text-sm">{date}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value !== null ? entry.value.toFixed(3) : "—"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function BetaChart({ data, ticker }: BetaChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isChartReady, setIsChartReady] = useState(false);

  // Ensure container has proper dimensions before rendering chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerDimensions({
          width: rect.width - 32, // Subtract padding (p-4 = 16px each side)
          height: rect.height - 32,
        });
        setIsChartReady(true); // Mark chart as ready after first measurement
      }
    };

    // Use setTimeout to ensure DOM is fully ready
    const timeoutId = setTimeout(updateDimensions, 0);
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">No beta data available</p>
      </div>
    );
  }

  // Check if we have any non-null beta data
  const hasAnyBeta = data.some(
    (point) => point.beta30d !== null || point.beta90d !== null || point.beta250d !== null
  );

  if (!hasAnyBeta) {
    // Calculate how many data points we have and what's needed
    const daysOfData = data.length;
    const minDaysNeeded = daysOfData < 30 ? 30 : daysOfData < 90 ? 90 : 250;
    const isInsufficientData = daysOfData < 30;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Rolling Beta Analysis</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {ticker} market sensitivity over time (β = 1 means moving with S&P 500)
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              ⚠️ Insufficient Data for Beta Analysis
            </p>
            {isInsufficientData ? (
              <>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Beta analysis requires at least 30 days of historical data. Your current dataset has only {daysOfData} {daysOfData === 1 ? "data point" : "data points"}.
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  To see rolling beta:
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc list-inside space-y-1 ml-2">
                  <li>For 30-day beta: Select "1-Week" or longer period (at least 30 days)</li>
                  <li>For 90-day beta: Select "Long-Term" or custom range (at least 90 days)</li>
                  <li>For 250-day beta (most reliable): Use custom date range with 250+ days of history</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Beta data is still loading or calculating for your {daysOfData}-day dataset. Please wait a moment.
                </p>
              </>
            )}
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              {isInsufficientData
                ? "Try selecting a longer time period or entering a custom date range with more historical data."
                : "If the issue persists, try refreshing the analysis."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Rolling Beta Analysis</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {ticker} market sensitivity over time (β = 1 means moving with S&P 500)
        </p>
      </div>

      {/* Beta Classification Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="font-medium">Defensive (β &lt; 0.8)</span>
          <span className="text-slate-500">Moves less than market</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="font-medium">Neutral (0.8 ≤ β ≤ 1.2)</span>
          <span className="text-slate-500">Moves with market</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="font-medium">Aggressive (β &gt; 1.2)</span>
          <span className="text-slate-500">Moves more than market</span>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="w-full bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
        style={{ height: '24rem' }}
      >
        {isChartReady && containerDimensions.width > 0 && containerDimensions.height > 0 ? (
          <ResponsiveContainer width={containerDimensions.width} height={containerDimensions.height}>
            <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#64748b" }}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#64748b" }}
              label={{ value: "Beta (β)", angle: -90, position: "insideLeft" }}
            />

            {/* Reference line at β = 1 (market line) */}
            <ReferenceLine
              y={1}
              stroke="#6b7280"
              strokeDasharray="5 5"
              label={{
                value: "β = 1 (Market)",
                position: "right",
                fill: "#6b7280",
                fontSize: 12,
              }}
            />

            {/* Reference lines for classification boundaries */}
            <ReferenceLine
              y={0.8}
              stroke="#ef4444"
              strokeOpacity={0.2}
              label={{
                value: "Defensive",
                position: "left",
                fill: "#dc2626",
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={1.2}
              stroke="#22c55e"
              strokeOpacity={0.2}
              label={{
                value: "Aggressive",
                position: "left",
                fill: "#16a34a",
                fontSize: 10,
              }}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
            />

            {/* Beta Lines */}
            <Line
              type="monotone"
              dataKey="beta30d"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
              name="30-day β (Short-term)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="beta90d"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={2}
              name="90-day β (Medium-term)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="beta250d"
              stroke="#8b5cf6"
              dot={false}
              strokeWidth={2}
              name="250-day β (Long-term)"
              isAnimationActive={false}
            />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <p>Loading chart...</p>
          </div>
        )}
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          📊 How to Read This Chart:
        </p>
        <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
          <li>
            • <strong>30-day β</strong> (blue): Responsive to recent market movements
          </li>
          <li>
            • <strong>90-day β</strong> (orange): Medium-term market sensitivity
          </li>
          <li>
            • <strong>250-day β</strong> (purple): Long-term systematic risk (most reliable)
          </li>
          <li>
            • <strong>β = 1</strong> (dashed line): Stock moves in-line with S&P 500
          </li>
          <li>
            • <strong>β {'>'} 1</strong>: Stock is more volatile than market (aggressive)
          </li>
          <li>
            • <strong>β {'<'} 1</strong>: Stock is less volatile than market (defensive)
          </li>
        </ul>
      </div>
    </div>
  );
}
