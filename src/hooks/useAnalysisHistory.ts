import { useLocalStorage } from "./useLocalStorage";

export interface AnalysisHistoryItem {
  id: string;
  ticker: string;
  horizon: "Intraday" | "1-Week" | "Long-Term";
  timestamp: string;
  aiSummary?: {
    headline?: string;
    summary?: string;
    bullets?: string[];
    learningPoint?: string;
  };
}

const STORAGE_KEY = "newsblurb_analysis_history";
const MAX_HISTORY_ITEMS = 50; // Limit history to prevent localStorage from getting too large

/**
 * Custom hook for managing analysis history
 * Stores up to MAX_HISTORY_ITEMS in localStorage with automatic cleanup
 */
export function useAnalysisHistory() {
  const [history, setHistory] = useLocalStorage<AnalysisHistoryItem[]>(
    STORAGE_KEY,
    []
  );

  const addToHistory = (item: Omit<AnalysisHistoryItem, "id">) => {
    const newItem: AnalysisHistoryItem = {
      ...item,
      id: `${item.ticker}-${item.timestamp}`,
    };

    setHistory((prevHistory) => {
      const updated = [newItem, ...prevHistory];
      // Keep only the most recent MAX_HISTORY_ITEMS
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const removeFromHistory = (id: string) => {
    setHistory((prevHistory) =>
      prevHistory.filter((item) => item.id !== id)
    );
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getHistoryByTicker = (ticker: string) => {
    return history.filter((item) => item.ticker === ticker);
  };

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryByTicker,
  };
}
