import { NextRequest, NextResponse } from "next/server";
import { getMacroIndicators } from "@/lib/macroData";
import { generateCorrelationInsights, generateTradeIdeas, formatInsightsSummary, getSectorMacroSensitivities } from "@/lib/correlationAnalysis";

interface AnalysisData {
  ticker: string;
  fundamentals: {
    pe: number;
    evEbitda: number;
    epsGrowth: number;
    dividendYield: number;
  };
  technicals: {
    rsi: number;
    sma20: number;
    sma50: number;
    atr: number;
    currentPrice: number;
  };
  priceHistory: Array<{ date: string; close: number }>;
}

interface MacroContext {
  dxy: number | null;
  gold: number | null;
  oil: number | null;
  sp500: number | null;
  vix: number | null;
  yield10y: number | null;
  correlationSummary: string;
  tradeIdeas: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisData = await request.json();
    const { ticker, fundamentals, technicals, priceHistory } = body;

    if (!ticker || !fundamentals || !technicals) {
      return NextResponse.json(
        { error: "Ticker, fundamentals, and technicals data are required" },
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

    // Fetch macro indicators
    let macroContext: MacroContext = {
      dxy: null,
      gold: null,
      oil: null,
      sp500: null,
      vix: null,
      yield10y: null,
      correlationSummary: "",
      tradeIdeas: [],
    };

    try {
      const macroData = await getMacroIndicators();
      macroContext = {
        ...macroData,
        correlationSummary: "",
        tradeIdeas: [],
      };

      // Generate correlation insights
      const correlationInsights = generateCorrelationInsights(
        technicals.currentPrice,
        priceHistory,
        macroData as unknown as Record<string, number | null>,
        "Technology" // Default sector - could be passed in future
      );

      macroContext.correlationSummary = formatInsightsSummary(
        correlationInsights
      );
      macroContext.tradeIdeas = generateTradeIdeas(
        correlationInsights,
        technicals.currentPrice,
        technicals.rsi
      );
    } catch (error) {
      console.warn("Failed to fetch macro data, continuing without macro analysis");
    }

    // Calculate price change
    const priceStart = priceHistory[0]?.close || technicals.currentPrice;
    const priceEnd = technicals.currentPrice;
    const priceChange = ((priceEnd - priceStart) / priceStart) * 100;

    // Determine RSI interpretation
    const rsiInterpretation =
      technicals.rsi > 70
        ? "Overbought (potential pullback risk)"
        : technicals.rsi < 30
          ? "Oversold (potential recovery opportunity)"
          : "Neutral (balanced momentum)";

    // Determine trend based on moving averages
    const trendDirection = technicals.currentPrice > technicals.sma20
      ? "above short-term average (bullish)"
      : "below short-term average (bearish)";

    // Build macro context section for prompt
    const macroContextSection = macroContext.correlationSummary
      ? `
**Macro Market Context:**
- Dollar Index (DXY): ${macroContext.dxy?.toFixed(2) || "N/A"}
- VIX (Fear Index): ${macroContext.vix?.toFixed(1) || "N/A"}
- 10Y Treasury Yield: ${macroContext.yield10y?.toFixed(2) || "N/A"}%
- Oil Price: $${macroContext.oil?.toFixed(2) || "N/A"}
- Gold Price: $${macroContext.gold?.toFixed(2) || "N/A"}
- S&P 500: ${macroContext.sp500?.toFixed(0) || "N/A"}

**Macro Correlation Analysis:**
${macroContext.correlationSummary}

**Macro-Informed Trade Ideas:**
${macroContext.tradeIdeas.map((idea) => `- ${idea}`).join("\n")}`
      : "";

    // Create the prompt for Claude
    const prompt = `You are a financial analyst specializing in stock market education and macro analysis. Analyze the following stock data with macro context and provide insights:

**Stock:** ${ticker}
**Current Price:** $${technicals.currentPrice.toFixed(2)}
**Period Change:** ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%

**Fundamental Metrics:**
- P/E Ratio: ${fundamentals.pe.toFixed(1)} (Market average: ~25)
- EV/EBITDA: ${fundamentals.evEbitda.toFixed(1)} (indicates valuation efficiency)
- EPS Growth: ${fundamentals.epsGrowth.toFixed(1)}%
- Dividend Yield: ${fundamentals.dividendYield.toFixed(2)}%

**Technical Indicators:**
- RSI (14): ${technicals.rsi.toFixed(0)} - ${rsiInterpretation}
- Price Position: ${trendDirection}
- SMA 20: $${technicals.sma20.toFixed(2)}
- SMA 50: $${technicals.sma50.toFixed(2)}
- ATR (Volatility): $${technicals.atr.toFixed(2)}
${macroContextSection}

Provide analysis as a JSON object with this exact structure:
{
  "headline": "A compelling 1-2 sentence headline about ${ticker}'s current trading setup and macro context",
  "summary": "A 3-4 sentence analysis explaining how fundamentals, technicals, AND macro environment work together. Include DXY, rates, and market sentiment implications.",
  "bullets": [
    "First key insight combining fundamentals with macro backdrop",
    "Second key insight about technical positioning in current macro environment",
    "Third key insight with specific macro-driven risk or opportunity (e.g. rate sensitivity, dollar exposure)"
  ],
  "learningPoint": "An educational insight about macro analysis: explain how global factors like rates, dollar, and commodities impact individual stocks. Use ${ticker} as the example."
}

Return ONLY the JSON object, no markdown or extra text.`;

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Anthropic API error:", error);
      return NextResponse.json(
        { error: "Failed to generate analysis" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: "No content from API" },
        { status: 500 }
      );
    }

    // Try to parse the JSON response
    try {
      // First, clean any markdown code blocks
      let cleanContent = content.trim();
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, ""); // Remove opening markdown
      cleanContent = cleanContent.replace(/\s*```$/i, ""); // Remove closing markdown
      cleanContent = cleanContent.trim();

      const analysis = JSON.parse(cleanContent);
      return NextResponse.json({
        ...analysis,
        macroContext,
      });
    } catch {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          let extracted = jsonMatch[0];
          // Clean any remaining markdown from extracted JSON
          extracted = extracted.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const analysis = JSON.parse(extracted);
          return NextResponse.json({
            ...analysis,
            macroContext,
          });
        } catch (parseError) {
          console.error("Failed to parse extracted JSON:", parseError);
        }
      }

      // Fallback response
      return NextResponse.json({
        headline: `${ticker} shows mixed signals`,
        summary: content.substring(0, 200),
        bullets: ["RSI near neutral levels", "Price near moving averages", "Fundamentals stable"],
        learningPoint: "Technical and fundamental analysis work together",
        macroContext,
      });
    }
  } catch (error) {
    console.error("Error in /api/explain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
