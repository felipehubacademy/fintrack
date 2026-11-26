import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingState, pricesFor, annualSavingsPercent, webPurchaseLink, billingCurrency } from './index.js';

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

test('web purchase link', () => {
  assert.equal(webPurchaseLink('https://pay.rev.cat/abc/', 'org 1'), 'https://pay.rev.cat/abc/org%201');
  assert.equal(webPurchaseLink('', 'x'), '');
});
