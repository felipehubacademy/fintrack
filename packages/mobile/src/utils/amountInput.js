/**
 * Helpers for a free-text money input that follows the user's locale.
 *
 * The user types digits and the locale's decimal separator ("," in pt/es-AR,
 * "." in en/es-MX). We keep at most one separator and two decimals; the value
 * is parsed later with parseMoney() from @fintrack/shared/i18n.
 */

/**
 * Clean what the user typed into a money field.
 * @param {string} text raw input
 * @param {string} sep  the locale decimal separator ("," or ".")
 * @returns {string}
 */
export function sanitizeAmountInput(text, sep = '.') {
  const other = sep === ',' ? '.' : ',';
  // Accept the "other" separator too (e.g. a "." typed on a pt keypad) as the decimal mark.
  let s = String(text || '').split(other).join(sep);
  s = s.replace(new RegExp(`[^0-9${sep === '.' ? '\\.' : ','}]`, 'g'), '');
  const idx = s.indexOf(sep);
  if (idx === -1) return s.replace(/^0+(?=\d)/, '');
  const intPart = s.slice(0, idx).replace(/^0+(?=\d)/, '') || '0';
  const decPart = s.slice(idx + 1).split(sep).join('').slice(0, 2);
  return `${intPart}${sep}${decPart}`;
}

/** Placeholder like "0,00" / "0.00" for the given separator. */
export function amountPlaceholder(sep = '.') {
  return `0${sep}00`;
}
