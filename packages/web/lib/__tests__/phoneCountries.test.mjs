import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultCountryFor,
  toE164,
  splitInternational,
  countryByCode,
} from '../phoneCountries.js';

test('defaultCountryFor uses the locale region, then the language', () => {
  assert.equal(defaultCountryFor('es-CO', 'es'), 'CO');
  assert.equal(defaultCountryFor('pt-BR', 'pt'), 'BR');
  assert.equal(defaultCountryFor('es', 'es'), 'MX');
  assert.equal(defaultCountryFor('en', 'en'), 'US');
  assert.equal(defaultCountryFor('pt', 'pt'), 'BR');
  assert.equal(defaultCountryFor('en-ZZ', 'en'), 'US');
});

test('toE164 builds a Brazilian mobile number', () => {
  assert.equal(toE164('BR', '(11) 99999-8888'), '+5511999998888');
  assert.equal(toE164('BR', '011 99999-8888'), '+5511999998888');
});

test('toE164 strips a pasted country code but keeps DDD 55', () => {
  assert.equal(toE164('BR', '+55 11 99999-8888'), '+5511999998888');
  // DDD 55 (Rio Grande do Sul) without country code must not be stripped.
  assert.equal(toE164('BR', '55 99999-8888'), '+5555999998888');
  assert.equal(toE164('BR', '+55 55 99999-8888'), '+5555999998888');
});

test('toE164 handles other countries and rejects bad input', () => {
  assert.equal(toE164('MX', '55 1234 5678'), '+525512345678');
  assert.equal(toE164('US', '(415) 555-0100'), '+14155550100');
  assert.equal(toE164('BR', '123'), null);
  assert.equal(toE164('XX', '11999998888'), null);
  assert.equal(toE164('BR', '1'.repeat(20)), null);
});

test('splitInternational prefers the given country on shared codes', () => {
  assert.deepEqual(splitInternational('+55 11 99999-8888'), { country: 'BR', national: '11999998888' });
  assert.deepEqual(splitInternational('14165550100', 'CA'), { country: 'CA', national: '4165550100' });
  assert.equal(splitInternational(''), null);
  assert.ok(countryByCode('br'));
});
