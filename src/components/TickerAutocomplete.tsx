"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { searchTickers, formatTickerOption, POPULAR_TICKERS } from "@/lib/tickerSearch";
import { useFavorites } from "@/hooks/useFavorites";

interface TickerAutocompleteProps {
  value: string;
  onChange: (ticker: string) => void;
  onSelect?: (ticker: string) => void;
  placeholder?: string;
}

export default function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Type ticker (e.g., AAPL, MSFT, TSLA)",
}: TickerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(POPULAR_TICKERS.slice(0, 5));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const isFavorited = value && isFavorite(value.toUpperCase());

  // Update suggestions when input changes
  useEffect(() => {
    if (value.trim()) {
      setSuggestions(searchTickers(value, 8));
      setIsOpen(true);
    } else {
      setSuggestions(POPULAR_TICKERS.slice(0, 5));
      setIsOpen(false);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (ticker: string) => {
    onChange(ticker);
    onSelect?.(ticker);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) {
      alert("Please sign in to save favorites");
      return;
    }
    if (isFavorited) {
      removeFavorite(value.toUpperCase());
    } else {
      addFavorite(value.toUpperCase());
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div>
        <label className="text-label mb-3 block">Search Stock</label>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="input-base w-full text-lg pr-12"
            autoComplete="off"
          />
          {value && (
            <button
              onClick={handleToggleFavorite}
              className="absolute right-4 text-xl transition-colors hover:scale-110"
              title={isFavorited ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isFavorited ? "⭐" : "☆"}
            </button>
          )}
        </div>
      </div>

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          <ul className="max-h-64 overflow-y-auto">
            {suggestions.map((ticker, idx) => (
              <li key={idx}>
                <button
                  onClick={() => handleSelect(ticker.symbol)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {ticker.symbol}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ticker.exchange && `${ticker.exchange}`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {ticker.name}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popular tickers shown when input is empty */}
      {!value && !isOpen && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            Popular Stocks
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TICKERS.slice(0, 8).map((ticker) => (
              <button
                key={ticker.symbol}
                onClick={() => handleSelect(ticker.symbol)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                {ticker.symbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
