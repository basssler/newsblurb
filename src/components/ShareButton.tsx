"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useSharedAnalysis } from "@/hooks/useSharedAnalysis";
import { AnalysisData } from "@/components/AnalysisView";
import { getShareLink } from "@/types/shares";

interface ShareButtonProps {
  ticker: string;
  horizon: "Intraday" | "1-Week" | "Long-Term";
  data?: AnalysisData;
}

export default function ShareButton({ ticker, horizon, data }: ShareButtonProps) {
  const { data: session } = useSession();
  const { createShare } = useSharedAnalysis();
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setError("");
    setShareLink("");
    setIsSharing(true);

    try {
      if (!session) {
        setError("Please sign in to share analyses");
        setIsSharing(false);
        return;
      }

      if (!data) {
        setError("No analysis data available to share");
        setIsSharing(false);
        return;
      }

      // Create share with current data
      const share = createShare({
        ticker,
        horizon,
        timestamp: new Date().toISOString(),
        fundamentals: data.fundamentals || {
          pe: 0,
          evEbitda: 0,
          epsGrowth: 0,
          dividendYield: 0,
        },
        technicals: data.technicals || {
          rsi: 0,
          sma20: 0,
          sma50: 0,
          atr: 0,
          currentPrice: 0,
        },
        priceHistory: data.priceHistory || [],
        aiSummary: data.aiSummary,
      });

      const link = getShareLink(share.id);
      setShareLink(link);
      console.log(`[ShareButton] Created share: ${link}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[ShareButton] Share failed:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy link");
    }
  };

  if (shareLink) {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
            ✓ Share created! Link expires in 7 days.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-green-200 dark:border-green-800 rounded text-slate-700 dark:text-slate-300"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition-colors"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setShareLink("");
            setError("");
          }}
          className="w-full px-3 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Create Another Share
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleShare}
        disabled={isSharing || !data}
        title="Generate a shareable link for this analysis"
        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2 disabled:cursor-not-allowed"
      >
        {isSharing ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating share...
          </>
        ) : (
          <>
            🔗 Share Analysis
          </>
        )}
      </button>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs">
          ✕ {error}
        </div>
      )}
    </div>
  );
}
