import { NextRequest, NextResponse } from "next/server";
import {
  AnalysisPerspective,
  buildAnalysisVariables,
  callConsolePerspective,
} from "@/lib/consolePrompts";
import { getMacroIndicators } from "@/lib/macroData";

interface PerspectiveRequest {
  ticker: string;
  perspective: AnalysisPerspective;
  fundamentals: {
    pe: number;
    evEbitda?: number;
    epsGrowth?: number;
    dividendYield?: number;
  };
  technicals: {
    rsi: number;
    sma20: number;
    sma50: number;
    atr: number;
    currentPrice: number;
  };
  priceHistory: Array<{ date: string; close: number }>;
  regimeAnalysis?: { currentRegime: string; volatilityRating: string };
  betaAnalysis?: { currentBeta: number };
}

export async function POST(request: NextRequest) {
  try {
    const body: PerspectiveRequest = await request.json();
    const { ticker, perspective, fundamentals, technicals, priceHistory, regimeAnalysis, betaAnalysis } = body;

    // Validation
    if (!ticker || !perspective || !fundamentals || !technicals) {
      return NextResponse.json(
        { error: "ticker, perspective, fundamentals, and technicals are required" },
        { status: 400 }
      );
    }

    // Validate perspective
    const validPerspectives: AnalysisPerspective[] = ["bullish", "bearish", "risk", "options", "macro"];
    if (!validPerspectives.includes(perspective)) {
      return NextResponse.json(
        {
          error: `Invalid perspective. Must be one of: ${validPerspectives.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Fetch macro data for variables
    let macroData = null;
    try {
      macroData = await getMacroIndicators();
    } catch (error) {
      console.warn("Failed to fetch macro data for Console prompt variables");
    }

    // Build variables for Console prompt
    const variables = buildAnalysisVariables(
      ticker,
      technicals.currentPrice,
      fundamentals,
      technicals,
      priceHistory,
      macroData as any,
      regimeAnalysis,
      betaAnalysis
    );

    console.log(`[EXPLAIN-PERSPECTIVE] Calling ${perspective} perspective for ${ticker}`);
    console.log(`[EXPLAIN-PERSPECTIVE] API Key present:`, !!apiKey);
    console.log(`[EXPLAIN-PERSPECTIVE] Variables:`, variables);

    // Call Console prompt
    console.log(`[EXPLAIN-PERSPECTIVE] About to call callConsolePerspective...`);
    const analysis = await callConsolePerspective(perspective, variables, apiKey);
    console.log(`[EXPLAIN-PERSPECTIVE] callConsolePerspective returned successfully`);

    // Try to parse as JSON (some perspectives return structured data)
    let parsedAnalysis: any = { content: analysis };
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If not JSON, just return as text content
      parsedAnalysis = { content: analysis };
    }

    console.log(`[EXPLAIN-PERSPECTIVE] Analysis for ${perspective}:`, parsedAnalysis);

    return NextResponse.json({
      perspective,
      ticker,
      analysis: parsedAnalysis,
      variables, // Return variables used for transparency
    });
  } catch (error) {
    console.error("[EXPLAIN-PERSPECTIVE] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate perspective analysis", details: errorMessage },
      { status: 500 }
    );
  }
}
