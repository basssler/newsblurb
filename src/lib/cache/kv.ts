/**
 * Vercel KV Cache Wrapper
 * Provides TTL-based caching for API responses across multi-user deployments
 * Uses @vercel/kv (Redis) for shared state across serverless instances
 */

import { kv } from "@vercel/kv";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // seconds
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

// In-memory stats (reset on instance restart, but good for monitoring)
let stats = {
  hits: 0,
  misses: 0,
};

/**
 * Get value from cache with TTL check
 * Returns null if expired or not found
 */
export async function getCache(key: string): Promise<any | null> {
  try {
    const cached = await kv.get(key);

    if (!cached) {
      stats.misses++;
      return null;
    }

    const entry = cached as CacheEntry;
    const age = (Date.now() - entry.timestamp) / 1000;

    // Check if expired
    if (age > entry.ttl) {
      await kv.del(key);
      stats.misses++;
      return null;
    }

    stats.hits++;
    return entry.data;
  } catch (error) {
    console.error("[CACHE] Get error:", error);
    stats.misses++;
    return null;
  }
}

/**
 * Set value in cache with TTL (in seconds)
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 900 // 15 minutes default
): Promise<void> {
  try {
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    };

    // Set with EX (expire in seconds) for automatic cleanup
    await kv.set(key, JSON.stringify(entry), { ex: ttlSeconds + 60 }); // +60s buffer
  } catch (error) {
    console.error("[CACHE] Set error:", error);
  }
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await kv.del(key);
  } catch (error) {
    console.error("[CACHE] Delete error:", error);
  }
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearCache(): Promise<void> {
  try {
    // This is dangerous - only use in development
    // In production, use FLUSHDB with caution
    console.warn("[CACHE] Clearing all cache");
    // await kv.flushdb();
  } catch (error) {
    console.error("[CACHE] Clear error:", error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = stats.hits + stats.misses;
  return {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
    totalRequests: total,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats = { hits: 0, misses: 0 };
}

/**
 * Generate cache key for stock analysis
 * Format: analysis:{ticker}:{horizon}:{period}
 */
export function getCacheKey(
  type: "fetch" | "analyze" | "macro" | "explain",
  ticker: string,
  horizon?: string
): string {
  return `${type}:${ticker.toUpperCase()}${horizon ? `:${horizon}` : ""}`;
}

/**
 * Cache configuration by endpoint
 */
export const CACHE_CONFIG = {
  fetch: {
    ttl: 15 * 60, // 15 minutes - prices update frequently
    description: "Stock price data",
  },
  analyze: {
    ttl: 15 * 60, // 15 minutes - technical analysis based on prices
    description: "Technical analysis",
  },
  macro: {
    ttl: 24 * 60 * 60, // 24 hours - macro data is stable
    description: "Macro analysis & regime detection",
  },
  explain: {
    ttl: 7 * 24 * 60 * 60, // 7 days - AI responses don't change
    description: "AI explanation",
  },
};

/**
 * Format TTL in human-readable format
 */
export function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Get remaining TTL for a cache entry
 */
export async function getRemainingTTL(key: string): Promise<number | null> {
  try {
    const cached = await kv.get(key);
    if (!cached) return null;

    const entry = cached as CacheEntry;
    const age = (Date.now() - entry.timestamp) / 1000;
    const remaining = entry.ttl - age;

    return remaining > 0 ? Math.floor(remaining) : null;
  } catch (error) {
    console.error("[CACHE] TTL check error:", error);
    return null;
  }
}
