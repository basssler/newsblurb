/**
 * Calendar Analysis API Endpoint
 * GET /api/calendar-analysis?ticker=AAPL&eventId=nfp_jan
 *
 * Provides stock-specific AI analysis of how macro events impact selected stocks
 * Uses Claude AI to generate contextual insights based on stock fundamentals and event type
 */

import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  getUpcomingEvents,
  MacroEvent,
} from "@/lib/macro/macroEventCalendar";
import { fetchRealMacroData } from "@/lib/realMacroData";
import { getCache, setCache, getCacheKey } from "@/lib/cache/kv";

interface CalendarAnalysis {
  ticker: string;
  eventId: string;
  eventName: string;
  eventType: string;
  stockImpactAnalysis: string;
  riskLevel: "high" | "medium" | "low";
  positionAdvice: string;
  correlationInsights: string;
  historicalContext: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    const eventId = searchParams.get("eventId");

    // Validate inputs
    if (!ticker || ticker.length < 1 || ticker.length > 5) {
      return NextResponse.json(
        { error: "Invalid ticker symbol" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    const tickerUpper = ticker.toUpperCase();

    // Check cache first
    const cacheKey = getCacheKey("macro", `calendar-${tickerUpper}-${eventId}`);
    const cached = await getCache(cacheKey);

    if (cached) {
      console.log(`[CALENDAR-ANALYSIS] Cache HIT for ${tickerUpper}:${eventId}`);
      return NextResponse.json(cached);
    }

    console.log(
      `[CALENDAR-ANALYSIS] Cache MISS for ${tickerUpper}:${eventId}`
    );

    // Find the event
    const events = getUpcomingEvents(365);
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return NextResponse.json(
        { error: `Event ${eventId} not found` },
        { status: 404 }
      );
    }

    // Fetch current macro data for context
    const macroData = await fetchRealMacroData();

    // Generate AI analysis
    const client = new Anthropic();

    const prompt = `You are a financial analyst specializing in macro-economic event analysis and stock market impact.

Analyze how the following macro event will impact ${tickerUpper} stock specifically:

EVENT INFORMATION:
- Event Name: ${event.name}
- Event Type: ${event.type}
- Importance: ${event.importance.toUpperCase()}
- Date: ${event.date.toDateString()}
${event.estimate ? `- Consensus Estimate: ${event.estimate}` : ""}
${event.historicalImpact ? `- Historical Avg Stock Move: ${event.historicalImpact.avgStockMove}%` : ""}
${event.historicalImpact ? `- Typical Direction: ${event.historicalImpact.direction}` : ""}

CURRENT MACRO ENVIRONMENT:
- VIX (Volatility): ${macroData.vix.value}
- Fed Funds Rate: ${macroData.fedFundsRate.value}%
- Unemployment Rate: ${macroData.unemploymentRate.value}%
- Inflation Rate: ${macroData.inflationRate.value}%
- 10Y Yield: ${macroData.yield10y.value}%

STOCK TICKER: ${tickerUpper}

Please provide your analysis in the following format:

STOCK IMPACT ANALYSIS:
[2-3 sentences on how this specific event typically impacts ${tickerUpper}, considering the sector and current macro environment]

RISK LEVEL:
[HIGH/MEDIUM/LOW - rate the volatility risk for ${tickerUpper} on this event]

POSITION ADVICE:
[1-2 sentences on whether investors should reduce exposure, maintain positions, or look for opportunities]

CORRELATION INSIGHTS:
[1-2 sentences on how this event correlates with ${tickerUpper}'s typical market movements]

HISTORICAL CONTEXT:
[1-2 sentences on what happened to ${tickerUpper} during similar events in the past]`;

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const analysisText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the response sections
    const parseSection = (text: string, sectionName: string): string => {
      const regex = new RegExp(
        `${sectionName}:?\\s*(.+?)(?=\\n(?:[A-Z]+[\\s\\w]+:|$))`,
        "is"
      );
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const analysis: CalendarAnalysis = {
      ticker: tickerUpper,
      eventId,
      eventName: event.name,
      eventType: event.type,
      stockImpactAnalysis: parseSection(analysisText, "STOCK IMPACT ANALYSIS"),
      riskLevel: parseRiskLevel(parseSection(analysisText, "RISK LEVEL")),
      positionAdvice: parseSection(analysisText, "POSITION ADVICE"),
      correlationInsights: parseSection(analysisText, "CORRELATION INSIGHTS"),
      historicalContext: parseSection(analysisText, "HISTORICAL CONTEXT"),
    };

    // Cache for 7 days (calendar events don't change frequently)
    await setCache(cacheKey, analysis, 7 * 24 * 60 * 60);

    console.log(
      `[CALENDAR-ANALYSIS] Generated analysis for ${tickerUpper}:${eventId}`
    );

    return NextResponse.json(analysis);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[CALENDAR-ANALYSIS] Error:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to generate calendar analysis",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

function parseRiskLevel(text: string): "high" | "medium" | "low" {
  const lower = text.toLowerCase();
  if (lower.includes("high")) return "high";
  if (lower.includes("medium")) return "medium";
  if (lower.includes("low")) return "low";
  return "medium"; // default
}
