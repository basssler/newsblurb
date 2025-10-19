"use client";

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
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">No beta data available</p>
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
      <div className="w-full h-96 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <ResponsiveContainer width="100%" height="100%">
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
