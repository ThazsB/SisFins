import { describe, test, expect } from 'vitest';
import { formatCurrency, parseCurrency, formatPercentage } from '@/utils/currency';

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    test('should format positive numbers correctly', () => {
      expect(formatCurrency(1000)).toBe('R$ 1.000,00');
    });

    test('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('R$ 0,00');
    });

    test('should format decimal numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    });

    test('should format large numbers correctly', () => {
      expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
    });
  });

  describe('parseCurrency', () => {
    test('should parse formatted currency string to number', () => {
      expect(parseCurrency('R$ 1.000,50')).toBe(1000.5);
    });

    test('should handle empty string', () => {
      expect(parseCurrency('')).toBe(0);
    });

    test('should handle plain numbers', () => {
      expect(parseCurrency('1000')).toBe(1000);
    });
  });

  describe('formatPercentage', () => {
    test('should format percentage correctly (pt-BR)', () => {
      // Intl in pt-BR uses comma as decimal separator and 1 fraction digit for percent formatter used in src
      expect(formatPercentage(25.5)).toBe('25,5%');
    });

    test('should format zero percentage', () => {
      expect(formatPercentage(0)).toBe('0,0%');
    });

    test('should format 100 percentage', () => {
      expect(formatPercentage(100)).toBe('100,0%');
    });
  });
});
