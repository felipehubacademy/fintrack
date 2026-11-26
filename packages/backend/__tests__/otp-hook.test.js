import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { verifyStandardWebhook, signStandardWebhook } from '../zul/security.js';
import { createHandler, templateLanguage, otpTemplateComponents } from '../api/auth/whatsapp-otp.js';
import { createFakeDb, createFakeWa } from './helpers/fakes.js';

const SECRET = `v1,whsec_${Buffer.from('super-secret-key-for-tests').toString('base64')}`;

function signedRequest(body, { secret = SECRET, id = 'msg_1', ts = Math.floor(Date.now() / 1000) } = {}) {
  const raw = JSON.stringify(body);
  const req = Readable.from([Buffer.from(raw)]);
  req.method = 'POST';
  req.headers = { 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': signStandardWebhook(raw, secret, id, ts) };
  return req;
}

function response() {
  const res = { statusCode: 200, body: '' };
  res.setHeader = () => {};
  res.end = (b) => { res.body = b; };
  return res;
}

describe('Standard Webhooks signature (Supabase Send SMS Hook)', () => {
  const raw = '{"user":{"phone":"5511987654321"},"sms":{"otp":"123456"}}';
  const ts = Math.floor(Date.now() / 1000);
  const headers = { 'webhook-id': 'id1', 'webhook-timestamp': String(ts), 'webhook-signature': signStandardWebhook(raw, SECRET, 'id1', ts) };

  it('accepts a valid signature (secret as "v1,whsec_...")', () => {
    assert.deepEqual(verifyStandardWebhook(raw, headers, SECRET), { ok: true });
  });
  it('accepts the secret without the "v1," prefix and multiple signatures', () => {
    const multi = { ...headers, 'webhook-signature': `v1,AAAA ${headers['webhook-signature']}` };
    assert.ok(verifyStandardWebhook(raw, multi, SECRET.replace(/^v1,/, '')).ok);
  });
  it('rejects tampered body, wrong secret, old timestamp, missing headers', () => {
    assert.equal(verifyStandardWebhook(raw.replace('123456', '000000'), headers, SECRET).reason, 'signature');
    assert.equal(verifyStandardWebhook(raw, headers, `v1,whsec_${Buffer.from('other').toString('base64')}`).reason, 'signature');
    assert.equal(verifyStandardWebhook(raw, headers, SECRET, { now: (ts + 3600) * 1000 }).reason, 'timestamp');
    assert.equal(verifyStandardWebhook(raw, {}, SECRET).reason, 'missing_headers');
    assert.equal(verifyStandardWebhook(raw, headers, undefined).reason, 'missing_secret');
  });
});

describe('POST /api/auth/whatsapp-otp', () => {
  beforeEach(() => {
    process.env.SEND_SMS_HOOK_SECRET = SECRET;
    delete process.env.WHATSAPP_TEMPLATE_LANGS;
  });

  it('sends codigo_login in the user language (by country code)', async () => {
    const wa = createFakeWa();
    const res = response();
    await createHandler({ db: createFakeDb(), wa })(signedRequest({ user: { phone: '5215512345678' }, sms: { otp: '654321' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(wa.sent[0].template, 'codigo_login');
    assert.equal(wa.sent[0].lang, 'es');
    assert.equal(wa.sent[0].to, '5215512345678');
    assert.deepEqual(wa.sent[0].components, otpTemplateComponents('654321'));
  });

  it('uses the language the user chose on WhatsApp', async () => {
    const db = createFakeDb();
    await db.saveConversation('5511987654321', { language: 'en' });
    const wa = createFakeWa();
    await createHandler({ db, wa })(signedRequest({ user: { phone: '+55 11 98765-4321' }, sms: { otp: '111222' } }), response());
    assert.equal(wa.sent[0].lang, 'en');
  });

  it('rejects a bad signature with 401', async () => {
    const wa = createFakeWa();
    const res = response();
    await createHandler({ db: createFakeDb(), wa })(signedRequest({ user: { phone: '1' }, sms: { otp: '1' } }, { secret: `v1,whsec_${Buffer.from('x').toString('base64')}` }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(wa.sent.length, 0);
  });

  it('returns a hook error when WhatsApp fails', async () => {
    const wa = { sendTemplate: async () => { throw new Error('131026'); } };
    const res = response();
    await createHandler({ db: createFakeDb(), wa })(signedRequest({ user: { phone: '14155551234' }, sms: { otp: '1' } }), res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body, /http_code/);
  });

  it('template language codes are configurable', () => {
    assert.equal(templateLanguage('pt'), 'pt_BR');
    process.env.WHATSAPP_TEMPLATE_LANGS = 'en:en_US,es:es_MX';
    assert.equal(templateLanguage('en'), 'en_US');
    assert.equal(templateLanguage('es'), 'es_MX');
    delete process.env.WHATSAPP_TEMPLATE_LANGS;
  });
});
