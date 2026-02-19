
import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import { getDailyTimeSeries } from '../src/lib/alphaVantage';
import { fetchMacroHistory } from '../src/lib/realMacroData';
import { calculateRSI, calculateSMA, calculateBollingerBands } from '../src/lib/technicalIndicators';

// Manually load .env.local
try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {
    console.warn("⚠️ Could not load .env.local");
}

// Configuration
const OUTPUT_FILE = 'training_data.jsonl';
const TARGET_TICKERS = ['AAPL', 'NVDA', 'TSLA', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META', 'JPM', 'XOM'];
const HISTORY_DAYS = 100;
const SAMPLES_PER_TICKER = 5; // Generate 5 scenarios per ticker (total 50) to save API costs for demo

// Helper: Calculate Rolling Correlation (Beta)
function calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

// MOCK MODE: Generate synthetic data to bypass API rate limits
// Real world implementation would use the fetchers, but for this demo/training setup we simulate market movements.
async function main() {
    console.log("🚀 Starting NewsBlurb Quant Dataset Generator (Synthetic Mode)...");

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("❌ ANTHROPIC_API_KEY is missing in .env.local");
        process.exit(1);
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const dataset: any[] = [];

    // Generate 20 diverse scenarios
    const SCENARIOS = [
        { type: "Bull Market", trend: 1, vol: 0.01, macro: { vix: 12, yield: 3.5, oil: 70 } },
        { type: "Bear Crash", trend: -2, vol: 0.04, macro: { vix: 35, yield: 4.5, oil: 90 } },
        { type: "Stagflation", trend: -0.5, vol: 0.02, macro: { vix: 22, yield: 5.2, oil: 110 } },
        { type: "Tech Rally", trend: 1.5, vol: 0.02, macro: { vix: 16, yield: 4.1, oil: 75 } },
        { type: "Choppy", trend: 0, vol: 0.03, macro: { vix: 20, yield: 4.0, oil: 80 } },
    ];

    for (const ticker of TARGET_TICKERS) {
        console.log(`\n📈 Processing ${ticker} scenarios...`);

        // Generate 3 scenarios per ticker
        for (let i = 0; i < 3; i++) {
            const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];

            // Synthesize last 50 days of prices based on scenario
            let price = 100 + Math.random() * 500; // Random start price
            const closes: number[] = [];
            const dates: string[] = [];

            // Generate random walk
            for (let d = 50; d >= 0; d--) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                dates.push(date.toISOString().split('T')[0]);

                const change = (Math.random() - 0.5 + (scenario.trend * 0.01)) * scenario.vol;
                price = price * (1 + change);
                closes.push(price);
            }

            const currentPrice = closes[closes.length - 1];

            // Calculate Indicators
            const rsi = calculateRSI(closes, 14);
            const sma50 = calculateSMA(closes, 50);
            const bbands = calculateBollingerBands(closes, 20, 2);

            // Mock Correlation
            const correlation = (Math.random() * 0.8) + (scenario.type.includes("Bear") ? 0.2 : 0);

            // Construct Quant Input
            const quantInput = {
                date: dates[dates.length - 1],
                ticker: ticker,
                scenario_context: scenario.type, // Hidden context for debugging
                price: parseFloat(currentPrice.toFixed(2)),
                changePercent: parseFloat(((currentPrice - closes[closes.length - 2]) / closes[closes.length - 2] * 100).toFixed(2)),
                technical: {
                    rsi: rsi,
                    sma50_diff_percent: sma50 ? parseFloat(((currentPrice - sma50) / sma50 * 100).toFixed(2)) : 0,
                    bb_width_percent: bbands ? parseFloat(((bbands.upper - bbands.lower) / bbands.middle * 100).toFixed(2)) : 0
                },
                macro: {
                    vix: scenario.macro.vix + (Math.random() * 2 - 1),
                    yield10y: scenario.macro.yield + (Math.random() * 0.2 - 0.1),
                    oil: scenario.macro.oil + (Math.random() * 5 - 2.5),
                    inflation_proxy: 2.5 + (Math.random() * 1),
                },
                correlation_sp500: parseFloat(correlation.toFixed(2))
            };

            // Generate "Teacher" Output
            const prompt = `You are an elite Quant Analyst.
Analyse the following data snapshot for ${ticker}.
Combine the Technicals, Macro environment (VIX=${quantInput.macro.vix.toFixed(1)}), and Market Correlation to output a unique, sharp insight.

DATA:
${JSON.stringify(quantInput, null, 2)}

STYLE GUIDE:
- Be concise (max 2 sentences).
- Use financial slang ("risk-on", "chasing alpha", "capitulation", "dead cat bounce").
- If VIX is high (>25), focus on fear/hedging.
- If Correlation is low, call it "decoupled".

OUTPUT FORMAT:
Just the insight text. No preamble.`;

            /*
            try {
                const response = await anthropic.messages.create({
                  model: "claude-3-5-sonnet-latest",
                  max_tokens: 150,
                  messages: [{ role: "user", content: prompt }]
                });
                const outputText = response.content[0].type === 'text' ? response.content[0].text : "";
            */
            // MOCK OUTPUT to ensure file generation works
            const outputText = `[QUANT INSIGHT] Risk-${scenario.type.includes("Bull") ? "ON" : "OFF"}. ` +
                `RSI is ${quantInput.technical.rsi}, aligned with ${scenario.type} macro regime (VIX ${quantInput.macro.vix.toFixed(1)}). ` +
                `Correlation ${correlation.toFixed(2)} suggests ${correlation > 0.7 ? "beta-driven move" : "idiosyncratic alpha opportunity"}.`;

            const trainingExample = {
                instruction: JSON.stringify(quantInput),
                output: outputText
            };

            fs.appendFileSync(OUTPUT_FILE, JSON.stringify(trainingExample) + "\n");
            console.log(`  ✅ [${scenario.type}] ${outputText.substring(0, 60)}...`);

            /*
            } catch (err) {
                console.error("  ❌ API Error:", err);
            }
            */
        }
    }

    console.log(`\n🎉 Dataset generation complete! Saved to ${OUTPUT_FILE}`);
}

main();
