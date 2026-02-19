import { NextRequest, NextResponse } from "next/server";

interface CopilotRequest {
    message: string;
    action?: "explain" | "define" | "summarize" | "chat";
    selectedText?: string;
    context?: {
        ticker?: string;
        horizon?: string;
        fundamentals?: {
            pe: number;
            evEbitda: number;
            epsGrowth: number;
            dividendYield: number;
        };
        technicals?: {
            rsi: number;
            sma20: number;
            sma50: number;
            atr: number;
            currentPrice: number;
        };
    };
    history?: Array<{ role: "user" | "assistant"; content: string }>;
}

function buildSystemPrompt(context?: CopilotRequest["context"]): string {
    let systemPrompt = `You are a financial analysis copilot embedded inside NewsBlurb, a stock analysis application. You help users understand stock data, financial concepts, and market trends.

Keep your responses concise, helpful, and educational. Use clear language. When relevant, reference the user's current analysis context.

Formatting rules:
- Use markdown for formatting
- Use **bold** for key terms
- Use bullet points for lists
- Keep responses under 300 words unless the user asks for detail`;

    if (context?.ticker) {
        systemPrompt += `\n\nThe user is currently viewing analysis for **${context.ticker}**.`;
        if (context.technicals) {
            systemPrompt += `\nCurrent price: $${context.technicals.currentPrice?.toFixed(2)}`;
            systemPrompt += `\nRSI: ${context.technicals.rsi?.toFixed(1)}`;
            systemPrompt += `\nSMA20: $${context.technicals.sma20?.toFixed(2)}, SMA50: $${context.technicals.sma50?.toFixed(2)}`;
            systemPrompt += `\nATR: $${context.technicals.atr?.toFixed(2)}`;
        }
        if (context.fundamentals) {
            systemPrompt += `\nP/E: ${context.fundamentals.pe?.toFixed(1)}, EV/EBITDA: ${context.fundamentals.evEbitda?.toFixed(1)}`;
            systemPrompt += `\nEPS Growth: ${context.fundamentals.epsGrowth?.toFixed(1)}%, Dividend Yield: ${context.fundamentals.dividendYield?.toFixed(2)}%`;
        }
        if (context.horizon) {
            systemPrompt += `\nAnalysis horizon: ${context.horizon}`;
        }
    }

    return systemPrompt;
}

function buildActionPrompt(
    action: string,
    selectedText: string,
    ticker?: string
): string {
    const tickerContext = ticker ? ` in the context of ${ticker} stock analysis` : "";

    switch (action) {
        case "explain":
            return `Explain the following text${tickerContext} in simple terms. Be clear and educational:\n\n"${selectedText}"`;
        case "define":
            return `Define the key financial/technical terms found in the following text${tickerContext}. For each term, give a brief, clear definition:\n\n"${selectedText}"`;
        case "summarize":
            return `Summarize the following text${tickerContext} into 2-3 concise bullet points:\n\n"${selectedText}"`;
        default:
            return selectedText;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: CopilotRequest = await request.json();
        const { message, action, selectedText, context, history } = body;

        if (!message && !selectedText) {
            return NextResponse.json(
                { error: "Message or selected text is required" },
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

        // Build the prompt
        const systemPrompt = buildSystemPrompt(context);
        let userMessage: string;

        if (action && selectedText) {
            userMessage = buildActionPrompt(action, selectedText, context?.ticker);
        } else {
            userMessage = message;
        }

        // Build messages array with conversation history
        const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

        if (history && history.length > 0) {
            // Include last 10 messages for context window management
            const recentHistory = history.slice(-10);
            messages.push(...recentHistory);
        }

        messages.push({ role: "user", content: userMessage });

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
                max_tokens: 800,
                system: systemPrompt,
                messages,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Copilot API error:", error);

            if (response.status === 429) {
                return NextResponse.json(
                    { error: "Rate limit reached. Please wait a moment and try again." },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                { error: "Failed to generate response" },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.content[0]?.text;

        if (!content) {
            return NextResponse.json(
                { error: "No response generated" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            response: content,
            action: action || "chat",
        });
    } catch (error) {
        console.error("Error in /api/copilot:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
