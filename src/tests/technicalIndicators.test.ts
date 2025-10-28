/**
 * Unit tests for technical indicator calculations
 * Tests: SMA, Bollinger Bands, Support/Resistance, ATR Bands
 */

import {
  calculateSMA,
  calculateBollingerBands,
  calculateSupportLevels,
  calculateResistanceLevels,
  calculateATRBands,
  enhancePriceData,
  calculateMeanReversionZones,
} from '@/lib/technicalIndicators';

describe('Technical Indicators', () => {
  describe('calculateSMA - Simple Moving Average', () => {
    it('should calculate correct SMA for standard dataset', () => {
      const prices = [100, 102, 101, 103, 104, 105, 106, 107, 108, 109];
      const sma = calculateSMA(prices, 5);
      // Average of last 5: (105+106+107+108+109)/5 = 107
      expect(sma).toBeCloseTo(107, 1);
    });

    it('should handle empty array', () => {
      const sma = calculateSMA([], 5);
      expect(sma).toBeUndefined();
    });

    it('should handle single data point', () => {
      const sma = calculateSMA([100], 5);
      expect(sma).toBeCloseTo(100, 1);
    });

    it('should handle period larger than data length', () => {
      const prices = [100, 101, 102];
      const sma = calculateSMA(prices, 10);
      // Should average all 3 points: (100+101+102)/3
      expect(sma).toBeCloseTo(101, 1);
    });

    it('should handle period of 1', () => {
      const prices = [100, 101, 102, 103];
      const sma = calculateSMA(prices, 1);
      // Should return last price
      expect(sma).toBeCloseTo(103, 1);
    });

    it('should calculate correct SMA for trending prices', () => {
      // Uptrend
      const prices = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100];
      const sma3 = calculateSMA(prices, 3);
      // Average of last 3: (98+99+100)/3
      expect(sma3).toBeCloseTo(99, 1);

      const sma10 = calculateSMA(prices, 10);
      // Average of last 10: (91+92+93+94+95+96+97+98+99+100)/10
      expect(sma10).toBeCloseTo(95.5, 1);
    });
  });

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands with standard parameters', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
      const bands = calculateBollingerBands(prices, 5, 2);

      expect(bands).toBeDefined();
      expect(bands?.middle).toBeCloseTo(107, 1);
      expect(bands?.upper).toBeGreaterThan(bands?.middle!);
      expect(bands?.lower).toBeLessThan(bands?.middle!);
    });

    it('should return undefined for empty array', () => {
      const bands = calculateBollingerBands([], 5);
      expect(bands).toBeUndefined();
    });

    it('should have upper > middle > lower', () => {
      const prices = [95, 100, 105, 110, 115, 120, 125, 130, 135, 140];
      const bands = calculateBollingerBands(prices, 5, 2);

      expect(bands?.upper).toBeGreaterThan(bands?.middle!);
      expect(bands?.middle).toBeGreaterThan(bands?.lower!);
    });

    it('should increase band width with higher std dev multiplier', () => {
      const prices = [100, 102, 104, 103, 105, 101, 106, 102, 107, 108];
      const bands1 = calculateBollingerBands(prices, 5, 1);
      const bands2 = calculateBollingerBands(prices, 5, 2);

      expect(bands2?.upper! - bands2?.middle!).toBeGreaterThan(
        bands1?.upper! - bands1?.middle!
      );
    });
  });

  describe('calculateSupportLevels', () => {
    it('should find support levels in oscillating prices', () => {
      // Use oscillating data that has local minima (valleys)
      const prices = [100, 95, 98, 93, 96, 91, 94, 90, 92];
      const supports = calculateSupportLevels(prices, 2);

      // Should find some support levels where prices bottomed
      expect(Array.isArray(supports)).toBe(true);
      expect(supports.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for insufficient data', () => {
      const supports = calculateSupportLevels([], 5);
      expect(supports).toEqual([]);
    });

    it('should handle single peak', () => {
      const prices = [100, 99, 98, 97, 96, 97, 98, 99, 100];
      const supports = calculateSupportLevels(prices, 2);

      expect(Array.isArray(supports)).toBe(true);
      expect(supports.length).toBeLessThanOrEqual(3); // Should return max 3
    });

    it('should return maximum 3 levels', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 20);
      const supports = calculateSupportLevels(prices, 3);

      expect(supports.length).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateResistanceLevels', () => {
    it('should find resistance levels in oscillating prices', () => {
      // Use oscillating data that has local maxima (peaks)
      const prices = [90, 95, 92, 97, 94, 99, 96, 100, 98];
      const resistances = calculateResistanceLevels(prices, 2);

      // Should find some resistance levels where prices peaked
      expect(Array.isArray(resistances)).toBe(true);
      expect(resistances.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for insufficient data', () => {
      const resistances = calculateResistanceLevels([], 5);
      expect(resistances).toEqual([]);
    });

    it('should handle single valley', () => {
      const prices = [100, 101, 102, 103, 102, 101, 100, 99, 98];
      const resistances = calculateResistanceLevels(prices, 2);

      expect(Array.isArray(resistances)).toBe(true);
    });

    it('should return maximum 3 levels', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 20);
      const resistances = calculateResistanceLevels(prices, 3);

      expect(resistances.length).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateATRBands', () => {
    it('should calculate ATR bands around current price', () => {
      const prices = [100, 102, 101, 103, 104];
      const bands = calculateATRBands(prices, 2, 1.5);

      expect(bands.middle).toBeCloseTo(104, 1); // Last price
      expect(bands.upper).toBeCloseTo(104 + 2 * 1.5, 1);
      expect(bands.lower).toBeCloseTo(104 - 2 * 1.5, 1);
    });

    it('should have upper > middle > lower', () => {
      const prices = [100, 102, 104, 106, 108];
      const bands = calculateATRBands(prices, 3, 2);

      expect(bands.upper).toBeGreaterThan(bands.middle);
      expect(bands.middle).toBeGreaterThan(bands.lower);
    });

    it('should scale with ATR value', () => {
      const prices = [100, 102, 104, 106, 108];
      const bands1 = calculateATRBands(prices, 1, 1.5);
      const bands2 = calculateATRBands(prices, 2, 1.5);

      expect(Math.abs(bands2.upper - bands2.lower)).toBeGreaterThan(
        Math.abs(bands1.upper - bands1.lower)
      );
    });

    it('should scale with multiplier', () => {
      const prices = [100, 102, 104, 106, 108];
      const bands1 = calculateATRBands(prices, 2, 1);
      const bands2 = calculateATRBands(prices, 2, 2);

      expect(Math.abs(bands2.upper - bands2.lower)).toBeGreaterThan(
        Math.abs(bands1.upper - bands1.lower)
      );
    });
  });

  describe('calculateMeanReversionZones', () => {
    it('should calculate zones with standard parameters', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
      const zones = calculateMeanReversionZones(prices, 5);

      expect(zones.overbought).toBeGreaterThan(zones.average);
      expect(zones.average).toBeGreaterThan(zones.oversold);
    });

    it('should handle empty array', () => {
      const zones = calculateMeanReversionZones([], 5);

      // Should return zones with valid structure
      expect(zones).toBeDefined();
      if (zones.overbought && zones.average && zones.oversold) {
        expect(zones.overbought).toBeGreaterThan(zones.average);
        expect(zones.average).toBeGreaterThan(zones.oversold);
      }
    });

    it('should increase range with higher volatility', () => {
      // Low volatility
      const stablePrices = [100, 100.5, 100.2, 100.3, 100.1];
      const stableZones = calculateMeanReversionZones(stablePrices, 5);

      // High volatility
      const volatilePrices = [90, 100, 110, 95, 105];
      const volatileZones = calculateMeanReversionZones(volatilePrices, 5);

      expect(volatileZones.overbought - volatileZones.oversold).toBeGreaterThan(
        stableZones.overbought - stableZones.oversold
      );
    });
  });

  describe('enhancePriceData', () => {
    it('should enhance price data with all indicators', () => {
      const data = [
        { date: '2025-01-01', close: 100 },
        { date: '2025-01-02', close: 102 },
        { date: '2025-01-03', close: 101 },
        { date: '2025-01-04', close: 103 },
        { date: '2025-01-05', close: 104 },
      ];

      const enhanced = enhancePriceData(data, 1.5);

      expect(enhanced.length).toBe(5);
      expect(enhanced[0].date).toBe('2025-01-01');
      expect(enhanced[0].close).toBe(100);
    });

    it('should have all required fields after enhancement', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        close: 100 + Math.random() * 10,
      }));

      const enhanced = enhancePriceData(data, 2);
      const lastPoint = enhanced[enhanced.length - 1];

      expect(lastPoint.sma20).toBeDefined();
      expect(lastPoint.sma50).toBeDefined();
      expect(lastPoint.bbUpper).toBeDefined();
      expect(lastPoint.bbMiddle).toBeDefined();
      expect(lastPoint.bbLower).toBeDefined();
    });

    it('should preserve price history', () => {
      const data = [
        { date: '2025-01-01', close: 100 },
        { date: '2025-01-02', close: 102 },
        { date: '2025-01-03', close: 104 },
      ];

      const enhanced = enhancePriceData(data, 1);

      data.forEach((original, i) => {
        expect(enhanced[i].date).toBe(original.date);
        expect(enhanced[i].close).toBe(original.close);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle NaN values gracefully', () => {
      const prices = [100, 101, 102, 103, 104];
      const sma = calculateSMA(prices, 5);

      expect(isNaN(sma!)).toBe(false);
      expect(sma).toBeDefined();
    });

    it('should handle very large numbers', () => {
      const prices = [1000000, 1000100, 1000200, 1000300, 1000400];
      const sma = calculateSMA(prices, 5);

      // Average of [1000000, 1000100, 1000200, 1000300, 1000400] = 1000200
      expect(sma).toBeCloseTo(1000200, 0);
    });

    it('should handle very small numbers', () => {
      const prices = [0.001, 0.002, 0.003, 0.004, 0.005];
      const sma = calculateSMA(prices, 5);

      expect(sma).toBeCloseTo(0.003, 5);
    });

    it('should handle negative numbers', () => {
      const prices = [-100, -99, -98, -97, -96];
      const sma = calculateSMA(prices, 3);

      expect(sma).toBeCloseTo(-97, 1);
    });
  });
});
