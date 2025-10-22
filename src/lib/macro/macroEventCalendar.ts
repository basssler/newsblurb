/**
 * Macro Economic Event Calendar
 * Tracks important economic events that can impact stock prices
 * Includes historical impact data and upcoming event dates
 */

export type EventType = "FOMC" | "NFP" | "CPI" | "PCE" | "GDP" | "PPI" | "ISM" | "CONSUMER_SENTIMENT" | "UNEMPLOYMENT" | "RETAIL_SALES";
export type EventImportance = "high" | "medium" | "low";

export interface MacroEvent {
  id: string;
  name: string;
  date: Date;
  type: EventType;
  importance: EventImportance;
  historicalImpact?: {
    avgStockMove: number; // Average percentage move
    direction: "up" | "down" | "mixed"; // Typical market direction
    description: string; // What happens when data beats/misses
  };
  consensus?: number; // Expected value or change
  actual?: number; // Actual value (if already happened)
  beat?: boolean; // Whether data beat expectations
  estimate?: string; // Text description of estimate
}

/**
 * 2025 Macro Economic Calendar
 * Includes FOMC meetings, NFP releases, inflation data, and other key indicators
 */
const MACRO_CALENDAR_2025: MacroEvent[] = [
  // January
  {
    id: "nfp_jan",
    name: "Nonfarm Payroll (January)",
    date: new Date("2025-02-07"),
    type: "NFP",
    importance: "high",
    historicalImpact: {
      avgStockMove: 1.2,
      direction: "mixed",
      description: "Strong jobs growth can trigger rate hike concerns; weak data may support stock rally"
    },
    estimate: "Expected: +180K jobs"
  },
  {
    id: "cpi_jan",
    name: "CPI Inflation (January)",
    date: new Date("2025-01-15"),
    type: "CPI",
    importance: "high",
    historicalImpact: {
      avgStockMove: 1.5,
      direction: "mixed",
      description: "Higher inflation can hurt stock valuations; lower inflation supports Fed easing"
    },
    estimate: "Expected: 2.6% YoY"
  },
  {
    id: "fomc_jan",
    name: "FOMC Meeting",
    date: new Date("2025-01-28"),
    type: "FOMC",
    importance: "high",
    historicalImpact: {
      avgStockMove: 2.0,
      direction: "mixed",
      description: "Rate decision and guidance have major impact on growth and tech stocks"
    },
    estimate: "Expected: Rates held steady"
  },

  // February
  {
    id: "pce_jan",
    name: "PCE Inflation (January)",
    date: new Date("2025-02-28"),
    type: "PCE",
    importance: "medium",
    historicalImpact: {
      avgStockMove: 0.8,
      direction: "mixed",
      description: "Fed's preferred inflation measure; impacts future rate decisions"
    },
    estimate: "Expected: 2.4% YoY"
  },
  {
    id: "ism_manufacturing_feb",
    name: "ISM Manufacturing PMI (January)",
    date: new Date("2025-02-03"),
    type: "ISM",
    importance: "medium",
    historicalImpact: {
      avgStockMove: 0.6,
      direction: "up",
      description: "Above 50 indicates expansion; strong manufacturing supports economic growth"
    },
    estimate: "Expected: 49.2"
  },

  // March
  {
    id: "nfp_mar",
    name: "Nonfarm Payroll (February)",
    date: new Date("2025-03-07"),
    type: "NFP",
    importance: "high",
    historicalImpact: {
      avgStockMove: 1.2,
      direction: "mixed",
      description: "Jobs data critical for Fed's employment mandate"
    },
    estimate: "Expected: +175K jobs"
  },
  {
    id: "fomc_mar",
    name: "FOMC Meeting",
    date: new Date("2025-03-18"),
    type: "FOMC",
    importance: "high",
    historicalImpact: {
      avgStockMove: 2.0,
      direction: "mixed",
      description: "Major policy announcement; significant market mover"
    },
    estimate: "Expected: Rates unchanged"
  },

  // April
  {
    id: "nfp_apr",
    name: "Nonfarm Payroll (March)",
    date: new Date("2025-04-04"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +170K jobs"
  },
  {
    id: "cpi_mar",
    name: "CPI Inflation (March)",
    date: new Date("2025-04-11"),
    type: "CPI",
    importance: "high",
    estimate: "Expected: 2.5% YoY"
  },

  // May
  {
    id: "nfp_may",
    name: "Nonfarm Payroll (April)",
    date: new Date("2025-05-02"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +180K jobs"
  },
  {
    id: "fomc_may",
    name: "FOMC Meeting",
    date: new Date("2025-05-06"),
    type: "FOMC",
    importance: "high",
    estimate: "Expected: Rates unchanged"
  },
  {
    id: "pce_apr",
    name: "PCE Inflation (April)",
    date: new Date("2025-05-30"),
    type: "PCE",
    importance: "medium",
    estimate: "Expected: 2.4% YoY"
  },

  // June
  {
    id: "nfp_jun",
    name: "Nonfarm Payroll (May)",
    date: new Date("2025-06-06"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +175K jobs"
  },
  {
    id: "fomc_jun",
    name: "FOMC Meeting",
    date: new Date("2025-06-17"),
    type: "FOMC",
    importance: "high",
    estimate: "Expected: Rates unchanged"
  },
  {
    id: "cpi_may",
    name: "CPI Inflation (May)",
    date: new Date("2025-06-13"),
    type: "CPI",
    importance: "high",
    estimate: "Expected: 2.5% YoY"
  },

  // July
  {
    id: "nfp_jul",
    name: "Nonfarm Payroll (June)",
    date: new Date("2025-07-03"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +180K jobs"
  },
  {
    id: "fomc_jul",
    name: "FOMC Meeting",
    date: new Date("2025-07-29"),
    type: "FOMC",
    importance: "high",
    estimate: "Expected: Possible rate cut"
  },

  // August
  {
    id: "nfp_aug",
    name: "Nonfarm Payroll (July)",
    date: new Date("2025-08-01"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +170K jobs"
  },
  {
    id: "cpi_jul",
    name: "CPI Inflation (July)",
    date: new Date("2025-08-13"),
    type: "CPI",
    importance: "high",
    estimate: "Expected: 2.6% YoY"
  },

  // September
  {
    id: "nfp_sep",
    name: "Nonfarm Payroll (August)",
    date: new Date("2025-09-05"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +175K jobs"
  },
  {
    id: "fomc_sep",
    name: "FOMC Meeting",
    date: new Date("2025-09-16"),
    type: "FOMC",
    importance: "high",
    estimate: "Expected: Possible rate cut"
  },

  // October
  {
    id: "nfp_oct",
    name: "Nonfarm Payroll (September)",
    date: new Date("2025-10-03"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +180K jobs"
  },
  {
    id: "cpi_sep",
    name: "CPI Inflation (September)",
    date: new Date("2025-10-15"),
    type: "CPI",
    importance: "high",
    estimate: "Expected: 2.5% YoY"
  },

  // November
  {
    id: "nfp_nov",
    name: "Nonfarm Payroll (October)",
    date: new Date("2025-11-07"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +175K jobs"
  },
  {
    id: "fomc_nov",
    name: "FOMC Meeting",
    date: new Date("2025-11-18"),
    type: "FOMC",
    importance: "high",
    estimate: "Expected: Policy assessment"
  },

  // December
  {
    id: "nfp_dec",
    name: "Nonfarm Payroll (November)",
    date: new Date("2025-12-05"),
    type: "NFP",
    importance: "high",
    estimate: "Expected: +180K jobs"
  },
  {
    id: "fomc_dec",
    name: "FOMC Meeting",
    date: new Date("2025-12-16"),
    type: "FOMC",
    importance: "high",
    estimate: "Expected: Year-end guidance"
  },
];

/**
 * Get upcoming macro events (next 30 days)
 */
export function getUpcomingEvents(daysAhead = 30): MacroEvent[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return MACRO_CALENDAR_2025.filter(
    (event) => event.date >= now && event.date <= futureDate
  ).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get events in a specific date range
 */
export function getEventsInRange(startDate: Date, endDate: Date): MacroEvent[] {
  return MACRO_CALENDAR_2025.filter(
    (event) => event.date >= startDate && event.date <= endDate
  ).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get event on specific date
 */
export function getEventOnDate(date: Date): MacroEvent | undefined {
  const dateStr = date.toISOString().split("T")[0];
  const eventDate = new Date(dateStr);

  return MACRO_CALENDAR_2025.find(
    (event) => event.date.toISOString().split("T")[0] === dateStr
  );
}

/**
 * Get event type color
 */
export function getEventTypeColor(type: EventType): string {
  const colors: Record<EventType, string> = {
    FOMC: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    NFP: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    CPI: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700",
    PCE: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    GDP: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    PPI: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700",
    ISM: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700",
    CONSUMER_SENTIMENT: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700",
    UNEMPLOYMENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
    RETAIL_SALES: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700",
  };
  return colors[type];
}

/**
 * Get importance badge style
 */
export function getImportanceStyle(importance: EventImportance): string {
  const styles: Record<EventImportance, string> = {
    high: "bg-red-500 text-white",
    medium: "bg-orange-500 text-white",
    low: "bg-blue-500 text-white",
  };
  return styles[importance];
}

/**
 * Format date for display
 */
export function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get days until event
 */
export function getDaysUntilEvent(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = eventDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get all events for a given type
 */
export function getEventsByType(type: EventType): MacroEvent[] {
  return MACRO_CALENDAR_2025.filter((event) => event.type === type).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}
