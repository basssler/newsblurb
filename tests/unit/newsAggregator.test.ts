import { getStockNews } from "@/lib/newsAggregator";

jest.mock("@/lib/cache/kv", () => {
  return {
    getCache: jest.fn(async () => null),
    setCache: jest.fn(async () => undefined),
    getCacheKey: jest.fn((namespace: string, key: string) => `${namespace}:${key}`),
  };
});

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  return {
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

describe("newsAggregator AI parsing/normalization", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-15T22:00:00.000Z"));
    mockCreate.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("happy path: parses Anthropic response into structured insights", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: `INSIGHT 1:
TITLE: Breakout Setup
SUMMARY: Price action suggests a potential breakout if volume confirms. Watch key resistance and be ready for a reversal if macro sentiment turns.
SENTIMENT: positive
IMPACT: high

INSIGHT 2:
TITLE: Valuation Check
SUMMARY: Fundamentals look mixed relative to peers; earnings surprises could shift sentiment quickly.
SENTIMENT: neutral
IMPACT: medium`,
        },
      ],
    });

    const articles = await getStockNews("AAPL", 0); // force fresh generation

    expect(articles.length).toBeGreaterThanOrEqual(2);

    expect(articles[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        summary: expect.any(String),
        source: "AI-Generated Analysis",
        sentiment: expect.stringMatching(/^(positive|neutral|negative)$/),
        impact: expect.stringMatching(/^(high|medium|low)$/),
        relevanceScore: expect.any(Number),
      })
    );
  });

  test("edge case: missing fields / extra text does not throw and uses safe fallbacks", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: `Some preface that shouldn't break parsing.

INSIGHT 1:
TITLE: Momentum Shift
SUMMARY: The market is choppy; tighten risk and watch for confirmation.

Random trailing text.
INSIGHT 2:
SUMMARY: Missing title and sentiment/impact, but should still be safe.`,
        },
      ],
    });

    const articles = await getStockNews("TSLA", 0);

    expect(articles.length).toBeGreaterThanOrEqual(1);

    // Ensure we never crash and we provide defaults when fields are absent
    const a1 = articles.find((a) => a.id.includes("ai-insight-TSLA-0"));
    expect(a1).toBeTruthy();
    expect(a1).toEqual(
      expect.objectContaining({
        title: "Momentum Shift",
        sentiment: "neutral",
        impact: "medium",
        source: "AI-Generated Analysis",
      })
    );

    const a2 = articles.find((a) => a.id.includes("ai-insight-TSLA-1"));
    if (a2) {
      expect(a2.title).toMatch(/Market Insight 2/);
      expect(a2.sentiment).toBe("neutral");
      expect(a2.impact).toBe("medium");
    }
  });

  test("malformed/empty model response results in graceful fallback (no crash)", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "" }],
    });

    const articles = await getStockNews("MSFT", 0);

    expect(articles).toHaveLength(1);
    expect(articles[0]).toEqual(
      expect.objectContaining({
        title: "Market Analysis",
        summary: expect.stringContaining("AI-generated"),
        sentiment: "neutral",
        impact: "medium",
        source: "AI-Generated Analysis",
      })
    );
  });
});
