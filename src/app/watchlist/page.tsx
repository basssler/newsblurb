"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";

interface WatchlistItem {
  ticker: string;
  addedAt: string;
}

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Redirect to home if not authenticated
  if (status === "unauthenticated") {
    redirect("/");
  }

  // Load watchlist from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("newsblurb_watchlist");
      if (saved) {
        try {
          setWatchlist(JSON.parse(saved));
        } catch (error) {
          console.error("Failed to parse watchlist:", error);
        }
      }
      setMounted(true);
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("newsblurb_watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist, mounted]);

  const handleAddTicker = (ticker: string) => {
    const normalizedTicker = ticker.toUpperCase().trim();
    if (
      normalizedTicker &&
      !watchlist.find((item) => item.ticker === normalizedTicker)
    ) {
      setWatchlist([
        ...watchlist,
        { ticker: normalizedTicker, addedAt: new Date().toISOString() },
      ]);
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    setWatchlist(watchlist.filter((item) => item.ticker !== ticker));
  };

  if (status === "loading" || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading watchlist...</p>
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
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        {/* Add to Watchlist Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Add Ticker to Watchlist
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements[0] as HTMLInputElement)
                .value;
              handleAddTicker(input);
              e.currentTarget.reset();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              placeholder="Enter ticker symbol (e.g., AAPL, MSFT)"
              maxLength={5}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Add
            </button>
          </form>
        </div>

        {/* Watchlist Items */}
        {watchlist.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Your watchlist is empty
            </p>
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Analyze your first stock
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {watchlist.map((item) => (
              <div
                key={item.ticker}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {item.ticker}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/?ticker=${item.ticker}`}
                    className="px-4 py-2 rounded-lg font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Analyze
                  </Link>
                  <button
                    onClick={() => handleRemoveTicker(item.ticker)}
                    className="px-4 py-2 rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
