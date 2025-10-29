"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { formatAlertDescription } from "@/types/alerts";

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const { alerts, triggers, deleteAlert, disableAlert, enableAlert, clearTriggers } = useAlerts();
  const [mounted, setMounted] = useState(false);

  // Redirect to home if not authenticated
  if (status === "unauthenticated") {
    redirect("/");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading alerts...</p>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const disabledAlerts = alerts.filter((a) => a.status === "disabled");

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">🔔 Alerts</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Active Alerts */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-1">Active Alerts</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {activeAlerts.length} alert{activeAlerts.length !== 1 ? "s" : ""} monitoring
              </p>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 mb-3">No active alerts</p>
                <Link
                  href="/"
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  Analyze a stock to create alerts →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground text-lg">{alert.ticker}</h3>
                          <span className="text-xs font-semibold px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatAlertDescription(alert)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          Created {new Date(alert.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Delete alert"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Notification Settings */}
                    <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                      {alert.notification.enabled && (
                        <>
                          {alert.notification.sound && (
                            <span className="flex items-center gap-1">
                              🔊 Sound
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            🔔 Browser Notification
                          </span>
                        </>
                      )}
                    </div>

                    {/* Disable Button */}
                    <button
                      onClick={() => disableAlert(alert.id)}
                      className="mt-3 w-full px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Disable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert History */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Alert History</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {triggers.length} trigger{triggers.length !== 1 ? "s" : ""}
                </p>
              </div>
              {triggers.length > 0 && (
                <button
                  onClick={clearTriggers}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {triggers.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">
                  No alerts have triggered yet
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {triggers.map((trigger, idx) => (
                  <div
                    key={`${trigger.alertId}-${idx}`}
                    className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">✓</span>
                      <div className="flex-1">
                        <p className="font-bold text-green-900 dark:text-green-100">
                          {trigger.ticker}
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          {trigger.message}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {new Date(trigger.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Value: {trigger.currentValue.toFixed(2)} (Target: {trigger.threshold})
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Disabled Alerts Section */}
        {disabledAlerts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-foreground mb-6">Disabled Alerts</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {disabledAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{alert.ticker}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {formatAlertDescription(alert)}
                      </p>
                    </div>
                    <button
                      onClick={() => enableAlert(alert.id)}
                      className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">💡 How Alerts Work:</span>
            <br />
            1. Create an alert when analyzing a stock
            <br />
            2. When you check the stock again, alerts are evaluated
            <br />
            3. If triggered, you'll receive a browser notification
            <br />
            4. Check this page to see your alert history and manage active alerts
          </p>
        </div>
      </div>
    </div>
  );
}
