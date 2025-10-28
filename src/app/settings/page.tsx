"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";

interface Settings {
  darkMode: boolean;
  autoRefresh: boolean;
  defaultHorizon: "Intraday" | "1-Week" | "Long-Term";
  notifications: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  autoRefresh: false,
  defaultHorizon: "1-Week",
  notifications: true,
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
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
          setSettings(JSON.parse(saved));
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
    value: boolean | string
  ) => {
    setSettings({ ...settings, [key]: value });
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
