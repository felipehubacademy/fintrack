import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createZul } from '../zul/index.js';
import * as local from '../zul/billing.js';
import * as shared from '../../shared/src/billing/index.js';
import { FEATURE_DEFAULTS } from '../../shared/src/config/features.js';
import { CATALOGS } from '../zul/reply.js';
import { createFakeDb, createFakeWa, createFakeAi, textMessage } from './helpers/fakes.js';

const BR = '5511987654321';
const MX = '5215512345678';
const US = '14155551234';
const NOW = new Date('2026-11-26T15:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(NOW.getTime() + ms).toISOString();

function setup(aiResponses = []) {
  const db = createFakeDb();
  const wa = createFakeWa();
  const ai = createFakeAi(aiResponses);
  const zul = createZul({ db, wa, ai, now: () => NOW });
  const say = async (from, body) => {
    const before = wa.sent.length;
    await zul.handleMessage(textMessage(from, body), { wa_id: from, profile: { name: 'Fê' } });
    return wa.sent.slice(before);
  };
  const org = () => db.tables.organizations[0];
  return { db, wa, ai, zul, say, org };
}

/** Account with one expense, then the organization's billing columns set. */
async function account(phone, firstExpense, billing, aiResponses) {
  const s = setup(aiResponses);
  await s.say(phone, firstExpense);
  Object.assign(s.org(), billing);
  return s;
}

const EXPIRED = { trial_ends_at: iso(-1 * DAY) };

afterEach(() => local.setPaywallOverride(undefined));

describe('billing mirror of @fintrack/shared/billing', () => {
  it('prices, trial length, templates and paywall default match', () => {
    assert.deepEqual(local.PRICES, shared.PRICES);
    assert.equal(local.TRIAL_DAYS, shared.TRIAL_DAYS);
    assert.deepEqual(local.BILLING_TEMPLATES, shared.BILLING_TEMPLATES);
    assert.equal(local.PAYWALL_DEFAULT, FEATURE_DEFAULTS.paywall);
    for (const c of ['BRL', 'MXN', 'COP', 'USD', 'ARS', 'eur', null]) {
      assert.deepEqual(local.pricesFor(c), shared.pricesFor(c));
      assert.equal(local.annualSavingsPercent(c), shared.annualSavingsPercent(c));
    }
  });

  it('getBillingState gives the same answer', () => {
    const cases = [
      {}, { trialEndsAt: iso(3 * DAY) }, { trialEndsAt: iso(-DAY) }, { trialEndsAt: iso(-DAY), plusUntil: iso(DAY) },
      { trialEndsAt: iso(-5 * DAY), plusUntil: iso(-DAY) }, { trialEndsAt: 'garbage' }, { trialEndsAt: iso(10 * 60 * 1000) },
    ];
    for (const c of cases) assert.deepEqual(local.getBillingState({ ...c, now: NOW }), shared.getBillingState({ ...c, now: NOW }), JSON.stringify(c));
  });

  it('subscribe links use ZUL_DASHBOARD_URL or www.meuazulao.com.br', () => {
    const before = process.env.ZUL_DASHBOARD_URL;
    delete process.env.ZUL_DASHBOARD_URL;
    assert.equal(local.subscribeLink('org-1'), 'https://www.meuazulao.com.br/assinar/org-1');
    assert.equal(local.winbackLink('org-1'), 'https://www.meuazulao.com.br/oferta/org-1');
    process.env.ZUL_DASHBOARD_URL = 'https://staging.example.com/';
    assert.equal(local.subscribeLink('org-1'), 'https://staging.example.com/assinar/org-1');
    if (before === undefined) delete process.env.ZUL_DASHBOARD_URL;
    else process.env.ZUL_DASHBOARD_URL = before;
  });

  it('FEATURE_PAYWALL turns gating off', () => {
    const before = process.env.FEATURE_PAYWALL;
    process.env.FEATURE_PAYWALL = 'false';
    assert.equal(local.paywallEnabled(), false);
    assert.equal(local.isBlocked(EXPIRED, NOW), false);
    process.env.FEATURE_PAYWALL = '1';
    assert.equal(local.isBlocked(EXPIRED, NOW), true);
    if (before === undefined) delete process.env.FEATURE_PAYWALL;
    else process.env.FEATURE_PAYWALL = before;
  });

  it('no Zul copy promises a fixed free-until date', () => {
    for (const catalog of Object.values(CATALOGS)) {
      for (const text of Object.values(catalog)) assert.doesNotMatch(text, /2027|early access|acesso antecipado|acceso anticipado/i);
    }
  });
});

describe('trial over: nothing new is saved', () => {
  it('pt: expense not saved, offer with prices and the subscribe link', async () => {
    const { db, say, org } = await account(BR, 'mercado 10', EXPIRED);
    assert.equal(db.tables.expenses.length, 1);
    const out = await say(BR, 'uber 23');
    assert.equal(db.tables.expenses.length, 1);
    assert.equal(out.length, 1);
    assert.match(out[0].body, /Seu teste grátis terminou, então não anotei isso/);
    assert.match(out[0].body, /\*R\$ 9,90\* por mês ou \*R\$ 79,90\* por ano \(economize 32%\)/);
    assert.ok(out[0].body.includes(`https://www.meuazulao.com.br/assinar/${org().id}`));
  });

  it('es: gasto no guardado, oferta en MXN', async () => {
    const { db, say, org } = await account(MX, 'súper 100', EXPIRED);
    const out = await say(MX, 'uber 50');
    assert.equal(db.tables.expenses.length, 1);
    assert.match(out[0].body, /Tu prueba gratis terminó, así que no anoté esto/);
    assert.match(out[0].body, /\*\$59\* al mes o \*\$449\* al año/);
    assert.ok(out[0].body.includes(`/assinar/${org().id}`));
  });

  it('en: expense not saved, offer in USD', async () => {
    const { db, say, org } = await account(US, 'coffee 5', EXPIRED);
    const out = await say(US, 'lunch 12');
    assert.equal(db.tables.expenses.length, 1);
    assert.match(out[0].body, /Your free trial has ended, so I didn't save that/);
    assert.match(out[0].body, /\*\$4\.99\* a month or \*\$39\.99\* a year \(save 33%\)/);
    assert.ok(out[0].body.includes(`/assinar/${org().id}`));
  });

  it('income, bills, budgets and model-detected expenses are blocked too', async () => {
    const { db, say } = await account(BR, 'mercado 10', EXPIRED, [{ type: 'expense', items: [{ amount: 30, description: 'Farmácia', category: 'health', confidence: 'high' }] }]);
    for (const text of ['recebi 3000 salário', 'aluguel 2500 todo dia 5', 'limite 800 restaurante', 'comprei remédio de 30 reais na farmácia']) {
      const out = await say(BR, text);
      assert.match(out[0].body, /teste grátis terminou/, text);
    }
    assert.equal(db.tables.expenses.length, 1);
    assert.equal(db.tables.incomes.length, 0);
    assert.equal(db.tables.bills.length, 0);
    assert.equal(db.tables.budgets.length, 0);
  });

  it('receipt photos get the offer without calling the model', async () => {
    const { ai, wa, zul, db } = await account(BR, 'mercado 10', EXPIRED);
    const before = wa.sent.length;
    await zul.handleMessage({ from: BR, id: 'wamid.img1', type: 'image', image: { id: 'media-1', mime_type: 'image/jpeg' } });
    assert.equal(ai.calls.length, 0);
    assert.match(wa.sent[before].body, /teste grátis terminou/);
    assert.equal(db.tables.expenses.length, 1);
  });

  it('queries and summaries still work', async () => {
    const { say } = await account(BR, 'uber 23', EXPIRED);
    await say(BR, 'Felipe');
    assert.match((await say(BR, 'quanto gastei com uber esse mês?'))[0].body, /R\$ 23,00/);
    assert.match((await say(BR, 'resumo'))[0].body, /Gastos: \*R\$ 23,00\*/);
    const mx = await account(MX, 'uber 50', EXPIRED);
    assert.match((await mx.say(MX, 'resumen'))[0].body, /50/);
    const us = await account(US, 'uber 9', EXPIRED);
    assert.match((await us.say(US, 'summary'))[0].body, /\$9\.00/);
  });

  it('account deletion still answers with the link', async () => {
    for (const [phone, first, text] of [[BR, 'uber 1', 'apagar minha conta'], [MX, 'uber 1', 'eliminar mi cuenta'], [US, 'uber 1', 'delete my account']]) {
      const { say, db } = await account(phone, first, EXPIRED);
      assert.match((await say(phone, text))[0].body, /delete-account/);
      assert.equal(db.tables.users.length, 1);
    }
  });

  it('Plus or paywall flag off: saved as usual', async () => {
    const plus = await account(BR, 'mercado 10', { trial_ends_at: iso(-10 * DAY), plus_until: iso(20 * DAY) });
    await plus.say(BR, 'uber 23');
    assert.equal(plus.db.tables.expenses.length, 2);

    local.setPaywallOverride(false);
    const off = await account(BR, 'mercado 10', EXPIRED);
    await off.say(BR, 'uber 23');
    assert.equal(off.db.tables.expenses.length, 2);
  });

  it('organizations without billing columns (migration not run) keep working', async () => {
    const { db, say } = setup();
    await say(BR, 'mercado 10');
    await say(BR, 'uber 23');
    assert.equal(db.tables.expenses.length, 2);
  });
});

describe('assinar / suscribirme / subscribe', () => {
  it('trial: days left, prices and the link in each language', async () => {
    const br = await account(BR, 'mercado 10', { trial_ends_at: iso(5 * DAY) });
    const pt = (await br.say(BR, 'assinar'))[0].body;
    assert.match(pt, /teste grátis, que termina em 5 dias/);
    assert.match(pt, /R\$ 9,90/);
    assert.ok(pt.includes(`/assinar/${br.org().id}`));

    const mx = await account(MX, 'súper 100', { trial_ends_at: iso(1 * DAY) });
    const es = (await mx.say(MX, 'suscribirme'))[0].body;
    assert.match(es, /prueba gratis, que termina en 1 día/);
    assert.ok(es.includes(`/assinar/${mx.org().id}`));

    const us = await account(US, 'coffee 5', { trial_ends_at: iso(3 * DAY) });
    const en = (await us.say(US, 'subscribe'))[0].body;
    assert.match(en, /free trial, which ends in 3 days/);
    assert.ok(en.includes(`/assinar/${us.org().id}`));
  });

  it('expired and active', async () => {
    const exp = await account(US, 'coffee 5', EXPIRED);
    const out = (await exp.say(US, 'plan'))[0].body;
    assert.match(out, /Your free trial has ended/);
    assert.ok(out.includes(`/assinar/${exp.org().id}`));

    const act = await account(BR, 'mercado 10', { trial_ends_at: iso(-10 * DAY), plus_until: '2026-12-26T00:00:00Z', plus_source: 'app_store' });
    assert.match((await act.say(BR, 'plano'))[0].body, /Você é Plus/);
    assert.match((await act.say(BR, 'cancelar'))[0].body, /App Store ou no Google Play/);
  });

  it('before having an account: trial and prices, no link', async () => {
    const { say, db } = setup();
    const out = (await say(MX, 'suscribirme'))[0].body;
    assert.match(out, /Pruebas gratis por 7 días/);
    assert.match(out, /\$59/);
    assert.equal(db.tables.users.length, 0);
  });
});

describe('trial ending line', () => {
  it('added once to a normal reply when 2 days or fewer are left', async () => {
    const { say, db } = await account(BR, 'mercado 10', { trial_ends_at: iso(2 * DAY - 60_000) });
    const first = await say(BR, 'Felipe');
    assert.match(first[0].body, /^Prazer, Felipe!/);
    assert.match(first[first.length - 1].body, /⏳ Seu teste grátis termina em 2 dias\. Mande \*assinar\*/);
    assert.ok(db.tables.conversations.get(BR).trial_notice_sent_at);
    const second = await say(BR, 'uber 7');
    assert.ok(second.every((m) => !/⏳/.test(m.body)));
  });

  it('es and en copy, not with more days left', async () => {
    const mx = await account(MX, 'súper 100', { trial_ends_at: iso(DAY / 2) });
    const es = await mx.say(MX, 'taxi 50');
    assert.match(es[es.length - 1].body, /⏳ Tu prueba gratis termina en 1 día\. Escribe \*suscribirme\*/);

    const us = await account(US, 'coffee 5', { trial_ends_at: iso(DAY + 1000) });
    const en = await us.say(US, 'lunch 12');
    assert.match(en[en.length - 1].body, /⏳ Your free trial ends in 2 days\. Send \*subscribe\*/);

    const early = await account(US, 'coffee 5', { trial_ends_at: iso(5 * DAY) });
    const none = await early.say(US, 'lunch 12');
    assert.ok(none.every((m) => !/⏳/.test(m.body)));
  });
});
