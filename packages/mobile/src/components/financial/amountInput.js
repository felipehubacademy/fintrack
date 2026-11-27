import { decimalSeparator, parseMoney } from '@fintrack/shared/i18n';

/**
 * Helpers for amount text inputs that follow the user's locale
 * ("12,50" in pt/es-AR, "12.50" in en/es-MX).
 */

/** Active decimal separator ("," or "."). */
export const amountDecimalSeparator = () => decimalSeparator();

/**
 * Cleans what the user typed: digits plus one decimal separator (either "."
 * or "," is accepted and shown as the locale's), at most 2 decimals.
 */
export function sanitizeAmountInput(text, sep = amountDecimalSeparator()) {
  const s = String(text || '').replace(/[^\d.,]/g, '');
  if (!s) return '';
  const idx = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (idx < 0) return s;
  const intPart = s.slice(0, idx).replace(/[.,]/g, '');
  const decPart = s.slice(idx + 1).replace(/[.,]/g, '').slice(0, 2);
  return `${intPart || '0'}${sep}${decPart}`;
}

/** Number -> input text with 2 decimals in the locale ("" for 0/empty). */
export function formatAmountInput(value, sep = amountDecimalSeparator()) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return n.toFixed(2).replace('.', sep);
}

/** Input text -> number (0 when empty/invalid). */
export function parseAmountInput(text) {
  if (typeof text === 'number') return text;
  const sep = amountDecimalSeparator();
  const cleaned = sanitizeAmountInput(text, sep);
  if (!cleaned) return 0;
  const n = Number(cleaned.replace(sep, '.'));
  return Number.isFinite(n) ? n : parseMoney(text);
}
