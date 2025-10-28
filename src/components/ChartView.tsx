"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  enhancePriceData,
  calculateSupportLevels,
  calculateResistanceLevels,
  calculateMeanReversionZones,
} from "@/lib/technicalIndicators";

interface ChartViewProps {
  data: Array<{ date: string; close: number }>;
  ticker: string;
  atrValue: number;
  horizon: "Intraday" | "1-Week" | "Long-Term";
  onPeriodChange?: (horizon: string, startDate?: string, endDate?: string) => void;
}

export default function ChartView({
  data,
  ticker,
  atrValue,
  horizon,
  onPeriodChange,
}: ChartViewProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [showSupportResistance, setShowSupportResistance] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isChartReady, setIsChartReady] = useState(false);

  // Period selector state
  const [selectedPeriod, setSelectedPeriod] = useState<string>(horizon);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isApplyingPeriod, setIsApplyingPeriod] = useState(false);

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

  // Get min and max dates from data
  const minDate = data.length > 0 ? data[0].date : "";
  const maxDate = data.length > 0 ? data[data.length - 1].date : "";

  const handlePeriodChange = () => {
    if (selectedPeriod === "Custom") {
      if (!customStartDate || !customEndDate) {
        alert("Please select both start and end dates");
        return;
      }
      if (customStartDate >= customEndDate) {
        alert("End date must be after start date");
        return;
      }
    }
    setIsApplyingPeriod(true);
    onPeriodChange?.(
      selectedPeriod,
      selectedPeriod === "Custom" ? customStartDate : undefined,
      selectedPeriod === "Custom" ? customEndDate : undefined
    );
    setIsApplyingPeriod(false);
  };

  // Enhance data with technical indicators
  const enhancedData = useMemo(() => {
    const enhanced = enhancePriceData(data, atrValue);
    console.log("[ChartView] Enhance data samples:", enhanced.slice(-3));
    return enhanced;
  }, [data, atrValue]);

  // Calculate support and resistance levels
  const prices = useMemo(() => data.map((d) => d.close), [data]);
  const supportLevels = useMemo(() => {
    const levels = calculateSupportLevels(prices, 5);
    console.log("[ChartView] Support levels:", levels);
    return levels;
  }, [prices]);
  const resistanceLevels = useMemo(() => {
    const levels = calculateResistanceLevels(prices, 5);
    console.log("[ChartView] Resistance levels:", levels);
    return levels;
  }, [prices]);

  // Calculate mean reversion zones for long-term view
  const meanReversionZones = useMemo(
    () => calculateMeanReversionZones(prices, horizon === "Long-Term" ? 50 : 20),
    [prices, horizon]
  );

  // Custom tooltip with detailed information
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      dataKey: string;
      color: string;
      payload?: Record<string, unknown>;
    }>;
  }) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload as Record<string, unknown>;
      const dateStr = String(data.date);
      const closeVal = Number(data.close);
      const sma20Val = data.sma20 ? Number(data.sma20) : null;
      const sma50Val = data.sma50 ? Number(data.sma50) : null;
      const bbUpperVal = data.bbUpper ? Number(data.bbUpper) : null;
      const bbLowerVal = data.bbLower ? Number(data.bbLower) : null;

      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold text-sm">{dateStr}</p>
          <p className="text-blue-400 text-sm">
            Close: ${closeVal.toFixed(2)}
          </p>
          {sma20Val && (
            <p className="text-orange-400 text-xs">
              SMA20: ${sma20Val.toFixed(2)}
            </p>
          )}
          {sma50Val && (
            <p className="text-purple-400 text-xs">
              SMA50: ${sma50Val.toFixed(2)}
            </p>
          )}
          {bbUpperVal && (
            <p className="text-red-400 text-xs">
              BB Upper: ${bbUpperVal.toFixed(2)}
            </p>
          )}
          {bbLowerVal && (
            <p className="text-green-400 text-xs">
              BB Lower: ${bbLowerVal.toFixed(2)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Check if data is limited (fewer than 20 data points)
  const isLimitedData = data.length < 20;

  return (
    <div className="space-y-6">
      {/* Limited Data Warning */}
      {isLimitedData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Limited Data ({data.length} days)</p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              Support and resistance levels are calculated based on limited price data. Results may be less reliable than with larger date ranges.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Period Selector */}
      {onPeriodChange && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider">
              Analysis Period
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              Select a predefined period or choose custom dates
            </p>
          </div>

          {/* Period Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {["Intraday", "1-Week", "Long-Term", "Custom"].map((period) => (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period);
                  if (period !== "Custom") {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }
                }}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                  selectedPeriod === period
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-slate-700"
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {selectedPeriod === "Custom" && (
            <div className="space-y-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-slate-700">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Available range: {minDate} to {maxDate}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={customStartDate}
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
                    min={minDate}
                    max={maxDate}
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Apply Button */}
          {(selectedPeriod !== "Custom" && selectedPeriod !== horizon) || (selectedPeriod === "Custom" && (customStartDate || customEndDate)) ? (
            <button
              onClick={handlePeriodChange}
              disabled={isApplyingPeriod}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isApplyingPeriod ? "Applying..." : "Apply Period Change"}
            </button>
          ) : null}
        </div>
      )}

      {/* Chart Controls */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Chart Tools
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Toggle technical indicators to visualize
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { checked: showSMA20, onChange: setShowSMA20, label: "SMA 20" },
            { checked: showSMA50, onChange: setShowSMA50, label: "SMA 50" },
            { checked: showBollingerBands, onChange: setShowBollingerBands, label: "Bollinger Bands" },
            { checked: showSupportResistance, onChange: setShowSupportResistance, label: "Support/Resistance" },
          ].map((item) => (
            <label key={item.label} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                disabled={isLimitedData && (item.label === "Bollinger Bands" || item.label === "Support/Resistance")}
              />
              <span className={`text-sm font-medium ${
                isLimitedData && (item.label === "Bollinger Bands" || item.label === "Support/Resistance")
                  ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
              }`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {/* Indicator Limitations */}
        {isLimitedData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Indicator Limitations:</p>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Bollinger Bands</strong> need 20+ days of data (you have {data.length} days)</li>
              <li>• <strong>Support/Resistance</strong> levels are unreliable with limited historical data</li>
            </ul>
          </div>
        )}
      </div>

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
        style={{ height: '24rem' }}
      >
        {isChartReady && containerDimensions.width > 0 && containerDimensions.height > 0 ? (
          <ResponsiveContainer width={Math.max(containerDimensions.width, 300)} height={Math.max(containerDimensions.height, 300)}>
            <ComposedChart data={enhancedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "12px" }} />
            <YAxis stroke="#64748b" style={{ fontSize: "12px" }} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />

            {/* Price line */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              name="Close Price"
            />

            {/* SMA 20 */}
            {showSMA20 && (
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="SMA 20"
                connectNulls
              />
            )}

            {/* SMA 50 */}
            {showSMA50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="SMA 50"
                connectNulls
              />
            )}

            {/* Bollinger Bands */}
            {showBollingerBands && (
              <>
                <Line
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                  name="BB Upper"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="bbLower"
                  stroke="#22c55e"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                  name="BB Lower"
                  connectNulls
                />
              </>
            )}

            {/* Support and Resistance Lines */}
            {showSupportResistance && (
              <>
                {supportLevels.map((level, idx) => (
                  <ReferenceLine
                    key={`support-${idx}`}
                    y={level}
                    stroke="#22c55e"
                    strokeDasharray="3 3"
                    opacity={0.5}
                    label={{
                      value: `S${idx + 1}: $${level.toFixed(2)}`,
                      position: "right",
                      fill: "#22c55e",
                      fontSize: 11,
                    }}
                  />
                ))}
                {resistanceLevels.map((level, idx) => (
                  <ReferenceLine
                    key={`resistance-${idx}`}
                    y={level}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    opacity={0.5}
                    label={{
                      value: `R${idx + 1}: $${level.toFixed(2)}`,
                      position: "right",
                      fill: "#ef4444",
                      fontSize: 11,
                    }}
                  />
                ))}
              </>
            )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <p>Loading chart...</p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Current Price
          </p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            ${data[data.length - 1]?.close.toFixed(2) || "N/A"}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            Volatility (ATR)
          </p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            ${atrValue.toFixed(2)}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
            Analysis Period
          </p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {horizon}
          </p>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
          📖 Chart Legend
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded mt-1.5 flex-shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Blue line</strong> = Current price
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block w-3 h-3 bg-orange-500 rounded mt-1.5 flex-shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Orange line</strong> = 20-day moving average (short-term)
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block w-3 h-3 bg-purple-500 rounded mt-1.5 flex-shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Purple line</strong> = 50-day moving average (long-term)
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block w-3 h-3 border-2 border-red-500 rounded mt-1.5 flex-shrink-0" style={{borderStyle: 'dashed'}} />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Red dashed</strong> = Bollinger Bands (volatility)
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block w-3 h-3 bg-green-500 rounded mt-1.5 flex-shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Green lines</strong> = Support levels (floor)
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-block w-3 h-3 bg-red-500 rounded mt-1.5 flex-shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Red lines</strong> = Resistance levels (ceiling)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
