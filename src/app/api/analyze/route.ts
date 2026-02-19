import { NextRequest, NextResponse } from "next/server";
import {
  calculateRSI,
  calculateSMA,
  calculateATR
} from "@/lib/technicalIndicators";

interface PricePoint {
  date: string;
  close: number;
  high: number;
  low: number;
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
