"use client";

import { useLocalStorage } from "./useLocalStorage";
import { SharedAnalysis, SharedAnalysisData } from "@/types/shares";

const STORAGE_KEY = "newsblurb_shared_analyses";
const SHARE_DURATION_DAYS = 7; // Shares expire after 7 days

/**
 * Custom hook for managing shared analyses
 * Stores shared analyses in localStorage for demonstration
 * In production, these would be stored in a database
 */
export function useSharedAnalysis() {
  const [shares, setShares] = useLocalStorage<SharedAnalysis[]>(STORAGE_KEY, []);

  /**
   * Create a new share of analysis
   */
  const createShare = (data: SharedAnalysisData): SharedAnalysis => {
    // Generate a random ID for the share
    const id = generateShareId();

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_DURATION_DAYS);

    const share: SharedAnalysis = {
      id,
      data,
      createdAt: new Date(),
      expiresAt,
      viewCount: 0,
    };

    // Add to shares (keep last 50 shares)
    setShares((prev) => [share, ...prev].slice(0, 50));

    console.log(`[Share] Created share ${id} for ${data.ticker}`);
    return share;
  };

  /**
   * Get a specific share by ID
   */
  const getShare = (shareId: string): SharedAnalysis | null => {
    const share = shares.find((s) => s.id === shareId);

    if (!share) {
      return null;
    }

    // Check if share has expired
    if (new Date() > share.expiresAt) {
      console.log(`[Share] Share ${shareId} has expired`);
      deleteShare(shareId);
      return null;
    }

    // Increment view count
    setShares((prev) =>
      prev.map((s) => (s.id === shareId ? { ...s, viewCount: s.viewCount + 1 } : s))
    );

    return share;
  };

  /**
   * Delete a share
   */
  const deleteShare = (shareId: string) => {
    setShares((prev) => prev.filter((s) => s.id !== shareId));
    console.log(`[Share] Deleted share ${shareId}`);
  };

  /**
   * Get all active shares
   */
  const getActiveShares = (): SharedAnalysis[] => {
    return shares.filter((s) => new Date() <= s.expiresAt);
  };

  /**
   * Clean up expired shares
   */
  const cleanupExpiredShares = () => {
    const beforeCount = shares.length;
    setShares((prev) => prev.filter((s) => new Date() <= s.expiresAt));
    const afterCount = shares.filter((s) => new Date() <= s.expiresAt).length;
    const removed = beforeCount - afterCount;

    if (removed > 0) {
      console.log(`[Share] Cleaned up ${removed} expired shares`);
    }
  };

  return {
    shares,
    createShare,
    getShare,
    deleteShare,
    getActiveShares,
    cleanupExpiredShares,
  };
}

/**
 * Generate a random share ID
 * Format: 8 character alphanumeric string
 */
function generateShareId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
