import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  languageFromPhone, currencyFromPhone, languageSwitch, formatMoney, toE164, countryInfo, canonicalPhone,
} from '../zul/language.js';
import { CATALOGS, t } from '../zul/reply.js';
import { phoneVariants } from '../zul/db.js';

describe('canonical phone (same E.164 as the app phone login)', () => {
  it('BR adds the 9th digit, MX drops the 1, AR keeps the 9', () => {
    assert.equal(canonicalPhone('551187654321'), '5511987654321');
    assert.equal(canonicalPhone('+55 11 98765-4321'), '5511987654321');
    assert.equal(canonicalPhone('5215512345678'), '525512345678');
    assert.equal(canonicalPhone('525512345678'), '525512345678');
    assert.equal(canonicalPhone('541123456789'), '5491123456789');
    assert.equal(canonicalPhone('5491123456789'), '5491123456789');
    assert.equal(canonicalPhone('14155551234'), '14155551234');
  });
  it('lookup variants cover the WhatsApp and the app forms', () => {
    assert.ok(phoneVariants('5215512345678').includes('525512345678'));
    assert.ok(phoneVariants('525512345678').includes('5215512345678'));
    assert.ok(phoneVariants('5491123456789').includes('541123456789'));
    assert.ok(phoneVariants('551187654321').includes('5511987654321'));
  });
});

describe('language by phone country code', () => {
  it('+55 -> pt', () => assert.equal(languageFromPhone('5511987654321'), 'pt'));
  it('LatAm codes -> es', () => {
    for (const p of ['5215512345678', '573001234567', '5491112345678', '56912345678', '51912345678', '593991234567',
      '584121234567', '59171234567', '595981123456', '59891234567', '50688881234', '50761234567', '50371234567',
      '50251234567', '50491234567', '50581234567', '5351234567', '18095551234']) {
      assert.equal(languageFromPhone(p), 'es', p);
    }
  });
  it('everything else -> en (US, UK, Spain, Portugal, unknown)', () => {
    for (const p of ['14155551234', '447911123456', '34612345678', '351912345678', '81312345678']) {
      assert.equal(languageFromPhone(p), 'en', p);
    }
  });
  it('+1809 is the Dominican Republic, not the US', () => {
    assert.equal(countryInfo('18095551234').country, 'DO');
    assert.equal(countryInfo('14155551234').country, 'US');
  });
  it('currency by country', () => {
    assert.equal(currencyFromPhone('5511987654321'), 'BRL');
    assert.equal(currencyFromPhone('5215512345678'), 'MXN');
    assert.equal(currencyFromPhone('573001234567'), 'COP');
    assert.equal(currencyFromPhone('5491112345678'), 'ARS');
    assert.equal(currencyFromPhone('56912345678'), 'CLP');
    assert.equal(currencyFromPhone('51912345678'), 'PEN');
    assert.equal(currencyFromPhone('14155551234'), 'USD');
  });
  it('E.164', () => assert.equal(toE164('+55 (11) 98765-4321'), '+5511987654321'));
});

describe('language switch messages', () => {
  it('detects English / Español / Português', () => {
    assert.equal(languageSwitch('English'), 'en');
    assert.equal(languageSwitch('Español'), 'es');
    assert.equal(languageSwitch('espanol'), 'es');
    assert.equal(languageSwitch('Português'), 'pt');
    assert.equal(languageSwitch('portugues!'), 'pt');
  });
  it('ignores normal messages', () => {
    assert.equal(languageSwitch('english class 200'), null);
    assert.equal(languageSwitch('mercado 87,50'), null);
  });
});

describe('money formatting', () => {
  it('BRL in pt', () => assert.equal(formatMoney(87.5, { currency: 'BRL', lang: 'pt' }), 'R$ 87,50'));
  it('USD in en', () => assert.equal(formatMoney(1234.5, { currency: 'USD', lang: 'en' }), '$1,234.50'));
  it('MXN in es (Mexico)', () => assert.equal(formatMoney(87.5, { currency: 'MXN', lang: 'es', phone: '5215512345678' }), '$87.50'));
  it('CLP has no decimals', () => assert.match(formatMoney(5000, { currency: 'CLP', lang: 'es', phone: '56912345678' }), /^\$5\.000$/));
});

describe('message catalogs', () => {
  it('en, pt and es have the same keys', () => {
    const keys = (o) => Object.keys(o).sort();
    assert.deepEqual(keys(CATALOGS.pt), keys(CATALOGS.en));
    assert.deepEqual(keys(CATALOGS.es), keys(CATALOGS.en));
  });
  it('interpolates and pluralizes', () => {
    assert.equal(t('pt', 'currency_set', { currency: 'USD' }), 'Pronto, sua moeda agora é USD.');
    assert.match(t('en', 'query_result', { count: 1, amount: '$5', term: 'uber', period: 'today' }), /\(1 entry\)/);
    assert.match(t('en', 'query_result', { count: 3, amount: '$5', term: 'uber', period: 'today' }), /\(3 entries\)/);
  });
  it('no em dashes in user copy', () => {
    for (const [lang, cat] of Object.entries(CATALOGS)) {
      for (const [k, v] of Object.entries(cat)) assert.ok(!v.includes('—'), `${lang}.${k}`);
    }
  });
});
