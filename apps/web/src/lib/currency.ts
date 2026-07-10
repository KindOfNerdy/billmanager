/**
 * Shared currency formatting utility.
 *
 * Currency and locale are configurable via the DEFAULT_CURRENCY /
 * DEFAULT_LOCALE environment variables (see apps/server/config.py),
 * exposed to the frontend through the /api/v2/config endpoint.
 *
 * ConfigProvider calls setCurrencyConfig() once the config is fetched.
 * This module-level state (rather than threading props through every
 * caller) exists because many formatCurrency() call sites are plain
 * helper functions outside the React component tree and can't use
 * useConfig() directly.
 */

let currentLocale = 'en-US';
let currentCurrency = 'USD';
let formatter = buildFormatter();
let axisFormatter = buildFormatter({ maximumFractionDigits: 0 });
let cachedSymbol = extractSymbol(formatter);

function buildFormatter(extra: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  return new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency: currentCurrency,
    ...extra,
  });
}

function extractSymbol(fmt: Intl.NumberFormat): string {
  const part = fmt.formatToParts(0).find((p) => p.type === 'currency');
  return part?.value ?? currentCurrency;
}

export function setCurrencyConfig(locale: string, currency: string): void {
  if (locale === currentLocale && currency === currentCurrency) {
    return;
  }
  const previousLocale = currentLocale;
  const previousCurrency = currentCurrency;
  currentLocale = locale;
  currentCurrency = currency;
  try {
    formatter = buildFormatter();
    axisFormatter = buildFormatter({ maximumFractionDigits: 0 });
    cachedSymbol = extractSymbol(formatter);
  } catch {
    // Invalid locale/currency combination (e.g. bad env var) - roll back
    // rather than breaking the whole UI.
    console.warn(
      `Invalid locale/currency "${locale}"/"${currency}", keeping "${previousLocale}"/"${previousCurrency}"`
    );
    currentLocale = previousLocale;
    currentCurrency = previousCurrency;
  }
}

export function formatCurrency(value: number | null | undefined): string {
  return formatter.format(value ?? 0);
}

/**
 * Compact currency formatting without decimals, for chart axis ticks
 * where full cent precision isn't useful.
 */
export function formatCurrencyAxis(value: number | null | undefined): string {
  return axisFormatter.format(value ?? 0);
}

/**
 * Currency symbol only (e.g. "$", "€"), for use as a NumberInput prefix
 * where full Intl formatting doesn't apply (raw numeric entry fields).
 */
export function getCurrencySymbol(): string {
  return cachedSymbol;
}
