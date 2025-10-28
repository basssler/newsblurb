"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";

interface HistoryItem {
  ticker: string;
  horizon: string;
  timestamp: string;
  aiSummary?: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Redirect to home if not authenticated
  if (status === "unauthenticated") {
    redirect("/");
  }

  // Load history from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("newsblurb_analysis_history");
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (error) {
          console.error("Failed to parse history:", error);
        }
      }
      setMounted(true);
    }
  }, []);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all analysis history?")) {
      setHistory([]);
      localStorage.removeItem("newsblurb_analysis_history");
    }
  };

  const handleRemoveItem = (timestamp: string) => {
    setHistory(history.filter((item) => item.timestamp !== timestamp));
  };

  if (status === "loading" || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Analysis History</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        {/* Clear History Button */}
        {history.length > 0 && (
          <div className="flex justify-end mb-6">
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Clear All History
            </button>
          </div>
        )}

        {/* History Items */}
        {history.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No analysis history yet
            </p>
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Analyze your first stock
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
              .map((item) => (
                <div
                  key={item.timestamp}
                  className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {item.ticker}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {item.horizon} • {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/?ticker=${item.ticker}`}
                        className="px-4 py-2 rounded-lg font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        Reanalyze
                      </Link>
                      <button
                        onClick={() => handleRemoveItem(item.timestamp)}
                        className="px-4 py-2 rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {item.aiSummary && (
                    <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded text-sm text-slate-700 dark:text-slate-300">
                      {item.aiSummary}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
