import {
  defaultCountryFor,
  toE164,
  formatPhoneForDisplay,
  isValidOtp,
  cleanOtp,
  authErrorKey,
} from '../phoneLogin';
import { shouldShowOnboarding, ONBOARDING_STEPS } from '../onboardingState';

describe('defaultCountryFor', () => {
  it.each([
    ['pt-BR', 'BR'],
    ['es-MX', 'MX'],
    ['es-CO', 'CO'],
    ['es-AR', 'AR'],
    ['en-US', 'US'],
    ['es_CL', 'CL'],
  ])('%s -> %s', (tag, code) => {
    expect(defaultCountryFor(tag).code).toBe(code);
  });

  it('falls back by language when the region is unknown or missing', () => {
    expect(defaultCountryFor('pt').code).toBe('BR');
    expect(defaultCountryFor('es-419').code).toBe('MX');
    expect(defaultCountryFor('fr-FR').code).toBe('US');
  });
});

describe('toE164', () => {
  it('formats Brazilian mobiles', () => {
    expect(toE164('BR', '(11) 98765-4321')).toBe('+5511987654321');
    expect(toE164('BR', '011 98765 4321')).toBe('+5511987654321');
    expect(toE164('BR', '5511987654321')).toBe('+5511987654321');
    expect(toE164('BR', '+55 11 98765-4321')).toBe('+5511987654321');
  });

  it('adds the 9th digit to old 8-digit Brazilian mobiles', () => {
    expect(toE164('BR', '11 8765-4321')).toBe('+5511987654321');
  });

  it('rejects Brazilian landlines and short numbers', () => {
    expect(toE164('BR', '11 3333-4444')).toBeNull();
    expect(toE164('BR', '98765')).toBeNull();
  });

  it('handles Mexico, with or without the legacy 1', () => {
    expect(toE164('MX', '55 1234 5678')).toBe('+525512345678');
    expect(toE164('MX', '1 55 1234 5678')).toBe('+525512345678');
    expect(toE164('MX', '+52 1 55 1234 5678')).toBe('+525512345678');
  });

  it('adds the mobile 9 for Argentina', () => {
    expect(toE164('AR', '11 2345-6789')).toBe('+5491123456789');
    expect(toE164('AR', '011 2345-6789')).toBe('+5491123456789');
    expect(toE164('AR', '9 11 2345 6789')).toBe('+5491123456789');
  });

  it('handles Colombia and NANP', () => {
    expect(toE164('CO', '300 123 4567')).toBe('+573001234567');
    expect(toE164('US', '(415) 555-0123')).toBe('+14155550123');
    expect(toE164('US', '1 415 555 0123')).toBe('+14155550123');
  });

  it('accepts an international number typed with another country selected', () => {
    expect(toE164('US', '+55 11 98765-4321')).toBe('+5511987654321');
    expect(toE164('BR', '0052 55 1234 5678')).toBe('+525512345678');
  });

  it('rejects empty input', () => {
    expect(toE164('BR', '')).toBeNull();
    expect(toE164('BR', 'abc')).toBeNull();
  });
});

describe('display and OTP helpers', () => {
  it('formats for display', () => {
    expect(formatPhoneForDisplay('+5511987654321')).toBe('+55 11 98765-4321');
    expect(formatPhoneForDisplay('+14155550123')).toBe('+1 415 555 0123');
    expect(formatPhoneForDisplay('+525512345678')).toBe('+52 5512345678');
  });

  it('validates and cleans codes', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('12a456')).toBe(false);
    expect(cleanOtp(' 123-456 7')).toBe('123456');
  });
});

describe('authErrorKey', () => {
  it('maps Supabase errors to auth.errors keys', () => {
    expect(authErrorKey({ status: 429, message: 'x' })).toBe('rateLimited');
    expect(authErrorKey({ message: 'For security purposes, you can only request this after 30 seconds.' })).toBe('rateLimited');
    expect(authErrorKey({ code: 'otp_disabled', message: 'Signups not allowed for otp' })).toBe('noAccount');
    expect(authErrorKey({ message: 'Token has expired or is invalid' })).toBe('wrongCode');
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ message: 'Network request failed' })).toBe('network');
    expect(authErrorKey({ message: 'weird' })).toBe('generic');
    expect(authErrorKey(null)).toBe('generic');
  });
});

describe('onboarding state', () => {
  it('shows only for people who never finished or dismissed it', () => {
    expect(shouldShowOnboarding(null)).toBe(true);
    expect(shouldShowOnboarding({ is_completed: false, skipped: false })).toBe(true);
    expect(shouldShowOnboarding({ is_completed: true })).toBe(false);
    expect(shouldShowOnboarding({ skipped: true })).toBe(false);
  });

  it('has at most two steps', () => {
    expect(ONBOARDING_STEPS.length).toBeLessThanOrEqual(2);
  });
});
