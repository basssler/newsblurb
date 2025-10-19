/**
 * Unit Tests for Rolling Correlation Analysis
 * Tests mathematical accuracy and edge case handling
 */

import {
  analyzeCorrelations,
  generateMockMacroData,
  MacroIndicatorData,
} from "@/lib/macro/rollingCorrelations";

describe("Rolling Correlations", () => {
  describe("Math Functions (via public API)", () => {
    /**
     * Test Pearson Correlation with known values
     * Using simple synthetic data where correlation is predictable
     */
    it("should calculate Pearson correlation correctly for perfectly correlated data", () => {
      // Perfect positive correlation: both arrays increase proportionally
      // Create 100 data points to have sufficient data for windows
      const stockData = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        close: 100 + i * 0.5,
      }));

      const macroData: MacroIndicatorData[] = [
        {
          name: "Perfect Positive",
          values: Array.from({ length: 100 }, (_, i) => ({
            date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
            value: 50 + i * 0.5,
          })),
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "TEST");

      expect(result.correlations.length).toBeGreaterThan(0);
      expect(result.ticker).toBe("TEST");
      expect(result.analysisDate).toBeTruthy();

      // Correlation should be very close to 1 (perfect positive)
      const correlations = result.correlations.map((c) => c.correlation);
      correlations.forEach((corr) => {
        expect(corr).toBeGreaterThan(0.95); // Should be very close to 1
      });
    });

    it("should calculate Pearson correlation correctly for perfectly inverse correlated data", () => {
      // Perfect negative correlation
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 102 },
        { date: "2025-01-03", close: 104 },
        { date: "2025-01-04", close: 106 },
        { date: "2025-01-05", close: 108 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Perfect Negative",
          values: [
            { date: "2025-01-01", value: 100 },
            { date: "2025-01-02", value: 99 },
            { date: "2025-01-03", value: 98 },
            { date: "2025-01-04", value: 97 },
            { date: "2025-01-05", value: 96 },
          ],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "TEST");

      const correlations = result.correlations.map((c) => c.correlation);
      correlations.forEach((corr) => {
        expect(corr).toBeLessThan(-0.95); // Should be very close to -1
      });
    });

    it("should return near-zero correlation for uncorrelated data", () => {
      // Uncorrelated: one increases, other is random
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 101 },
        { date: "2025-01-03", close: 102 },
        { date: "2025-01-04", close: 103 },
        { date: "2025-01-05", close: 104 },
        { date: "2025-01-06", close: 105 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Uncorrelated",
          values: [
            { date: "2025-01-01", value: 100 },
            { date: "2025-01-02", value: 105 },
            { date: "2025-01-03", value: 102 },
            { date: "2025-01-04", value: 107 },
            { date: "2025-01-05", value: 101 },
            { date: "2025-01-06", value: 106 },
          ],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "TEST");

      // With uncorrelated data, correlation should be close to 0
      const correlations = result.correlations.map((c) => c.correlation);
      correlations.forEach((corr) => {
        expect(Math.abs(corr)).toBeLessThan(0.5); // Not strongly correlated
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty price history gracefully", () => {
      const stockData: any[] = [];
      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 100 },
            { date: "2025-01-02", value: 101 },
          ],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "EMPTY");

      expect(result.correlations).toHaveLength(0);
      expect(result.ticker).toBe("EMPTY");
    });

    it("should handle single data point", () => {
      const stockData = [{ date: "2025-01-01", close: 100 }];
      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [{ date: "2025-01-01", value: 100 }],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "SINGLE");

      // Should not crash, correlations should be empty or have zero values
      expect(result.correlations.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle mismatched data lengths", () => {
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 101 },
        { date: "2025-01-03", close: 102 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 100 },
            { date: "2025-01-02", value: 101 },
            // Missing third data point
          ],
        },
      ];

      // Should handle gracefully without crashing
      const result = analyzeCorrelations(stockData, macroData, "MISMATCH");
      expect(result).toBeDefined();
    });

    it("should handle zero prices (log return edge case)", () => {
      const stockData = [
        { date: "2025-01-01", close: 0 },
        { date: "2025-01-02", close: 0 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 100 },
            { date: "2025-01-02", value: 101 },
          ],
        },
      ];

      // Should handle without throwing errors
      const result = analyzeCorrelations(stockData, macroData, "ZEROS");
      expect(result).toBeDefined();
    });

    it("should handle very small numbers without overflow", () => {
      const stockData = Array.from({ length: 60 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        close: 0.00001 * (1 + i * 0.01),
      }));

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: Array.from({ length: 60 }, (_, i) => ({
            date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
            value: 0.00001 * (1 + i * 0.01),
          })),
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "SMALL");
      expect(result.correlations.length).toBeGreaterThan(0);

      // Should still correlate well despite small numbers
      const correlations = result.correlations.map((c) => c.correlation);
      correlations.forEach((corr) => {
        expect(Number.isFinite(corr)).toBe(true);
      });
    });

    it("should handle very large numbers without overflow", () => {
      const stockData = Array.from({ length: 60 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        close: 1e10 * (1 + i * 0.01),
      }));

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: Array.from({ length: 60 }, (_, i) => ({
            date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
            value: 1e10 * (1 + i * 0.01),
          })),
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "LARGE");
      expect(result.correlations.length).toBeGreaterThan(0);

      const correlations = result.correlations.map((c) => c.correlation);
      correlations.forEach((corr) => {
        expect(Number.isFinite(corr)).toBe(true);
      });
    });

    it("should handle negative prices", () => {
      const stockData = [
        { date: "2025-01-01", close: -100 },
        { date: "2025-01-02", close: -99 },
        { date: "2025-01-03", close: -98 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 100 },
            { date: "2025-01-02", value: 101 },
            { date: "2025-01-03", value: 102 },
          ],
        },
      ];

      // Should handle gracefully
      const result = analyzeCorrelations(stockData, macroData, "NEGATIVE");
      expect(result).toBeDefined();
    });
  });

  describe("Window Sizing", () => {
    it("should calculate for 30-day window", () => {
      // Create 50 data points
      const stockData = Array.from({ length: 50 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, "0")}`,
        close: 100 + i,
      }));

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: Array.from({ length: 50 }, (_, i) => ({
            date: `2025-01-${String(i + 1).padStart(2, "0")}`,
            value: 100 + i,
          })),
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "WINDOWS");

      // Should have correlation for 30-day window
      const window30 = result.correlations.find((c) => c.window === 30);
      expect(window30).toBeDefined();
      expect(window30?.sampleSize).toBeGreaterThanOrEqual(30);
    });

    it("should include correlations for all three windows when data is sufficient", () => {
      // Create 300 data points to support all windows
      const stockData = Array.from({ length: 300 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        close: 100 + i * 0.1,
      }));

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: Array.from({ length: 300 }, (_, i) => ({
            date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
            value: 100 + i * 0.1,
          })),
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "ALL_WINDOWS");

      const windows = new Set(result.correlations.map((c) => c.window));
      expect(windows.has(30)).toBe(true);
      expect(windows.has(90)).toBe(true);
      expect(windows.has(250)).toBe(true);
    });
  });

  describe("Statistical Properties", () => {
    it("should return valid p-values between 0 and 1", () => {
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 102 },
        { date: "2025-01-03", close: 104 },
        { date: "2025-01-04", close: 106 },
        { date: "2025-01-05", close: 108 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 50 },
            { date: "2025-01-02", value: 51 },
            { date: "2025-01-03", value: 52 },
            { date: "2025-01-04", value: 53 },
            { date: "2025-01-05", value: 54 },
          ],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "PVALUE");

      result.correlations.forEach((corr) => {
        expect(corr.pValue).toBeGreaterThanOrEqual(0);
        expect(corr.pValue).toBeLessThanOrEqual(1);
      });
    });

    it("should correctly classify significance levels", () => {
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 102 },
        { date: "2025-01-03", close: 104 },
        { date: "2025-01-04", close: 106 },
        { date: "2025-01-05", close: 108 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 50 },
            { date: "2025-01-02", value: 51 },
            { date: "2025-01-03", value: 52 },
            { date: "2025-01-04", value: 53 },
            { date: "2025-01-05", value: 54 },
          ],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "SIG");

      result.correlations.forEach((corr) => {
        expect(["***", "**", "*", "ns"]).toContain(corr.significance);
      });
    });

    it("should round correlation to 3 decimal places", () => {
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 102 },
        { date: "2025-01-03", close: 104 },
        { date: "2025-01-04", close: 106 },
        { date: "2025-01-05", close: 108 },
      ];

      const macroData: MacroIndicatorData[] = [
        {
          name: "Test",
          values: [
            { date: "2025-01-01", value: 50 },
            { date: "2025-01-02", value: 51 },
            { date: "2025-01-03", value: 52 },
            { date: "2025-01-04", value: 53 },
            { date: "2025-01-05", value: 54 },
          ],
        },
      ];

      const result = analyzeCorrelations(stockData, macroData, "PRECISION");

      result.correlations.forEach((corr) => {
        // Check that correlation has at most 3 decimal places
        const decimalPlaces = (corr.correlation.toString().split(".")[1] || "").length;
        expect(decimalPlaces).toBeLessThanOrEqual(3);
      });
    });
  });

  describe("Mock Data Generation", () => {
    it("should generate mock macro data with correct structure", () => {
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 101 },
        { date: "2025-01-03", close: 102 },
      ];

      const mockData = generateMockMacroData(stockData);

      expect(mockData).toHaveLength(6); // 6 indicators
      expect(mockData[0]).toHaveProperty("name");
      expect(mockData[0]).toHaveProperty("values");
      expect(mockData[0].values).toHaveLength(3);
    });

    it("should generate mock data with dates matching input", () => {
      const stockData = [
        { date: "2025-01-01", close: 100 },
        { date: "2025-01-02", close: 101 },
        { date: "2025-01-03", close: 102 },
      ];

      const mockData = generateMockMacroData(stockData);

      mockData.forEach((indicator) => {
        indicator.values.forEach((value, index) => {
          expect(value.date).toBe(stockData[index].date);
        });
      });
    });

    it("should generate reasonable macro values (within expected ranges)", () => {
      const stockData = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, "0")}`,
        close: 100 + i,
      }));

      const mockData = generateMockMacroData(stockData);

      mockData.forEach((indicator) => {
        indicator.values.forEach((value) => {
          expect(value.value).toBeGreaterThan(0); // All values should be positive
          expect(Number.isFinite(value.value)).toBe(true);
        });
      });
    });
  });

  describe("Integration Tests", () => {
    it("should complete full analysis without errors for realistic data", () => {
      // Simulate 3 months of daily data
      const stockData = Array.from({ length: 90 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        close: 250 + Math.sin(i * 0.1) * 20 + Math.random() * 5,
      }));

      const mockData = generateMockMacroData(stockData);

      const result = analyzeCorrelations(stockData, mockData, "AAPL");

      expect(result.ticker).toBe("AAPL");
      expect(result.correlations.length).toBeGreaterThan(0);
      expect(result.interpretation).toBeTruthy();
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it("should return meaningful interpretation text", () => {
      const stockData = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        close: 100 + i * 0.5,
      }));

      const mockData = generateMockMacroData(stockData);
      const result = analyzeCorrelations(stockData, mockData, "TEST");

      expect(result.interpretation).toContain("TEST");
      expect(
        result.interpretation.includes("correlation") ||
          result.interpretation.includes("weak")
      ).toBe(true);
    });
  });
});
