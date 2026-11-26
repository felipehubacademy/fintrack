import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingState, pricesFor, annualSavingsPercent, billingCurrency, appStoreUrl, storePlatform, storeLinkFor, PLAY_STORE_URL } from './index.js';

const now = new Date('2026-12-01T12:00:00Z');

test('trial, active and expired states', () => {
  assert.equal(getBillingState({ trialEndsAt: '2026-12-03T12:00:00Z', now }).status, 'trial');
  assert.equal(getBillingState({ trialEndsAt: '2026-12-03T12:00:00Z', now }).daysLeft, 2);
  assert.equal(getBillingState({ trialEndsAt: '2026-11-30T00:00:00Z', now }).status, 'expired');
  assert.equal(getBillingState({ trialEndsAt: '2026-11-30T00:00:00Z', now }).hasAccess, false);
  assert.equal(getBillingState({ trialEndsAt: '2026-11-30T00:00:00Z', plusUntil: '2027-01-01T00:00:00Z', now }).status, 'active');
  assert.equal(getBillingState({ now }).hasAccess, true);
});

test('prices fall back to USD', () => {
  assert.equal(billingCurrency('brl'), 'BRL');
  assert.equal(pricesFor('ARS').currency, 'USD');
  assert.equal(pricesFor('BRL').annual, 79.9);
  assert.equal(annualSavingsPercent('BRL'), 32);
});

test('App Store url', () => {
  assert.equal(appStoreUrl('id 6741234567'), 'https://apps.apple.com/app/id6741234567');
  assert.equal(appStoreUrl(''), '');
});

test('store link follows the device', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 WhatsApp/2.24';
  const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile';
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Safari/605.1.15';
  assert.equal(storePlatform(iphone), 'ios');
  assert.equal(storePlatform(android), 'android');
  assert.equal(storePlatform(mac), null);
  assert.equal(storeLinkFor(android), PLAY_STORE_URL);
  assert.equal(storeLinkFor(iphone, { appStoreId: '123' }), 'https://apps.apple.com/app/id123');
  assert.equal(storeLinkFor(iphone), '');
  assert.equal(storeLinkFor(mac, { appStoreId: '123' }), '');
});
