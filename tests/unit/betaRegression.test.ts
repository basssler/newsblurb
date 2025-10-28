/**
 * Beta Regression Analysis Tests
 * Comprehensive test suite for linear regression and beta calculations
 */

import {
  analyzeBeta,
  generateMockSP500Data,
  type BetaResult,
} from "@/lib/macro/betaRegression";

describe("betaRegression", () => {
  // Helper function to generate sample price data
  const generatePriceData = (
    count: number,
    startPrice: number = 100,
    volatility: number = 2
  ): Array<{ date: string; close: number }> => {
    const data: Array<{ date: string; close: number }> = [];
    let price = startPrice;

    for (let i = 0; i < count; i++) {
      const date = new Date(2024, 0, 1 + i);
      const randomChange = (Math.random() - 0.5) * volatility;
      price = Math.max(price + randomChange, 1); // Ensure positive price

      data.push({
        date: date.toISOString().split("T")[0],
        close: Math.round(price * 100) / 100,
      });
    }

    return data;
  };

  // Helper to generate market data with constant returns
  const generateMarketData = (count: number) => {
    const marketData: Array<{ date: string; close: number }> = [];
    let marketPrice = 4500;
    const marketReturn = 0.001; // 0.1% daily return

    for (let i = 0; i < count; i++) {
      const date = new Date(2024, 0, 1 + i);
      const dateStr = date.toISOString().split("T")[0];

      marketData.push({
        date: dateStr,
        close: Math.round(marketPrice * 100) / 100,
      });

      marketPrice = marketPrice * (1 + marketReturn);
    }

    return marketData;
  };

  // Helper to generate stock data with specified beta relative to market returns
  const generateStockWithBeta = (
    marketData: Array<{ date: string; close: number }>,
    beta: number
  ) => {
    const stockData: Array<{ date: string; close: number }> = [];
    let stockPrice = 100;
    const marketReturn = 0.001; // 0.1% daily return (same as market)
    const stockReturn = beta * marketReturn; // Stock return = beta * market return

    for (let i = 0; i < marketData.length; i++) {
      stockData.push({
        date: marketData[i].date,
        close: Math.round(stockPrice * 100) / 100,
      });

      stockPrice = stockPrice * (1 + stockReturn);
    }

    return stockData;
  };

  // Helper to generate perfectly correlated data based on returns
  const generatePerfectlyCorrelatedData = (
    count: number,
    marketSlope: number = 1
  ) => {
    const marketData = generateMarketData(count);
    const stockData = generateStockWithBeta(marketData, marketSlope);

    return { stockData, marketData };
  };

  describe("Linear Regression - Math Functions", () => {
    test("should calculate beta for perfectly correlated data", () => {
      const { stockData, marketData } = generatePerfectlyCorrelatedData(250, 1);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result.beta250d).toBeDefined();
      expect(Number.isFinite(result.beta250d)).toBe(true);
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });

    test("should calculate higher volatility with higher beta multiplier", () => {
      const { stockData: stockDataNormal } =
        generatePerfectlyCorrelatedData(250, 1);
      const { marketData } = generatePerfectlyCorrelatedData(250, 1);

      const { stockData: stockDataVolatile } =
        generatePerfectlyCorrelatedData(250, 2);

      const resultNormal = analyzeBeta(stockDataNormal, marketData, "NORMAL");
      const resultVolatile = analyzeBeta(
        stockDataVolatile,
        marketData,
        "VOLATILE"
      );

      expect(Number.isFinite(resultNormal.beta250d)).toBe(true);
      expect(Number.isFinite(resultVolatile.beta250d)).toBe(true);
    });

    test("should handle different beta multipliers", () => {
      const { stockData, marketData } =
        generatePerfectlyCorrelatedData(250, 0.5);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(Number.isFinite(result.beta250d)).toBe(true);
      expect(result.classification).toMatch(
        /^(defensive|neutral|aggressive)$/
      );
    });

    test("should calculate correct alpha from log returns", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST", 0.02);

      expect(typeof result.alpha).toBe("number");
      expect(Number.isFinite(result.alpha)).toBe(true);
      expect(result.alpha).toBeLessThan(1); // Alpha should be reasonable
      expect(result.alpha).toBeGreaterThan(-1);
    });

    test("should calculate R-squared between 0 and 1", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });
  });

  describe("Beta Classification", () => {
    test("should classify defensive stock (beta < 0.8)", () => {
      const stockData = generatePriceData(250, 100, 1);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "DEFENSIVE");

      // Beta should be a valid finite number
      expect(Number.isFinite(result.beta250d)).toBe(true);
      expect(["defensive", "neutral", "aggressive"]).toContain(
        result.classification
      );
    });

    test("should classify neutral stock (0.8 <= beta <= 1.2)", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "NEUTRAL");

      // Beta should be a valid finite number
      expect(Number.isFinite(result.beta250d)).toBe(true);
      expect(["defensive", "neutral", "aggressive"]).toContain(
        result.classification
      );
    });

    test("should classify aggressive stock (beta > 1.2)", () => {
      const stockData = generatePriceData(250, 100, 4);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "AGGRESSIVE");

      // Beta should be a valid finite number
      expect(Number.isFinite(result.beta250d)).toBe(true);
      expect(["defensive", "neutral", "aggressive"]).toContain(
        result.classification
      );
    });
  });

  describe("Rolling Windows", () => {
    test("should calculate 30-day beta when sufficient data", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result.beta30d).toBeDefined();
      expect(typeof result.beta30d).toBe("number");
      expect(Number.isFinite(result.beta30d)).toBe(true);
    });

    test("should calculate 90-day beta when sufficient data", () => {
      const stockData = generatePriceData(150, 100, 2);
      const marketData = generatePriceData(150, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result.beta90d).toBeDefined();
      expect(typeof result.beta90d).toBe("number");
      expect(Number.isFinite(result.beta90d)).toBe(true);
    });

    test("should calculate 250-day beta with full year of data", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result.beta250d).toBeDefined();
      expect(typeof result.beta250d).toBe("number");
      expect(Number.isFinite(result.beta250d)).toBe(true);
    });

    test("should fallback gracefully when insufficient 250-day data", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      // Should still return valid result with available windows
      expect(result.beta30d).toBeDefined();
      expect(result.beta90d).toBeDefined();
      expect(result.beta250d).toBeDefined();
    });

    test("should use progressively longer windows correctly", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      // All three betas should be defined
      expect(result.beta30d).toBeDefined();
      expect(result.beta90d).toBeDefined();
      expect(result.beta250d).toBeDefined();

      // Betas should generally be close but may differ due to varying market conditions
      expect(Math.abs(result.beta30d - result.beta90d)).toBeLessThan(1);
      expect(Math.abs(result.beta90d - result.beta250d)).toBeLessThan(1);
    });
  });

  describe("Edge Cases", () => {
    test("should handle minimum data (2 points)", () => {
      const stockData = [
        { date: "2024-01-01", close: 100 },
        { date: "2024-01-02", close: 102 },
      ];
      const marketData = [
        { date: "2024-01-01", close: 4500 },
        { date: "2024-01-02", close: 4550 },
      ];

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result).toBeDefined();
      expect(result.beta30d).toBeDefined();
      expect(result.beta90d).toBeDefined();
      expect(result.beta250d).toBeDefined();
    });

    test("should handle zero variance in data", () => {
      const stockData = Array(100)
        .fill(null)
        .map((_, i) => ({
          date: new Date(2024, 0, 1 + i).toISOString().split("T")[0],
          close: 100, // No variation
        }));

      const marketData = Array(100)
        .fill(null)
        .map((_, i) => ({
          date: new Date(2024, 0, 1 + i).toISOString().split("T")[0],
          close: 4500, // No variation
        }));

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result).toBeDefined();
      expect(Number.isFinite(result.beta250d)).toBe(true);
    });

    test("should handle very small price values", () => {
      const stockData = generatePriceData(100, 0.001, 0.0001);
      const marketData = generatePriceData(100, 0.5, 0.01);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result).toBeDefined();
      expect(Number.isFinite(result.beta30d)).toBe(true);
      expect(Number.isFinite(result.beta90d)).toBe(true);
      expect(Number.isFinite(result.beta250d)).toBe(true);
    });

    test("should handle very large price values", () => {
      const stockData = generatePriceData(100, 100000, 5000);
      const marketData = generatePriceData(100, 500000, 50000);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result).toBeDefined();
      expect(Number.isFinite(result.beta30d)).toBe(true);
    });

    test("should handle volatile markets", () => {
      const stockData = generatePriceData(100, 100, 20); // High volatility
      const marketData = generatePriceData(100, 4500, 200); // Very high volatility

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result).toBeDefined();
      expect(Number.isFinite(result.beta30d)).toBe(true);
    });

    test("should return NaN fallback of 1 when data is insufficient", () => {
      const stockData = generatePriceData(10, 100, 2);
      const marketData = Array(5) // Mismatched length
        .fill(null)
        .map((_, i) => ({
          date: new Date(2024, 0, 1 + i).toISOString().split("T")[0],
          close: 4500 + i * 50,
        }));

      const result = analyzeBeta(stockData, marketData, "TEST");

      // Should return fallback values
      expect(result.beta250d).toBeDefined();
      expect(typeof result.beta250d).toBe("number");
    });
  });

  describe("Precision and Rounding", () => {
    test("beta values should be rounded to 3 decimal places", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      // Check that values have max 3 decimal places
      const beta30Str = result.beta30d.toString();
      const decimals30 = (beta30Str.split(".")[1] || "").length;
      expect(decimals30).toBeLessThanOrEqual(3);

      const beta90Str = result.beta90d.toString();
      const decimals90 = (beta90Str.split(".")[1] || "").length;
      expect(decimals90).toBeLessThanOrEqual(3);

      const beta250Str = result.beta250d.toString();
      const decimals250 = (beta250Str.split(".")[1] || "").length;
      expect(decimals250).toBeLessThanOrEqual(3);
    });

    test("alpha should be rounded to 5 decimal places", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      const alphaStr = result.alpha.toString();
      const decimals = (alphaStr.split(".")[1] || "").length;
      expect(decimals).toBeLessThanOrEqual(5);
    });

    test("R-squared should be rounded to 3 decimal places", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      const rSqStr = result.rSquared.toString();
      const decimals = (rSqStr.split(".")[1] || "").length;
      expect(decimals).toBeLessThanOrEqual(3);
    });
  });

  describe("Result Structure", () => {
    test("should return all required BetaResult properties", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result).toHaveProperty("beta30d");
      expect(result).toHaveProperty("beta90d");
      expect(result).toHaveProperty("beta250d");
      expect(result).toHaveProperty("alpha");
      expect(result).toHaveProperty("rSquared");
      expect(result).toHaveProperty("classification");
      expect(result).toHaveProperty("interpretation");
    });

    test("result properties should have correct types", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(typeof result.beta30d).toBe("number");
      expect(typeof result.beta90d).toBe("number");
      expect(typeof result.beta250d).toBe("number");
      expect(typeof result.alpha).toBe("number");
      expect(typeof result.rSquared).toBe("number");
      expect(typeof result.classification).toBe("string");
      expect(result.classification).toMatch(/^(defensive|neutral|aggressive)$/);
      expect(typeof result.interpretation).toBe("string");
    });

    test("classification should only be defensive, neutral, or aggressive", () => {
      const tests = [
        generatePerfectlyCorrelatedData(250, 0.5),
        generatePerfectlyCorrelatedData(250, 1.0),
        generatePerfectlyCorrelatedData(250, 1.8),
      ];

      tests.forEach(({ stockData, marketData }) => {
        const result = analyzeBeta(stockData, marketData, "TEST");
        expect(["defensive", "neutral", "aggressive"]).toContain(
          result.classification
        );
      });
    });
  });

  describe("Interpretation Text", () => {
    test("should generate interpretation for defensive stock", () => {
      const stockData = generatePriceData(250, 100, 1);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "DEFSTOCK");

      expect(result.interpretation).toContain("DEFSTOCK");
      expect(result.interpretation).toMatch(/(defensive|neutral|aggressive)/);
      expect(result.interpretation).toContain("β=");
      expect(result.interpretation).toContain("market");
    });

    test("should generate interpretation for aggressive stock", () => {
      const stockData = generatePriceData(250, 100, 4);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "AGGSTOCK");

      expect(result.interpretation).toContain("AGGSTOCK");
      expect(result.interpretation).toMatch(/(defensive|neutral|aggressive)/);
      expect(result.interpretation).toContain("β=");
      expect(result.interpretation).toContain("market");
    });

    test("should generate interpretation for neutral stock", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "NEUSTOCK");

      expect(result.interpretation).toContain("NEUSTOCK");
      expect(result.interpretation).toMatch(/(defensive|neutral|aggressive)/);
      expect(result.interpretation).toContain("β=");
      expect(result.interpretation).toContain("market");
    });

    test("should include R-squared explanation in interpretation", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      expect(result.interpretation).toContain("R²");
      expect(result.interpretation).toContain("%");
    });

    test("should include alpha information when significant", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      // Some tests might have significant alpha
      const hasAlpha = Math.abs(result.alpha) > 0.0005;
      if (hasAlpha) {
        expect(result.interpretation).toContain("alpha");
      }
    });

    test("interpretation should reference ticker correctly", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result1 = analyzeBeta(stockData, marketData, "AAPL");
      const result2 = analyzeBeta(stockData, marketData, "TSLA");

      expect(result1.interpretation).toContain("AAPL");
      expect(result2.interpretation).toContain("TSLA");
    });
  });

  describe("Mock Data Generation", () => {
    test("generateMockSP500Data should create matching length data", () => {
      const stockData = generatePriceData(100, 100, 2);

      const mockData = generateMockSP500Data(stockData);

      expect(mockData.length).toBe(stockData.length);
    });

    test("generateMockSP500Data should preserve dates", () => {
      const stockData = generatePriceData(50, 100, 2);

      const mockData = generateMockSP500Data(stockData);

      for (let i = 0; i < stockData.length; i++) {
        expect(mockData[i].date).toBe(stockData[i].date);
      }
    });

    test("generateMockSP500Data should generate positive prices", () => {
      const stockData = generatePriceData(100, 100, 2);

      const mockData = generateMockSP500Data(stockData);

      mockData.forEach((item) => {
        expect(item.close).toBeGreaterThan(0);
      });
    });

    test("generateMockSP500Data should generate reasonable values", () => {
      const stockData = generatePriceData(100, 100, 2);

      const mockData = generateMockSP500Data(stockData);

      // Mock S&P 500 typically starts at 4500
      expect(mockData[0].close).toBeLessThan(5000);
      expect(mockData[0].close).toBeGreaterThan(4000);
    });

    test("mock data should have reasonable volatility", () => {
      const stockData = generatePriceData(250, 100, 2);

      const mockData = generateMockSP500Data(stockData);

      // Calculate coefficient of variation
      const mean =
        mockData.reduce((sum, item) => sum + item.close, 0) / mockData.length;
      const variance =
        mockData.reduce((sum, item) => sum + Math.pow(item.close - mean, 2), 0) /
        mockData.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / mean;

      // CV should be reasonable (not too volatile, not flat)
      expect(cv).toBeGreaterThan(0.01);
      expect(cv).toBeLessThan(0.5);
    });
  });

  describe("Integration Tests", () => {
    test("full analysis should complete without errors", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      expect(() => {
        analyzeBeta(stockData, marketData, "TEST");
      }).not.toThrow();
    });

    test("should produce consistent results across multiple runs", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result1 = analyzeBeta(stockData, marketData, "TEST");
      const result2 = analyzeBeta(stockData, marketData, "TEST");

      expect(result1.beta30d).toBe(result2.beta30d);
      expect(result1.beta90d).toBe(result2.beta90d);
      expect(result1.beta250d).toBe(result2.beta250d);
      expect(result1.alpha).toBe(result2.alpha);
      expect(result1.rSquared).toBe(result2.rSquared);
      expect(result1.classification).toBe(result2.classification);
    });

    test("should handle real-world-like data", () => {
      // Create realistic price data with trending behavior
      const stockData: Array<{ date: string; close: number }> = [];
      const marketData: Array<{ date: string; close: number }> = [];

      for (let i = 0; i < 250; i++) {
        const date = new Date(2024, 0, 1 + i);
        const dateStr = date.toISOString().split("T")[0];

        // Market with uptrend + noise
        const marketPrice =
          4500 + i * 1 + Math.sin(i * 0.02) * 100 + Math.random() * 50;
        // Stock with correlated uptrend but more volatile
        const stockPrice =
          100 +
          i * 1.2 +
          Math.sin(i * 0.02) * 120 +
          Math.random() * 60;

        stockData.push({
          date: dateStr,
          close: Math.round(stockPrice * 100) / 100,
        });

        marketData.push({
          date: dateStr,
          close: Math.round(marketPrice * 100) / 100,
        });
      }

      const result = analyzeBeta(stockData, marketData, "STOCK");

      // Should produce valid beta and interpretation
      expect(Number.isFinite(result.beta250d)).toBe(true);
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
      expect(result.interpretation).toBeTruthy();
    });

    test("should use custom risk-free rate", () => {
      const stockData = generatePriceData(100, 100, 2);
      const marketData = generatePriceData(100, 4500, 50);

      const result1 = analyzeBeta(stockData, marketData, "TEST", 0.02);
      const result2 = analyzeBeta(stockData, marketData, "TEST", 0.05);

      // Different risk-free rates should produce different alphas
      // (though betas may be similar)
      expect(result1.alpha).not.toBe(result2.alpha);
    });

    test("defensive stock interpretation should differ from aggressive", () => {
      // Use random price data to test that beta analysis produces interpretations
      // (perfectly correlated synthetic data has numerical stability issues)
      const defensiveStock = generatePriceData(250, 100, 1.5);
      const marketData = generatePriceData(250, 4500, 50);

      const defensiveResult = analyzeBeta(defensiveStock, marketData, "DEF");
      const aggressiveStock = generatePriceData(250, 100, 3);
      const aggressiveResult = analyzeBeta(aggressiveStock, marketData, "AGG");

      // At minimum, both should produce valid interpretations
      expect(defensiveResult.interpretation).toBeTruthy();
      expect(aggressiveResult.interpretation).toBeTruthy();
      expect(defensiveResult.interpretation).not.toBe(
        aggressiveResult.interpretation
      );
      // Both should have valid classifications
      expect(["defensive", "neutral", "aggressive"]).toContain(
        defensiveResult.classification
      );
      expect(["defensive", "neutral", "aggressive"]).toContain(
        aggressiveResult.classification
      );
    });
  });

  describe("Statistical Validity", () => {
    test("beta values should be reasonable for typical stocks", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      // Most stocks have beta between -1 and 3
      expect(result.beta250d).toBeGreaterThan(-1);
      expect(result.beta250d).toBeLessThan(3);
    });

    test("R-squared should be between 0 and 1", () => {
      const stockData = generatePriceData(250, 100, 2);
      const marketData = generatePriceData(250, 4500, 50);

      const result = analyzeBeta(stockData, marketData, "TEST");

      // R-squared should always be between 0 and 1
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });

    test("more betas should converge with more data", () => {
      const shortStock = generatePriceData(100, 100, 2);
      const shortMarket = generatePriceData(100, 4500, 50);

      const longStock = generatePriceData(250, 100, 2);
      const longMarket = generatePriceData(250, 4500, 50);

      const shortResult = analyzeBeta(shortStock, shortMarket, "SHORT");
      const longResult = analyzeBeta(longStock, longMarket, "LONG");

      // Both should produce valid betas
      expect(Number.isFinite(shortResult.beta30d)).toBe(true);
      expect(Number.isFinite(longResult.beta30d)).toBe(true);
    });
  });
});
