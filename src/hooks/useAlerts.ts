"use client";

import { useLocalStorage } from "./useLocalStorage";
import { Alert, AlertTrigger, AlertType, AlertCondition, AlertNotification } from "@/types/alerts";

const STORAGE_KEY = "newsblurb_alerts";
const TRIGGERS_KEY = "newsblurb_alert_triggers";
const MAX_TRIGGERS = 100; // Keep last 100 alert triggers

/**
 * Custom hook for managing alerts
 * Stores alerts and triggers in localStorage
 */
export function useAlerts() {
  const [alerts, setAlerts] = useLocalStorage<Alert[]>(STORAGE_KEY, []);
  const [triggers, setTriggers] = useLocalStorage<AlertTrigger[]>(TRIGGERS_KEY, []);

  /**
   * Add new alert
   */
  const addAlert = (
    ticker: string,
    type: AlertType,
    condition: AlertCondition,
    notification: Partial<AlertNotification> = {}
  ): Alert => {
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      ticker,
      type,
      condition,
      status: "active",
      createdAt: new Date(),
      notification: {
        enabled: true,
        sound: true,
        email: false,
        ...notification,
      },
    };

    setAlerts((prev) => [...prev, newAlert]);
    console.log(`[Alert] Created alert for ${ticker}: ${type} ${condition.operator} ${condition.value}`);
    return newAlert;
  };

  /**
   * Delete alert
   */
  const deleteAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    console.log(`[Alert] Deleted alert ${alertId}`);
  };

  /**
   * Disable alert (keeps it but marks as disabled)
   */
  const disableAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "disabled" } : a))
    );
  };

  /**
   * Enable alert
   */
  const enableAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "active" } : a))
    );
  };

  /**
   * Check if alert should trigger based on current data
   */
  const checkAlerts = async (ticker: string, data: {
    rsi?: number;
    currentPrice?: number;
    vix?: number;
  }): Promise<AlertTrigger[]> => {
    const relevantAlerts = alerts.filter(
      (a) => a.ticker === ticker && a.status === "active"
    );

    const newTriggers: AlertTrigger[] = [];

    for (const alert of relevantAlerts) {
      let triggered = false;
      let currentValue = 0;
      let metricsMatch = true;

      // Check RSI alerts
      if (alert.condition.metric === "rsi") {
        if (data.rsi === undefined) {
          metricsMatch = false;
        } else {
          currentValue = data.rsi;
          if (alert.condition.operator === "above" && data.rsi > alert.condition.value) {
            triggered = true;
          } else if (alert.condition.operator === "below" && data.rsi < alert.condition.value) {
            triggered = true;
          }
        }
      }

      // Check Price alerts
      if (alert.condition.metric === "price") {
        if (data.currentPrice === undefined) {
          metricsMatch = false;
        } else {
          currentValue = data.currentPrice;
          if (alert.condition.operator === "above" && data.currentPrice > alert.condition.value) {
            triggered = true;
          } else if (alert.condition.operator === "below" && data.currentPrice < alert.condition.value) {
            triggered = true;
          }
        }
      }

      // Check VIX alerts
      if (alert.condition.metric === "vix") {
        if (data.vix === undefined) {
          metricsMatch = false;
        } else {
          currentValue = data.vix;
          if (alert.condition.operator === "above" && data.vix > alert.condition.value) {
            triggered = true;
          } else if (alert.condition.operator === "below" && data.vix < alert.condition.value) {
            triggered = true;
          }
        }
      }

      if (triggered && metricsMatch) {
        const alertTrigger: AlertTrigger = {
          alertId: alert.id,
          ticker,
          currentValue,
          threshold: alert.condition.value,
          timestamp: new Date(),
          message: `${ticker} ${alert.type}: ${alert.condition.metric} ${alert.condition.operator} ${alert.condition.value}`,
        };

        newTriggers.push(alertTrigger);
        console.log(`[Alert] TRIGGERED: ${alertTrigger.message}`);

        // Update alert to mark as triggered
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id ? { ...a, triggeredAt: new Date() } : a
          )
        );

        // Send notification if enabled
        if (alert.notification.enabled) {
          sendNotification(alertTrigger, alert.notification.sound);
        }
      }
    }

    // Add new triggers to history (keep last MAX_TRIGGERS)
    if (newTriggers.length > 0) {
      setTriggers((prev) => {
        const updated = [...newTriggers, ...prev];
        return updated.slice(0, MAX_TRIGGERS);
      });
    }

    return newTriggers;
  };

  /**
   * Clear all triggers (alert history)
   */
  const clearTriggers = () => {
    setTriggers([]);
  };

  /**
   * Get alerts for a specific ticker
   */
  const getAlertsByTicker = (ticker: string) => {
    return alerts.filter((a) => a.ticker === ticker);
  };

  /**
   * Get active alerts only
   */
  const getActiveAlerts = () => {
    return alerts.filter((a) => a.status === "active");
  };

  /**
   * Clear all alerts
   */
  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return {
    alerts,
    triggers,
    addAlert,
    deleteAlert,
    disableAlert,
    enableAlert,
    checkAlerts,
    clearTriggers,
    clearAllAlerts,
    getAlertsByTicker,
    getActiveAlerts,
  };
}

/**
 * Send browser notification
 */
function sendNotification(trigger: AlertTrigger, playSound: boolean) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("NewsBlurb Alert! 🔔", {
      body: trigger.message,
      icon: "/favicon.ico",
      tag: trigger.alertId,
      requireInteraction: true,
    });

    if (playSound) {
      // Play notification sound (simple beep)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.log("[Alert] Could not play sound:", error);
      }
    }
  }
}

/**
 * Request notification permission from user
 */
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
