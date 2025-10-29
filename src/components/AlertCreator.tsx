"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAlerts, requestNotificationPermission } from "@/hooks/useAlerts";

interface AlertCreatorProps {
  ticker: string;
  currentRSI?: number;
  currentPrice?: number;
}

export default function AlertCreator({
  ticker,
  currentRSI,
  currentPrice,
}: AlertCreatorProps) {
  const { data: session } = useSession();
  const { addAlert } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [alertType, setAlertType] = useState<"RSI_THRESHOLD" | "PRICE_TARGET">(
    "RSI_THRESHOLD"
  );
  const [value, setValue] = useState<number>(30);
  const [operator, setOperator] = useState<"above" | "below">("below");
  const [enableSound, setEnableSound] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreateAlert = () => {
    setError("");

    // Validation
    if (!session) {
      setError("Please sign in to create alerts");
      return;
    }

    if (isNaN(value) || value < 0) {
      setError("Please enter a valid number");
      return;
    }

    // Additional validation for price targets
    if (alertType === "PRICE_TARGET" && currentPrice) {
      if (operator === "below" && value > currentPrice * 2) {
        setError("Price target seems too high compared to current price");
        return;
      }
      if (operator === "above" && value < currentPrice * 0.5) {
        setError("Price target seems too low compared to current price");
        return;
      }
    }

    try {
      requestNotificationPermission();

      addAlert(
        ticker,
        alertType,
        {
          metric: alertType === "RSI_THRESHOLD" ? "rsi" : "price",
          operator,
          value: Number(value),
        },
        {
          enabled: true,
          sound: enableSound,
          email: false,
        }
      );

      setSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        setSuccess(false);
        // Reset form
        setAlertType("RSI_THRESHOLD");
        setValue(30);
        setOperator("below");
      }, 1500);
    } catch (err) {
      setError("Failed to create alert");
      console.error(err);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
      >
        🔔 Create Alert
      </button>

      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-4 border border-slate-200 dark:border-slate-700">
          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm font-medium">
              ✓ Alert created successfully!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium">
              ✕ {error}
            </div>
          )}

          {/* Alert Type */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Alert Type
            </label>
            <select
              value={alertType}
              onChange={(e) =>
                setAlertType(e.target.value as "RSI_THRESHOLD" | "PRICE_TARGET")
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="RSI_THRESHOLD">RSI Threshold</option>
              <option value="PRICE_TARGET">Price Target</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {alertType === "RSI_THRESHOLD"
                ? "Alert when RSI crosses threshold (0-100)"
                : "Alert when price moves to target level"}
            </p>
          </div>

          {/* Condition and Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Condition
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as "above" | "below")}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                {alertType === "RSI_THRESHOLD" ? "RSI Value" : "Price"}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                placeholder={
                  alertType === "RSI_THRESHOLD" ? "30" : currentPrice?.toFixed(2)
                }
                min="0"
                max={alertType === "RSI_THRESHOLD" ? 100 : undefined}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Current Values */}
          <div className="bg-white dark:bg-slate-700/50 p-2 rounded text-xs text-slate-600 dark:text-slate-400 space-y-1">
            {currentRSI !== undefined && (
              <p>📊 Current RSI: <span className="font-medium">{currentRSI.toFixed(2)}</span></p>
            )}
            {currentPrice !== undefined && (
              <p>💰 Current Price: <span className="font-medium">${currentPrice.toFixed(2)}</span></p>
            )}
          </div>

          {/* Sound Option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableSound}
              onChange={(e) => setEnableSound(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              🔊 Play sound when alert triggers
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleCreateAlert}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Create Alert
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg font-medium hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-900 dark:text-blue-100">
            <p>
              <strong>💡 Tip:</strong> You'll receive browser notifications when your alert triggers. Make sure notifications are enabled in your browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
