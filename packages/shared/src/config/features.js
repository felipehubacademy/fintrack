/**
 * Launch feature flags (shared by mobile and web).
 *
 * Felipe has not yet decided the launch scope (plan section 4.1 proposes
 * cutting Investments and Goals, and launching free until 2027-01-31).
 * Everything is a switch here so either decision is a one-line change.
 *
 * To flip a flag for launch, change FEATURE_DEFAULTS. FEATURE_<NAME> env
 * vars override it on the server only (bundlers don't inline dynamic keys).
 */
/**
 * Last day of free early access (YYYY-MM-DD). Shown on the landing page,
 * help and terms. Pending Felipe's decision: change the date here only.
 */
export const EARLY_ACCESS_END = '2027-01-31';

export const FEATURE_DEFAULTS = {
  investments: false, // screen crashed before; hidden unless decided otherwise
  goals: true,
  closing: true,
  insights: true,
  paywall: true, // 7-day trial, then Plus (approved 2026-11-26)
  manualEntry: true, // hidden manual form; WhatsApp is the main path
};

function envFlag(name) {
  const keys = [`EXPO_PUBLIC_FEATURE_${name}`, `NEXT_PUBLIC_FEATURE_${name}`, `FEATURE_${name}`];
  for (const k of keys) {
    const v = typeof process !== 'undefined' && process.env ? process.env[k] : undefined;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return undefined;
}

const overrides = {};

export function isFeatureEnabled(name) {
  if (name in overrides) return overrides[name];
  const env = envFlag(String(name).toUpperCase());
  if (env !== undefined) return env;
  return Boolean(FEATURE_DEFAULTS[name]);
}

/** Runtime override (tests, remote config later). */
export function setFeatureOverride(name, value) {
  if (value === undefined) delete overrides[name];
  else overrides[name] = Boolean(value);
}

export const WHATSAPP = {
  // Zul's number in international format, digits only. Set per environment.
  number: (typeof process !== 'undefined' && process.env
    && (process.env.EXPO_PUBLIC_ZUL_WHATSAPP || process.env.NEXT_PUBLIC_ZUL_WHATSAPP)) || '',
};

/** wa.me deep link that opens a chat with Zul and a pre-filled text. */
export function zulChatLink(text = '') {
  const base = WHATSAPP.number ? `https://wa.me/${WHATSAPP.number}` : 'https://wa.me/';
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
