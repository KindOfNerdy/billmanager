import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatCurrency,
  formatCurrencyAxis,
  getCurrencySymbol,
  setCurrencyConfig,
} from '../lib/currency';

afterEach(() => {
  setCurrencyConfig('en-US', 'USD');
  vi.restoreAllMocks();
});

describe('currency formatting', () => {
  it('uses the configured locale and currency', () => {
    setCurrencyConfig('de-DE', 'EUR');

    expect(formatCurrency(1234.56)).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(1234.56)
    );
    expect(formatCurrencyAxis(1234.56)).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(1234.56)
    );
    expect(getCurrencySymbol()).toBe('€');
  });

  it('formats missing values as zero', () => {
    expect(formatCurrency(null)).toBe(formatCurrency(0));
    expect(formatCurrency(undefined)).toBe(formatCurrency(0));
  });

  it('keeps the previous configuration when the locale is invalid', () => {
    setCurrencyConfig('de-DE', 'EUR');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    setCurrencyConfig('invalid_locale', 'NOT-A-CURRENCY');

    expect(formatCurrency(1234.56)).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(1234.56)
    );
  });
});
