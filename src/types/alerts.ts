/**
 * Alert System Types
 * Defines alert creation, management, and trigger events
 */

export type AlertType = "RSI_THRESHOLD" | "PRICE_TARGET" | "MACRO_EVENT" | "VOLATILITY";
export type AlertOperator = "above" | "below" | "equals";
export type AlertStatus = "active" | "triggered" | "disabled";

/**
 * Alert condition - what to monitor and when to trigger
 */
export interface AlertCondition {
  metric: "rsi" | "price" | "vix" | "event";
  operator: AlertOperator;
  value: number;
}

/**
 * Alert notification settings
 */
export interface AlertNotification {
  enabled: boolean;
  sound: boolean;
  email: boolean;
}

/**
 * Main alert object stored in localStorage
 */
export interface Alert {
  id: string;
  ticker: string;
  type: AlertType;
  condition: AlertCondition;
  status: AlertStatus;
  createdAt: Date;
  triggeredAt?: Date;
  notification: AlertNotification;
}

/**
 * Alert trigger event - fired when alert condition is met
 */
export interface AlertTrigger {
  alertId: string;
  ticker: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  message: string;
}

/**
 * Helper to create new alert with defaults
 */
export function createAlert(
  ticker: string,
  type: AlertType,
  condition: AlertCondition,
  notification: Partial<AlertNotification> = {}
): Alert {
  return {
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
}

/**
 * Helper to format alert for display
 */
export function formatAlertDescription(alert: Alert): string {
  const { condition, type } = alert;

  if (type === "RSI_THRESHOLD") {
    return `RSI ${condition.operator} ${condition.value}`;
  } else if (type === "PRICE_TARGET") {
    return `Price ${condition.operator} $${condition.value}`;
  } else if (type === "VOLATILITY") {
    return `VIX ${condition.operator} ${condition.value}`;
  }

  return `${type} ${condition.operator} ${condition.value}`;
}
