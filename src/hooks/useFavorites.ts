import { useLocalStorage } from "./useLocalStorage";

export interface FavoriteItem {
  ticker: string;
  addedAt: string;
  notes?: string;
}

const STORAGE_KEY = "newsblurb_favorites";

/**
 * Custom hook for managing favorite stocks
 * Stores favorite tickers with timestamps and optional notes
 */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteItem[]>(
    STORAGE_KEY,
    []
  );

  const addFavorite = (ticker: string, notes?: string) => {
    const normalizedTicker = ticker.toUpperCase().trim();

    // Check if already exists
    if (favorites.some((fav) => fav.ticker === normalizedTicker)) {
      console.warn(`${normalizedTicker} is already in favorites`);
      return;
    }

    setFavorites((prevFavorites) => [
      ...prevFavorites,
      {
        ticker: normalizedTicker,
        addedAt: new Date().toISOString(),
        notes,
      },
    ]);
  };

  const removeFavorite = (ticker: string) => {
    const normalizedTicker = ticker.toUpperCase().trim();
    setFavorites((prevFavorites) =>
      prevFavorites.filter((fav) => fav.ticker !== normalizedTicker)
    );
  };

  const isFavorite = (ticker: string) => {
    const normalizedTicker = ticker.toUpperCase().trim();
    return favorites.some((fav) => fav.ticker === normalizedTicker);
  };

  const updateNotes = (ticker: string, notes: string) => {
    const normalizedTicker = ticker.toUpperCase().trim();
    setFavorites((prevFavorites) =>
      prevFavorites.map((fav) =>
        fav.ticker === normalizedTicker ? { ...fav, notes } : fav
      )
    );
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    updateNotes,
    clearFavorites,
  };
}
