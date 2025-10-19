"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";

interface AdvancedChartViewProps {
  data: Array<{ date: string; close: number }>;
  ticker: string;
  horizon: "Intraday" | "1-Week" | "Long-Term";
  atrValue: number;
}

export default function AdvancedChartView({
  data,
  ticker,
  horizon,
  atrValue,
}: AdvancedChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const priceSeriesRef = useRef<any>(null);
  const sma20SeriesRef = useRef<any>(null);
  const sma50SeriesRef = useRef<any>(null);

  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    try {
      // Create chart - type as any to bypass TypeScript issues with the API
      const chart: any = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#334155",
          fontSize: 12,
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
        width: containerRef.current.clientWidth,
        height: 500,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "#cbd5e1",
            width: 1,
            style: 2,
          },
          horzLine: {
            color: "#cbd5e1",
            width: 1,
            style: 2,
          },
        },
        rightPriceScale: {
          autoScale: true,
        },
      });

      // Calculate SMAs
      const calculateSMA = (arr: number[], period: number): (number | null)[] => {
        return arr.map((_, i) => {
          if (i < period - 1) return null;
          const sum = arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          return sum / period;
        });
      };

      const prices = data.map((d) => d.close);
      const sma20 = calculateSMA(prices, 20);
      const sma50 = calculateSMA(prices, 50);

      // Format data for series - use unix timestamps
      const priceSeriesData = data.map((d) => {
        const date = new Date(d.date);
        return {
          time: Math.floor(date.getTime() / 1000) as any,
          value: d.close,
        };
      });

      // Add price line series - using proper API
      const priceSeries = chart.addLineSeries({
        color: "#0ea5e9",
        lineWidth: 3,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
      });

      priceSeriesRef.current = priceSeries;
      priceSeries.setData(priceSeriesData);

      // Add SMA 20
      const sma20Series = chart.addLineSeries({
        color: "#f97316",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
      });
      sma20SeriesRef.current = sma20Series;

      const sma20Data = data
        .map((d, i) => {
          const date = new Date(d.date);
          return {
            time: Math.floor(date.getTime() / 1000) as any,
            value: sma20[i],
          };
        })
        .filter((d) => d.value !== null && d.value !== undefined);

      sma20Series.setData(sma20Data);

      // Add SMA 50
      const sma50Series = chart.addLineSeries({
        color: "#a855f7",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: true,
      });
      sma50SeriesRef.current = sma50Series;

      const sma50Data = data
        .map((d, i) => {
          const date = new Date(d.date);
          return {
            time: Math.floor(date.getTime() / 1000) as any,
            value: sma50[i],
          };
        })
        .filter((d) => d.value !== null && d.value !== undefined);

      sma50Series.setData(sma50Data);

      // Fit content
      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);
      chartRef.current = chart;

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error("Error initializing chart:", error);
    }
  }, [data]);

  // Toggle SMA series visibility
  useEffect(() => {
    if (sma20SeriesRef.current) {
      sma20SeriesRef.current.applyOptions({ visible: showSMA20 });
    }
  }, [showSMA20]);

  useEffect(() => {
    if (sma50SeriesRef.current) {
      sma50SeriesRef.current.applyOptions({ visible: showSMA50 });
    }
  }, [showSMA50]);

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Chart Tools
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Use mouse wheel to zoom, drag to pan. Toggle indicators below.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { checked: showSMA20, onChange: setShowSMA20, label: "SMA 20" },
            { checked: showSMA50, onChange: setShowSMA50, label: "SMA 50" },
          ].map((item) => (
            <label key={item.label} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div ref={containerRef} style={{ width: "100%", height: "500px" }} />
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

      {/* Info Box */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
          📖 How to Use This Chart
        </h4>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <span className="font-medium">Scroll to zoom</span> - Use mouse wheel to zoom in/out
          </li>
          <li>
            <span className="font-medium">Drag to pan</span> - Click and drag to move around the chart
          </li>
          <li>
            <span className="font-medium">Hover for details</span> - Move cursor over the chart to see exact prices
          </li>
          <li>
            <span className="font-medium">Blue line</span> = Current price trend
          </li>
          <li>
            <span className="font-medium">Orange line (SMA 20)</span> - Short-term trend (20-day moving average)
          </li>
          <li>
            <span className="font-medium">Purple line (SMA 50)</span> - Long-term trend (50-day moving average)
          </li>
        </ul>
      </div>
    </div>
  );
}
