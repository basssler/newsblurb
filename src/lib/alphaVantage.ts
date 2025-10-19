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

    console.log(`[AV] Fetching daily data for ${ticker}`);
    console.log(`[AV] URL: ${url.toString().replace(/apikey=[^&]*/, "apikey=***")}`);

    const response = await fetch(url.toString());
    const data: AlphaVantageResponse = await response.json();

    console.log(`[AV] Response status: ${response.status}`);
    console.log(`[AV] Response keys:`, Object.keys(data));

    // Check for API errors
    if (data.Note) {
      console.error(`[AV] Note/Error:`, data.Note);
      throw new Error(`Alpha Vantage rate limit or error: ${data.Note}`);
    }

    if (data.Information) {
      console.error(`[AV] Information error:`, data.Information);
      throw new Error(`Alpha Vantage error: ${data.Information}`);
    }

    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      console.error(`[AV] No Time Series (Daily) in response`);
      console.error(`[AV] Full response:`, JSON.stringify(data).substring(0, 500));
      throw new Error("No time series data received from Alpha Vantage");
    }

    console.log(`[AV] Received ${Object.keys(timeSeries).length} data points`);

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

    // Check for API errors
    if (data.Note) {
      throw new Error(`Alpha Vantage rate limit: ${data.Note}`);
    }

    const timeSeries = data["Time Series (60min)"];
    if (!timeSeries) {
      throw new Error("No intraday data received");
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

    // Check for API errors
    if (data.Note) {
      throw new Error(`Alpha Vantage rate limit: ${data.Note}`);
    }

    const quote = data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      throw new Error("No quote data received");
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
