import { NextRequest, NextResponse } from "next/server";

interface PricePoint {
  date: string;
  close: number;
}

// Calculate RSI (Relative Strength Index) - 14 period
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Return neutral RSI if not enough data
  }

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate subsequent averages
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Math.round(rsi * 100) / 100;
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  const slice = prices.slice(-period);
  return Math.round((slice.reduce((a, b) => a + b, 0) / period) * 100) / 100;
}

// Calculate Average True Range
function calculateATR(
  priceHistory: PricePoint[],
  period: number = 14
): number {
  if (priceHistory.length < 2) {
    return 0;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i].close;
    const previous = priceHistory[i - 1].close;

    // True Range = max(current - previous, |current - previous|)
    const tr = Math.abs(current - previous);
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    return (
      Math.round(
        (trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length) * 100
      ) / 100
    );
  }

  const atr =
    Math.round(
      (trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period) * 100
    ) / 100;
  return atr;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceHistory, ticker } = body;

    if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length === 0) {
      return NextResponse.json(
        { error: "Price history array is required" },
        { status: 400 }
      );
    }

    // Extract prices for calculations
    const prices = priceHistory.map((p: PricePoint) => p.close);

    // Calculate indicators
    const rsi = calculateRSI(prices, 14);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const atr = calculateATR(priceHistory, 14);

    const analysisData = {
      ticker: ticker || "UNKNOWN",
      rsi: Math.round(rsi * 100) / 100,
      sma20,
      sma50,
      atr,
      currentPrice: prices[prices.length - 1],
    };

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
