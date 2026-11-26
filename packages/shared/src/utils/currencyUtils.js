import { formatMoney, parseMoney } from '../i18n/format.js';

/**
 * Format a number in the user's currency and locale (see i18n setLocaleSettings).
 * Pass { currency, locale } to override, e.g. on the server.
 * @param {number} value
 * @param {{currency?: string, locale?: string}} [opts]
 */
export function formatCurrency(value, opts = {}) {
  return formatMoney(value, opts);
}

/**
 * Parse a user-typed amount in the active locale ("1.234,56" or "1,234.56").
 */
export function parseCurrency(value, opts = {}) {
  return parseMoney(value, opts);
}

