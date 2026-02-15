/**
 * Alpha Vantage API utilities
 * Rate limit: 5 calls per minute, 100 per day (free tier)
 */

const BASE_URL = "https://www.alphavantage.co/query";

interface TimeSeriesData {
  [date: string]: {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
  };
}

interface AlphaVantageResponse {
  "Meta Data"?: {
    "1. Information": string;
    "2. Symbol": string;
    "3. Last Refreshed": string;
    "4. Interval": string;
    "5. Output Size": string;
    "6. Time Zone": string;
  };
  "Time Series (Daily)"?: TimeSeriesData;
  "Time Series (60min)"?: TimeSeriesData;
  "Global Quote"?: {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

export type AlphaVantageErrorCode =
  | "RATE_LIMIT"
  | "USAGE_LIMIT"
  | "BAD_REQUEST"
  | "UNKNOWN";

/**
 * A typed, explicit error so callers can distinguish rate limit vs other failures.
 *
 * Note: Keep `userMessage` safe and non-technical for UI display.
 */
export class AlphaVantageError extends Error {
  public readonly code: AlphaVantageErrorCode;
  public readonly userMessage: string;
  public readonly details?: string;

  constructor(params: {
    code: AlphaVantageErrorCode;
    message: string;
    userMessage: string;
    details?: string;
  }) {
    super(params.message);
    this.name = "AlphaVantageError";
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.details = params.details;
  }
}

export function isAlphaVantageError(err: unknown): err is AlphaVantageError {
  return err instanceof AlphaVantageError;
}

function detectAlphaVantageError(data: AlphaVantageResponse): AlphaVantageError | null {
  // Alpha Vantage rate limiting frequently returns 200 OK with a payload like:
  // { "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is ..." }
  if (data.Note) {
    return new AlphaVantageError({
      code: "RATE_LIMIT",
      message: "Alpha Vantage rate limit exceeded",
      userMessage: "Rate limited — try again in a minute.",
      details: data.Note,
    });
  }

  // Usage/premium errors can surface as "Information".
  if (data.Information) {
    // Heuristic: treat anything mentioning premium/daily limit/call frequency as usage-related.
    const info = data.Information.toLowerCase();
    const usageSignals = [
      "call frequency",
      "standard api",
      "premium",
      "daily",
      "limit",
      "subscription",
    ];
    const isUsage = usageSignals.some((s) => info.includes(s));

    return new AlphaVantageError({
      code: isUsage ? "USAGE_LIMIT" : "UNKNOWN",
      message: "Alpha Vantage returned an information error",
      userMessage: isUsage
        ? "Data temporarily unavailable due to API limits — please try again later."
        : "Data temporarily unavailable — please try again later.",
      details: data.Information,
    });
  }

  // Invalid symbol / bad request patterns
  if (data["Error Message"]) {
    return new AlphaVantageError({
      code: "BAD_REQUEST",
      message: "Alpha Vantage returned an error message",
      userMessage: "We couldn’t fetch data for that ticker. Double-check the symbol and try again.",
      details: data["Error Message"],
    });
  }

  return null;
}

/**
 * Fetch daily time series data from Alpha Vantage
 */
export async function getDailyTimeSeries(ticker: string) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("function", "TIME_SERIES_DAILY");
    url.searchParams.set("symbol", ticker.toUpperCase());
    url.searchParams.set("apikey", process.env.ALPHA_VANTAGE_API_KEY || "");
    url.searchParams.set("outputsize", "compact"); // Last 100 data points

    const response = await fetch(url.toString());
    const data: AlphaVantageResponse = await response.json();

    const detected = detectAlphaVantageError(data);
    if (detected) {
      // Keep logs, but throw a typed error (no raw strings).
      console.warn(`[AV] ${detected.code}:`, detected.details || detected.message);
      throw detected;
    }

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      console.error(`[AV] No Time Series (Daily) in response`);
      console.error(`[AV] Full response:`, JSON.stringify(data).substring(0, 500));
      throw new AlphaVantageError({
        code: "UNKNOWN",
        message: "No time series data received from Alpha Vantage",
        userMessage: "Market data is temporarily unavailable — please try again.",
      });
    }

    // Convert to array and sort by date (newest first)
    const priceHistory = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        close: parseFloat(values["4. close"]),
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        volume: parseInt(values["5. volume"]),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return priceHistory;
  } catch (error) {
    console.error("Error fetching daily time series:", error);
    throw error;
  }
}

/**
 * Fetch intraday time series (60-minute intervals)
 */
export async function getIntradayTimeSeries(ticker: string) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("function", "TIME_SERIES_INTRADAY");
    url.searchParams.set("symbol", ticker.toUpperCase());
    url.searchParams.set("interval", "60min");
    url.searchParams.set("apikey", process.env.ALPHA_VANTAGE_API_KEY || "");

    const response = await fetch(url.toString());
    const data: AlphaVantageResponse = await response.json();

    const detected = detectAlphaVantageError(data);
    if (detected) throw detected;

    const timeSeries = data["Time Series (60min)"];
    if (!timeSeries) {
      throw new AlphaVantageError({
        code: "UNKNOWN",
        message: "No intraday data received from Alpha Vantage",
        userMessage: "Market data is temporarily unavailable — please try again.",
      });
    }

    // Convert to array and sort by date (newest first)
    const priceHistory = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        close: parseFloat(values["4. close"]),
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        volume: parseInt(values["5. volume"]),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return priceHistory;
  } catch (error) {
    console.error("Error fetching intraday data:", error);
    throw error;
  }
}

/**
 * Fetch global quote (current price and change)
 */
export async function getGlobalQuote(ticker: string) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("function", "GLOBAL_QUOTE");
    url.searchParams.set("symbol", ticker.toUpperCase());
    url.searchParams.set("apikey", process.env.ALPHA_VANTAGE_API_KEY || "");

    const response = await fetch(url.toString());
    const data: AlphaVantageResponse = await response.json();

    const detected = detectAlphaVantageError(data);
    if (detected) throw detected;

    const quote = data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      throw new AlphaVantageError({
        code: "UNKNOWN",
        message: "No quote data received from Alpha Vantage",
        userMessage: "Market data is temporarily unavailable — please try again.",
      });
    }

    return {
      symbol: quote["01. symbol"],
      price: parseFloat(quote["05. price"]),
      open: parseFloat(quote["02. open"]),
      high: parseFloat(quote["03. high"]),
      low: parseFloat(quote["04. low"]),
      volume: parseInt(quote["06. volume"]),
      latestTradingDay: quote["07. latest trading day"],
      previousClose: parseFloat(quote["08. previous close"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"]),
    };
  } catch (error) {
    console.error("Error fetching global quote:", error);
    throw error;
  }
}

/**
 * Mock fundamentals (Alpha Vantage free tier doesn't include fundamentals)
 * In a production app, you'd use another API like Yahoo Finance or a financial data service
 */
export function generateMockFundamentals(ticker: string) {
  // Generate consistent but varied mock data based on ticker
  const hash = ticker
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    pe: 15 + (hash % 40),
    evEbitda: 10 + (hash % 25),
    epsGrowth: 5 + (hash % 20),
    dividendYield: (hash % 40) / 100,
  };
}
