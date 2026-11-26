/**
 * Country picker data and phone helpers for the WhatsApp-code login.
 * Names come from Intl.DisplayNames in the page language (no strings to
 * translate); dial codes are ITU calling codes.
 */

export const COUNTRIES = [
  { code: 'BR', dial: '55' },
  { code: 'US', dial: '1' },
  { code: 'MX', dial: '52' },
  { code: 'CO', dial: '57' },
  { code: 'AR', dial: '54' },
  { code: 'CL', dial: '56' },
  { code: 'PE', dial: '51' },
  { code: 'UY', dial: '598' },
  { code: 'PY', dial: '595' },
  { code: 'BO', dial: '591' },
  { code: 'EC', dial: '593' },
  { code: 'VE', dial: '58' },
  { code: 'CR', dial: '506' },
  { code: 'PA', dial: '507' },
  { code: 'DO', dial: '1' },
  { code: 'GT', dial: '502' },
  { code: 'HN', dial: '504' },
  { code: 'NI', dial: '505' },
  { code: 'SV', dial: '503' },
  { code: 'PR', dial: '1' },
  { code: 'CA', dial: '1' },
  { code: 'PT', dial: '351' },
  { code: 'ES', dial: '34' },
  { code: 'GB', dial: '44' },
  { code: 'IE', dial: '353' },
  { code: 'DE', dial: '49' },
  { code: 'FR', dial: '33' },
  { code: 'IT', dial: '39' },
  { code: 'AU', dial: '61' },
  { code: 'AO', dial: '244' },
  { code: 'MZ', dial: '258' },
];

const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const LANGUAGE_DEFAULT = { pt: 'BR', es: 'MX', en: 'US' };

export function countryByCode(code) {
  return BY_CODE[String(code || '').toUpperCase()] || null;
}

/** Default country from a locale tag ('es-CO' -> CO) or the language. */
export function defaultCountryFor(localeTag, language) {
  const region = String(localeTag || '').split(/[-_]/).slice(1).find((p) => /^[A-Za-z]{2}$/.test(p));
  if (region && BY_CODE[region.toUpperCase()]) return region.toUpperCase();
  return LANGUAGE_DEFAULT[language] || 'US';
}

export function countryName(code, language) {
  try {
    return new Intl.DisplayNames([language || 'en'], { type: 'region' }).of(code) || code;
  } catch (_) {
    return code;
  }
}

export function flagEmoji(code) {
  return String(code).toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Country + national number -> "+5511999998888". Drops a trunk "0". */
export function toE164(countryCode, nationalNumber) {
  const country = countryByCode(countryCode);
  let national = digitsOnly(nationalNumber).replace(/^0+/, '');
  if (!country) return null;
  // People often paste the full number with the country code. Only strip it
  // when what is left is still a full-length number (Brazil has a DDD 55).
  if (national.startsWith(country.dial) && national.length >= country.dial.length + 10) {
    national = national.slice(country.dial.length);
  }
  const e164 = `+${country.dial}${national}`;
  const total = country.dial.length + national.length;
  return national.length >= 6 && total >= 8 && total <= 15 ? e164 : null;
}

/**
 * Split an international number ("5511999998888", "+52 55 1234 5678") into
 * { country, national }. Prefers `preferred` when dial codes are shared
 * (e.g. +1). Returns null when no known dial code matches.
 */
export function splitInternational(value, preferred) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  const candidates = COUNTRIES
    .filter((c) => digits.startsWith(c.dial))
    .sort((a, b) => b.dial.length - a.dial.length);
  if (!candidates.length) return null;
  const longest = candidates[0].dial.length;
  const best = candidates.filter((c) => c.dial.length === longest);
  const country = best.find((c) => c.code === preferred) || best[0];
  return { country: country.code, national: digits.slice(country.dial.length) };
}
