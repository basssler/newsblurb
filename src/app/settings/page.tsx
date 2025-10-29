"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useFavorites } from "@/hooks/useFavorites";

interface Settings {
  darkMode: boolean;
  autoRefresh: boolean;
  defaultHorizon: "Intraday" | "1-Week" | "Long-Term";
  notifications: boolean;
  newsArticleCount: number;
  newsRefreshInterval: number; // minutes
  enableNewsAlerts: boolean;
  includeAnalystNotes: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  autoRefresh: false,
  defaultHorizon: "1-Week",
  notifications: true,
  newsArticleCount: 3,
  newsRefreshInterval: 1440, // 24 hours
  enableNewsAlerts: true,
  includeAnalystNotes: false,
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { darkMode, setDarkMode } = useDarkMode();
  const { favorites, removeFavorite } = useFavorites();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  // Redirect to home if not authenticated
  if (status === "unauthenticated") {
    redirect("/");
  }

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("newsblurb_settings");
      if (saved) {
        try {
          const parsedSettings = JSON.parse(saved);
          setSettings(parsedSettings);
          // Apply dark mode if saved
          if (parsedSettings.darkMode !== darkMode) {
            setDarkMode(parsedSettings.darkMode);
          }
        } catch (error) {
          console.error("Failed to parse settings:", error);
        }
      }
      setMounted(true);
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("newsblurb_settings", JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleSettingChange = (
    key: keyof Settings,
    value: boolean | string | number
  ) => {
    setSettings({ ...settings, [key]: value });
    // Apply dark mode immediately if darkMode setting changes
    if (key === "darkMode") {
      setDarkMode(value as boolean);
    }
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem("newsblurb_settings");
      setSaved(false);
    }
  };

  if (status === "loading" || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading settings...</p>
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
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 max-w-2xl">
          {/* Success Message */}
          {saved && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200 font-medium">
                ✓ Settings saved successfully
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Theme Setting */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) =>
                    handleSettingChange("darkMode", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Dark Mode
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Use dark theme for the application
                  </p>
                </div>
              </label>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Auto Refresh Setting */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) =>
                    handleSettingChange("autoRefresh", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Auto Refresh Data
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Automatically refresh analysis every 30 minutes
                  </p>
                </div>
              </label>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Default Horizon */}
            <div>
              <label className="block font-semibold text-slate-900 dark:text-white mb-3">
                Default Analysis Period
              </label>
              <select
                value={settings.defaultHorizon}
                onChange={(e) =>
                  handleSettingChange(
                    "defaultHorizon",
                    e.target.value as Settings["defaultHorizon"]
                  )
                }
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Intraday">Intraday</option>
                <option value="1-Week">1 Week</option>
                <option value="Long-Term">Long Term</option>
              </select>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Choose the default time period for stock analysis
              </p>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Notifications Setting */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) =>
                    handleSettingChange("notifications", e.target.checked)
                  }
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Enable Notifications
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Receive notifications for analysis updates (coming soon)
                  </p>
                </div>
              </label>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* News Preferences */}
            <div>
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  📰 News Preferences
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Customize your stock news feed
                </p>
              </div>

              <div className="space-y-4">
                {/* Articles Count */}
                <div>
                  <label className="block font-medium text-slate-900 dark:text-white mb-2">
                    Articles per Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.newsArticleCount}
                    onChange={(e) =>
                      handleSettingChange(
                        "newsArticleCount",
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Number of news articles to display (1-10)
                  </p>
                </div>

                {/* Refresh Interval */}
                <div>
                  <label className="block font-medium text-slate-900 dark:text-white mb-2">
                    News Refresh Interval
                  </label>
                  <select
                    value={settings.newsRefreshInterval}
                    onChange={(e) =>
                      handleSettingChange(
                        "newsRefreshInterval",
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={60}>Every hour</option>
                    <option value={360}>Every 6 hours</option>
                    <option value={720}>Every 12 hours</option>
                    <option value={1440}>Daily (default)</option>
                  </select>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    How often to fetch fresh news articles
                  </p>
                </div>

                {/* News Alerts */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNewsAlerts}
                    onChange={(e) =>
                      handleSettingChange("enableNewsAlerts", e.target.checked)
                    }
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      High-Impact News Alerts
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Notify me of high-impact news articles
                    </p>
                  </div>
                </label>

                {/* Analyst Notes */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeAnalystNotes}
                    onChange={(e) =>
                      handleSettingChange(
                        "includeAnalystNotes",
                        e.target.checked
                      )
                    }
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      Include Analyst Notes
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Show analyst upgrades/downgrades (premium feature)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Watchlist Management */}
            <div>
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  📊 My Watchlist
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {favorites.length > 0
                    ? `${favorites.length} stock${favorites.length !== 1 ? "s" : ""} in watchlist`
                    : "No stocks in watchlist yet"}
                </p>
              </div>

              {favorites.length > 0 ? (
                <div className="space-y-2">
                  {favorites.map((fav) => (
                    <div
                      key={fav.ticker}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg"
                    >
                      <span className="font-medium text-foreground">
                        {fav.ticker}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/?ticker=${fav.ticker}&auto=true`}
                          className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        >
                          Analyze
                        </Link>
                        <button
                          onClick={() => removeFavorite(fav.ticker)}
                          className="text-xs px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No stocks in watchlist yet
                </p>
              )}

              <Link
                href="/watchlist"
                className="inline-block text-sm text-blue-500 hover:text-blue-600 font-medium mt-3"
              >
                Manage full watchlist →
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Save Settings
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 rounded-lg font-medium bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">ℹ️ About Settings:</span> Your
            preferences are saved locally on this device. Settings will sync
            across your devices when cloud sync is enabled (coming soon).
          </p>
        </div>
      </div>
    </div>
  );
}
