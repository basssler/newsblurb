/**
 * Unit tests for Alpha Vantage rate limit parsing / handling.
 */

import { getDailyTimeSeries, AlphaVantageError } from "@/lib/alphaVantage";

describe("Alpha Vantage rate limit handling", () => {
  beforeEach(() => {
    process.env.ALPHA_VANTAGE_API_KEY = "test";
  });

  afterEach(() => {
    // @ts-expect-error - test cleanup
    global.fetch = undefined;
  });

  it("should throw a typed AlphaVantageError with code RATE_LIMIT when AV returns Note", async () => {
    // Mock fetch() returning a Note payload
    // @ts-expect-error - mocking fetch
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        Note:
          "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 100 calls per day.",
      }),
    });

    await expect(getDailyTimeSeries("AAPL")).rejects.toEqual(
      expect.objectContaining({
        name: "AlphaVantageError",
        code: "RATE_LIMIT",
        userMessage: expect.stringContaining("Rate limited"),
      })
    );

    await expect(getDailyTimeSeries("AAPL")).rejects.toBeInstanceOf(
      AlphaVantageError
    );
  });
});
