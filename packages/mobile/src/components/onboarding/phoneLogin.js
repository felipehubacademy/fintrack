/**
 * Phone login helpers (no React here so they are unit-tested).
 *
 * Login is phone + 6-digit code delivered on WhatsApp: the app calls
 * supabase.auth.signInWithOtp({ phone }) and the backend's Send SMS Hook
 * relays the code through WhatsApp. Phone numbers must be E.164 and must
 * match how the backend stores the phone of accounts created by chatting
 * with Zul (see toE164 for the country rules).
 */
import { normalizeLanguage, regionOf } from '@fintrack/shared/i18n';

// Dial codes; min/max = national significant number length.
export const COUNTRIES = [
  { code: 'BR', dial: '55', min: 10, max: 11 },
  { code: 'MX', dial: '52', min: 10, max: 10 },
  { code: 'CO', dial: '57', min: 10, max: 10 },
  { code: 'AR', dial: '54', min: 10, max: 11 },
  { code: 'US', dial: '1', min: 10, max: 10 },
  { code: 'CL', dial: '56', min: 9, max: 9 },
  { code: 'PE', dial: '51', min: 9, max: 9 },
  { code: 'EC', dial: '593', min: 9, max: 9 },
  { code: 'UY', dial: '598', min: 8, max: 8 },
  { code: 'PY', dial: '595', min: 9, max: 9 },
  { code: 'BO', dial: '591', min: 8, max: 8 },
  { code: 'VE', dial: '58', min: 10, max: 10 },
  { code: 'CR', dial: '506', min: 8, max: 8 },
  { code: 'PA', dial: '507', min: 8, max: 8 },
  { code: 'DO', dial: '1', min: 10, max: 10 },
  { code: 'GT', dial: '502', min: 8, max: 8 },
  { code: 'CA', dial: '1', min: 10, max: 10 },
  { code: 'PT', dial: '351', min: 9, max: 9 },
  { code: 'ES', dial: '34', min: 9, max: 9 },
  { code: 'GB', dial: '44', min: 10, max: 10 },
];

const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const LANGUAGE_DEFAULT = { pt: 'BR', es: 'MX', en: 'US' };

export function getCountry(code) {
  return BY_CODE[code] || BY_CODE.US;
}

/** Device locale tag ('pt-BR', 'es-CO', 'en') -> country entry. */
export function defaultCountryFor(localeTag) {
  const region = regionOf(localeTag);
  if (region && BY_CODE[region]) return BY_CODE[region];
  return BY_CODE[LANGUAGE_DEFAULT[normalizeLanguage(localeTag)] || 'US'];
}

/**
 * Turn what the person typed into E.164 ('+5511987654321'), or null if it
 * cannot be a valid mobile number for that country.
 *
 * Country rules (keep in sync with the backend's phone normalization):
 * - BR: DDD + 9-digit mobile. An old 8-digit mobile (starts 6-9) gets the 9.
 * - MX: 10 digits; the legacy "1" after +52 is dropped.
 * - AR: mobiles are +54 9 + area + number; the 9 is added when missing.
 * - NANP (US/CA/DO): a leading 1 is dropped.
 */
export function toE164(countryCode, input) {
  const raw = String(input || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Typed in international form: +<country><number> or 00<country><number>.
  if (raw.startsWith('+') || digits.startsWith('00')) {
    if (!raw.startsWith('+')) digits = digits.slice(2);
    const selected = getCountry(countryCode);
    const match = digits.startsWith(selected.dial)
      ? selected
      : COUNTRIES
        .filter((c) => digits.startsWith(c.dial))
        .sort((a, b) => b.dial.length - a.dial.length)[0];
    if (match) return toE164(match.code, digits.slice(match.dial.length));
    // Country we have no rules for: accept a plausible E.164 length.
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  const country = getCountry(countryCode);
  let national = digits;

  // Pasted with the country code but without "+".
  if (national.startsWith(country.dial) && national.length > country.max) {
    national = national.slice(country.dial.length);
  }

  if (country.dial === '1') {
    if (national.length === 11 && national.startsWith('1')) national = national.slice(1);
  } else {
    national = national.replace(/^0+/, ''); // trunk prefix
  }

  if (country.code === 'BR') {
    if (national.length === 10 && /[6-9]/.test(national[2])) {
      national = `${national.slice(0, 2)}9${national.slice(2)}`;
    }
    if (national.length !== 11 || national[2] !== '9') return null;
  } else if (country.code === 'MX') {
    if (national.length === 11 && national.startsWith('1')) national = national.slice(1);
    if (national.length !== 10) return null;
  } else if (country.code === 'AR') {
    if (national.length === 11 && national.startsWith('9')) national = national.slice(1);
    if (national.length !== 10) return null;
    national = `9${national}`;
  } else if (national.length < country.min || national.length > country.max) {
    return null;
  }

  return `+${country.dial}${national}`;
}

/** '+5511987654321' -> '+55 11 98765-4321' style, best effort. */
export function formatPhoneForDisplay(e164) {
  const s = String(e164 || '');
  const br = s.match(/^\+55(\d{2})(\d{5})(\d{4})$/);
  if (br) return `+55 ${br[1]} ${br[2]}-${br[3]}`;
  const nanp = s.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (nanp) return `+1 ${nanp[1]} ${nanp[2]} ${nanp[3]}`;
  const country = COUNTRIES
    .filter((c) => s.startsWith(`+${c.dial}`))
    .sort((a, b) => b.dial.length - a.dial.length)[0];
  return country ? `+${country.dial} ${s.slice(country.dial.length + 1)}` : s;
}

export function isValidOtp(code) {
  return /^\d{6}$/.test(String(code || ''));
}

/** Keep only digits, max 6 (paste-friendly). */
export function cleanOtp(code) {
  return String(code || '').replace(/\D/g, '').slice(0, 6);
}

/** Supabase auth error -> key under auth.errors. */
export function authErrorKey(error) {
  if (!error) return 'generic';
  const code = String(error.code || '').toLowerCase();
  const msg = String(error.message || '').toLowerCase();
  const status = Number(error.status || 0);

  if (status === 429 || code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('for security purposes')) {
    return 'rateLimited';
  }
  if (code === 'otp_disabled' || msg.includes('signups not allowed') || code === 'user_not_found' || msg.includes('user not found')) {
    return 'noAccount';
  }
  if (code === 'otp_expired' || msg.includes('token has expired') || msg.includes('invalid otp') || msg.includes('otp has expired')) {
    return 'wrongCode';
  }
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'invalidCredentials';
  }
  if (msg.includes('network') || msg.includes('fetch')) return 'network';
  return 'generic';
}
