import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  funnelStep, pickPrimary, firstName, withinServiceWindow, buildFunnelMessage, runTrialFunnel, deliverFunnelMessage,
} from '../zul/funnel.js';
import { createHandler, cronAuthorized, isDryRun } from '../api/cron/trial-funnel.js';
import { setPaywallOverride } from '../zul/billing.js';
import { createFakeWa } from './helpers/fakes.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// 12:00 in São Paulo, 09:00 in Mexico City, 10:00 in New York.
const NOW = new Date('2026-12-03T15:00:00Z');
const at = (ms) => new Date(NOW.getTime() + ms).toISOString();

afterEach(() => setPaywallOverride(undefined));

// ---------------------------------------------------------------------------
// Template bodies straight from docs/launch/BILLING.md §4
// ---------------------------------------------------------------------------
const billingDoc = readFileSync(fileURLToPath(new URL('../../../docs/launch/BILLING.md', import.meta.url)), 'utf8');

function docTemplate(name, langCode) {
  const section = billingDoc.split(`### \`${name}\``)[1].split('\n### ')[0];
  const row = section.split('\n').find((l) => l.startsWith(`| ${langCode} |`));
  return row.match(/`([^`]+)`/)[1];
}

function fill(body, values) {
  return body.replace(/\{\{(\d)\}\}/g, (_, i) => values[Number(i) - 1]);
}

describe('funnelStep', () => {
  const tz = 'America/Sao_Paulo';
  it('day 7: trial ends today (local calendar), not yet sent', () => {
    assert.equal(funnelStep({ trial_ends_at: at(6 * HOUR) }, { now: NOW, timezone: tz }), 'trial_ending');
    assert.equal(funnelStep({ trial_ends_at: at(-2 * HOUR) }, { now: NOW, timezone: tz }), 'trial_ending');
    assert.equal(funnelStep({ trial_ends_at: at(6 * HOUR), trial_ending_sent_at: at(-HOUR) }, { now: NOW, timezone: tz }), null);
  });

  it('day 8: trial ended yesterday, not Plus, offer not sent', () => {
    assert.equal(funnelStep({ trial_ends_at: at(-DAY) }, { now: NOW, timezone: tz }), 'winback');
    assert.equal(funnelStep({ trial_ends_at: at(-DAY), winback_sent_at: at(-HOUR) }, { now: NOW, timezone: tz }), null);
    assert.equal(funnelStep({ trial_ends_at: at(-DAY), plus_until: at(30 * DAY) }, { now: NOW, timezone: tz }), null);
    assert.equal(funnelStep({ trial_ends_at: at(6 * HOUR), plus_until: at(30 * DAY) }, { now: NOW, timezone: tz }), null);
  });

  it('a missed run still sends the offer for 2 more days, then stops', () => {
    assert.equal(funnelStep({ trial_ends_at: at(-3 * DAY) }, { now: NOW, timezone: tz }), 'winback');
    assert.equal(funnelStep({ trial_ends_at: at(-4 * DAY) }, { now: NOW, timezone: tz }), null);
  });

  it('nothing before day 7 or without a trial date', () => {
    assert.equal(funnelStep({ trial_ends_at: at(2 * DAY) }, { now: NOW, timezone: tz }), null);
    assert.equal(funnelStep({}, { now: NOW, timezone: tz }), null);
  });

  it('uses the user timezone for "today"', () => {
    // 2026-12-04T02:00Z is still Dec 3 in Mexico City but Dec 4 in UTC.
    const org = { trial_ends_at: '2026-12-04T02:00:00Z' };
    assert.equal(funnelStep(org, { now: NOW, timezone: 'America/Mexico_City' }), 'trial_ending');
    assert.equal(funnelStep(org, { now: NOW, timezone: 'UTC' }), null);
  });
});

describe('contacts and window', () => {
  it('prefers the admin, then role admin, then the most recent conversation', () => {
    const org = { id: 'o1', admin_id: 'u2' };
    const c = (id, role, seen) => ({ user: { id, role }, conversation: { phone: `55119${id}`, last_seen_at: seen } });
    assert.equal(pickPrimary(org, [c('u1', 'member', at(-HOUR)), c('u2', 'member', at(-DAY))]).user.id, 'u2');
    assert.equal(pickPrimary({ id: 'o1' }, [c('u1', 'member', at(-HOUR)), c('u3', 'admin', at(-DAY))]).user.id, 'u3');
    assert.equal(pickPrimary({ id: 'o1' }, [c('u1', 'member', at(-DAY)), c('u4', 'member', at(-HOUR))]).user.id, 'u4');
    assert.equal(pickPrimary(org, []), null);
  });

  it('first names and the 24 h window', () => {
    assert.equal(firstName('Felipe Souza'), 'Felipe');
    assert.equal(firstName('+5511987654321'), null);
    assert.equal(firstName(''), null);
    assert.equal(withinServiceWindow(at(-2 * HOUR), NOW), true);
    assert.equal(withinServiceWindow(at(-23.5 * HOUR), NOW), false);
    assert.equal(withinServiceWindow(null, NOW), false);
  });
});

describe('message text matches the approved templates', () => {
  const cases = [
    { lang: 'pt', code: 'pt_BR', currency: 'BRL', phone: '5511987654321', name: 'Felipe', prices: ['R$ 9,90', 'R$ 79,90', 'R$ 0,99'], buttons: ['Assinar', 'Quero a oferta'] },
    { lang: 'es', code: 'es', currency: 'MXN', phone: '525512345678', name: 'Sofía', prices: ['$59', '$449', '$9'], buttons: ['Suscribirme', 'Quiero la oferta'] },
    { lang: 'en', code: 'en', currency: 'USD', phone: '14155551234', name: 'Alex', prices: ['$4.99', '$39.99', '$0.99'], buttons: ['Subscribe', 'Get the offer'] },
  ];

  for (const c of cases) {
    it(`fim_teste (${c.lang})`, () => {
      const [monthly, annual] = c.prices;
      const m = buildFunnelMessage({ step: 'trial_ending', lang: c.lang, currency: c.currency, phone: c.phone, name: `${c.name} Lima`, organizationId: 'org-123' });
      assert.equal(m.text, fill(docTemplate('fim_teste', c.code), [c.name, monthly, annual]));
      assert.equal(m.buttonLabel, c.buttons[0]);
      assert.equal(m.url, 'https://www.meuazulao.com.br/assinar/org-123');
      assert.equal(m.template.name, 'fim_teste');
      assert.equal(m.template.language, c.code);
      assert.deepEqual(m.template.components, [
        { type: 'body', parameters: [c.name, monthly, annual].map((text) => ({ type: 'text', text })) },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'org-123' }] },
      ]);
    });

    it(`oferta_primeiro_mes (${c.lang})`, () => {
      const [monthly, , winback] = c.prices;
      const m = buildFunnelMessage({ step: 'winback', lang: c.lang, currency: c.currency, phone: c.phone, name: c.name, organizationId: 'org-123' });
      assert.equal(m.text, fill(docTemplate('oferta_primeiro_mes', c.code), [c.name, winback, monthly]));
      assert.equal(m.buttonLabel, c.buttons[1]);
      assert.equal(m.url, 'https://www.meuazulao.com.br/oferta/org-123');
      assert.equal(m.template.name, 'oferta_primeiro_mes');
      assert.deepEqual(m.template.components[0].parameters.map((p) => p.text), [c.name, winback, monthly]);
      assert.deepEqual(m.template.components[1].parameters, [{ type: 'text', text: 'org-123' }]);
    });
  }

  it('placeholder names get a friendly fallback; unknown currencies pay in USD', () => {
    const m = buildFunnelMessage({ step: 'trial_ending', lang: 'es', currency: 'ARS', phone: '5491123456789', name: '+5491123456789', organizationId: 'o' });
    assert.match(m.text, /^¡Hola, qué tal! /);
    assert.equal(m.currency, 'USD');
    assert.match(m.text, /US\$ 4,99/);
  });
});

// ---------------------------------------------------------------------------
// Runs against an in-memory store
// ---------------------------------------------------------------------------
function fakeStore(orgs, contacts) {
  const calls = [];
  return {
    orgs,
    calls,
    async listCandidates() { return orgs; },
    async whatsappContacts(org) { return contacts[org.id] || []; },
    async claim(orgId, column, when) {
      const org = orgs.find((o) => o.id === orgId);
      if (org[column]) return false;
      org[column] = when;
      calls.push(['claim', orgId, column]);
      return true;
    },
    async release(orgId, column) { orgs.find((o) => o.id === orgId)[column] = null; calls.push(['release', orgId, column]); },
  };
}

function world() {
  const orgs = [
    { id: 'org-br', admin_id: 'u-br', trial_ends_at: at(4 * HOUR) }, // day 7, wrote 1 h ago
    { id: 'org-mx', admin_id: 'u-mx', trial_ends_at: at(-DAY) }, // day 8, silent for days
    { id: 'org-us', admin_id: 'u-us', trial_ends_at: at(-DAY + HOUR), plus_until: at(30 * DAY) }, // Plus
    { id: 'org-ghost', admin_id: 'u-x', trial_ends_at: at(2 * HOUR) }, // never talked to Zul
  ];
  const contacts = {
    'org-br': [{ user: { id: 'u-br', name: 'Felipe', role: 'admin' }, conversation: { phone: '5511987654321', language: 'pt', currency: 'BRL', last_seen_at: at(-HOUR) } }],
    'org-mx': [{ user: { id: 'u-mx', name: 'Sofía', role: 'admin', language: 'es' }, conversation: { phone: '525512345678', last_seen_at: at(-5 * DAY) } }],
    'org-us': [{ user: { id: 'u-us', name: 'Alex', role: 'admin' }, conversation: { phone: '14155551234', language: 'en', last_seen_at: at(-HOUR) } }],
  };
  return { store: fakeStore(orgs, contacts), wa: createFakeWa() };
}

describe('runTrialFunnel', () => {
  it('free message inside 24 h, template outside, marks the columns, skips Plus', async () => {
    const { store, wa } = world();
    const r = await runTrialFunnel({ store, wa, now: NOW });
    assert.equal(r.sent.length, 2);
    assert.deepEqual(r.skipped, [{ organizationId: 'org-ghost', reason: 'no_whatsapp_user' }]);

    const free = wa.sent.find((s) => s.to === '5511987654321');
    assert.match(free.body, /^Oi, Felipe! Seu teste grátis do MeuAzulão termina hoje\./);
    assert.deepEqual(free.cta, { label: 'Assinar', url: 'https://www.meuazulao.com.br/assinar/org-br' });

    const tpl = wa.sent.find((s) => s.to === '525512345678');
    assert.equal(tpl.template, 'oferta_primeiro_mes');
    assert.equal(tpl.lang, 'es');
    assert.deepEqual(tpl.components[0].parameters.map((p) => p.text), ['Sofía', '$9', '$59']);
    assert.deepEqual(tpl.components[1].parameters, [{ type: 'text', text: 'org-mx' }]);

    assert.ok(store.orgs[0].trial_ending_sent_at);
    assert.ok(store.orgs[1].winback_sent_at);
    assert.equal(store.orgs[2].trial_ending_sent_at, undefined);
    assert.equal(wa.sent.some((s) => s.to === '14155551234'), false);

    const again = await runTrialFunnel({ store, wa, now: NOW });
    assert.equal(again.sent.length, 0);
    assert.equal(wa.sent.length, 2);
  });

  it('dry run sends and marks nothing', async () => {
    const { store, wa } = world();
    const r = await runTrialFunnel({ store, wa, now: NOW, dryRun: true, log: { info() {} } });
    assert.equal(wa.sent.length, 0);
    assert.equal(r.planned.length, 2);
    assert.deepEqual(r.planned.map((p) => [p.step, p.channel, p.language]), [['trial_ending', 'free', 'pt'], ['winback', 'template', 'es']]);
    assert.equal(store.calls.length, 0);
  });

  it('a failed send releases the claim so tomorrow retries', async () => {
    const { store } = world();
    const wa = { async sendCtaUrl() { throw new Error('boom'); }, async sendTemplate() { throw new Error('boom'); } };
    const r = await runTrialFunnel({ store, wa, now: NOW });
    assert.equal(r.failed.length, 2);
    assert.equal(store.orgs[0].trial_ending_sent_at, null);
    assert.equal(store.orgs[1].winback_sent_at, null);
  });

  it('does nothing while the paywall flag is off', async () => {
    setPaywallOverride(false);
    const { store, wa } = world();
    const r = await runTrialFunnel({ store, wa, now: NOW });
    assert.equal(r.disabled, 'paywall');
    assert.equal(wa.sent.length, 0);
  });

  it('free message falls back to the template when WhatsApp refuses it', async () => {
    const sent = [];
    const wa = {
      async sendCtaUrl() { throw new Error('outside window'); },
      async sendTemplate(to, name) { sent.push(name); return 'wamid.t'; },
    };
    const m = buildFunnelMessage({ step: 'trial_ending', lang: 'en', currency: 'USD', name: 'Alex', organizationId: 'o' });
    const r = await deliverFunnelMessage(wa, '14155551234', m, { freeForm: true });
    assert.equal(r.channel, 'template');
    assert.deepEqual(sent, ['fim_teste']);
  });
});

// ---------------------------------------------------------------------------
// HTTP endpoint
// ---------------------------------------------------------------------------
function fakeRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.body = b; return this; },
  };
}

describe('/api/cron/trial-funnel', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('auth: Bearer or x-cron-secret, 500 without a secret', () => {
    assert.equal(cronAuthorized({ authorization: 'Bearer s3cret' }, 's3cret').ok, true);
    assert.equal(cronAuthorized({ 'x-cron-secret': 's3cret' }, 's3cret').ok, true);
    assert.equal(cronAuthorized({ authorization: 'Bearer nope' }, 's3cret').status, 401);
    assert.equal(cronAuthorized({}, 's3cret').status, 401);
    assert.equal(cronAuthorized({ authorization: 'Bearer x' }, '').status, 500);
  });

  it('dry run from WEBHOOK_DRY_RUN or ?dry_run=1', () => {
    assert.equal(isDryRun({ dry_run: '1' }, {}), true);
    assert.equal(isDryRun({}, { WEBHOOK_DRY_RUN: '1' }), true);
    assert.equal(isDryRun({}, {}), false);
  });

  it('runs the funnel when authorized', async () => {
    process.env.CRON_SECRET = 's3cret';
    delete process.env.WEBHOOK_DRY_RUN;
    const { store, wa } = world();
    const handler = createHandler({ store, wa, now: () => NOW });

    const denied = fakeRes();
    await handler({ method: 'POST', headers: {}, query: {} }, denied);
    assert.equal(denied.statusCode, 401);
    assert.equal(wa.sent.length, 0);

    const dry = fakeRes();
    await handler({ method: 'GET', headers: { authorization: 'Bearer s3cret' }, query: { dry_run: '1' } }, dry);
    assert.equal(dry.statusCode, 200);
    assert.equal(dry.body.planned.length, 2);
    assert.equal(wa.sent.length, 0);

    const ok = fakeRes();
    await handler({ method: 'POST', headers: { 'x-cron-secret': 's3cret' }, query: {} }, ok);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.sent.length, 2);
    assert.equal(wa.sent.length, 2);
  });
});
