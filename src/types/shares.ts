/**
 * Types for shared analysis functionality
 */

export interface SharedAnalysisData {
  ticker: string;
  horizon: "Intraday" | "1-Week" | "Long-Term";
  timestamp: string;
  fundamentals: {
    pe: number;
    evEbitda: number;
    epsGrowth: number;
    dividendYield: number;
  };
  technicals: {
    rsi: number;
    sma20: number;
    sma50: number;
    atr: number;
    currentPrice: number;
  };
  priceHistory: Array<{ date: string; close: number }>;
  aiSummary?: {
    headline: string;
    summary: string;
    bullets: string[];
    learningPoint: string;
  };
}

export interface SharedAnalysis {
  id: string;
  data: SharedAnalysisData;
  createdAt: Date;
  expiresAt: Date;
  viewCount: number;
}

/**
 * Format share link with ID
 */
export function getShareLink(shareId: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${baseUrl}/shared/${shareId}`;
}

/**
 * Check if share link has expired
 */
export function isShareExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Format share creation time
 */
export function formatShareTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString();
}
