import { useEffect, useRef } from "react";

interface UseAutoRefreshProps {
  isEnabled: boolean;
  interval?: number; // in milliseconds, default 30 minutes
  onRefresh: () => Promise<void>;
}

/**
 * Custom hook for auto-refresh functionality
 * Respects API rate limits by using 30-minute intervals
 */
export function useAutoRefresh({
  isEnabled,
  interval = 30 * 60 * 1000, // 30 minutes default
  onRefresh,
}: UseAutoRefreshProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Cleanup any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isEnabled) {
      return;
    }

    // Set up the interval
    intervalRef.current = setInterval(async () => {
      if (!isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          await onRefresh();
        } catch (error) {
          console.error("[useAutoRefresh] Refresh failed:", error);
        } finally {
          isRefreshingRef.current = false;
        }
      }
    }, interval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, interval, onRefresh]);
}
