import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  t, addResources, setLocaleSettings, getLocaleSettings, normalizeLanguage,
  defaultCurrencyFor, formatMoney, parseMoney, formatDate, getFixedT,
} from './index.js';

addResources({
  en: { test: { hi: 'Hi {{name}}', items_one: '{{count}} item', items_other: '{{count}} items', onlyEn: 'english' } },
  pt: { test: { hi: 'Oi {{name}}', items_one: '{{count}} item', items_other: '{{count}} itens' } },
  es: { test: { hi: 'Hola {{name}}' } },
});

test('normalizes languages', () => {
  assert.equal(normalizeLanguage('pt-BR'), 'pt');
  assert.equal(normalizeLanguage('es_MX'), 'es');
  assert.equal(normalizeLanguage('fr-FR'), 'en');
});

test('currency follows region, then language', () => {
  assert.equal(defaultCurrencyFor('pt-BR'), 'BRL');
  assert.equal(defaultCurrencyFor('es-MX'), 'MXN');
  assert.equal(defaultCurrencyFor('es-AR'), 'ARS');
  assert.equal(defaultCurrencyFor('en-GB'), 'GBP');
  assert.equal(defaultCurrencyFor('es'), 'USD');
});

test('translates with interpolation, plurals and English fallback', () => {
  setLocaleSettings({ language: 'pt' });
  assert.equal(t('test.hi', { name: 'Ana' }), 'Oi Ana');
  assert.equal(t('test.items', { count: 2 }), '2 itens');
  assert.equal(t('test.items', { count: 1 }), '1 item');
  assert.equal(t('test.onlyEn'), 'english');
  assert.equal(t('test.missing'), 'test.missing');
  assert.equal(getFixedT('es')('test.hi', { name: 'Leo' }), 'Hola Leo');
});

test('formats money per locale', () => {
  setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
  assert.equal(getLocaleSettings().currency, 'BRL');
  assert.match(formatMoney(1234.5), /R\$\s1\.234,50/);
  setLocaleSettings({ language: 'en', locale: 'en-US', currency: 'USD' });
  assert.equal(formatMoney(1234.5), '$1,234.50');
  assert.equal(formatMoney(null), '$0.00');
});

test('parses typed amounts in either convention', () => {
  setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
  assert.equal(parseMoney('R$ 1.234,56'), 1234.56);
  assert.equal(parseMoney('12,5'), 12.5);
  setLocaleSettings({ language: 'en', locale: 'en-US', currency: 'USD' });
  assert.equal(parseMoney('$1,234.56'), 1234.56);
  assert.equal(parseMoney('12.5'), 12.5);
});

test('formats date-only strings as local dates', () => {
  setLocaleSettings({ language: 'pt', locale: 'pt-BR' });
  assert.equal(formatDate('2026-11-30', 'short'), '30/11/2026');
  setLocaleSettings({ language: 'en', locale: 'en-US' });
  assert.equal(formatDate('2026-11-30', 'short'), '11/30/2026');
});
