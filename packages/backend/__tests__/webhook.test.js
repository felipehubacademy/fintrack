import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { createHandler, verifyHandshake, checkSignature } from '../api/webhook.js';
import { verifyMetaSignature, metaJsonStringify } from '../zul/security.js';

const SECRET = 'app_secret_123';
const sign = (raw, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;

function request({ method = 'POST', body = '', headers = {}, url = '/webhook' } = {}) {
  const req = Readable.from(method === 'POST' ? [Buffer.from(body)] : []);
  req.method = method;
  req.headers = headers;
  req.url = url;
  return req;
}

function response() {
  const res = { statusCode: 200, headers: {}, body: '' };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.end = (b) => { res.body = b; };
  return res;
}

const payload = (messages = [], statuses = []) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: '1', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages, statuses, contacts: [{ wa_id: '5511987654321', profile: { name: 'Fê' } }] } }] }],
});

describe('WhatsApp webhook verification (GET)', () => {
  const TOKEN = 'test_verify_token_123';
  it('returns 200 and challenge when token matches', () => {
    assert.deepEqual(verifyHandshake({ 'hub.mode': 'subscribe', 'hub.verify_token': TOKEN, 'hub.challenge': 'challenge_abc' }, TOKEN), { status: 200, body: 'challenge_abc' });
  });
  it('returns 403 when token does not match', () => {
    assert.equal(verifyHandshake({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': 'c' }, TOKEN).status, 403);
  });
  it('returns 403 when mode is not subscribe', () => {
    assert.equal(verifyHandshake({ 'hub.mode': 'unsubscribe', 'hub.verify_token': TOKEN, 'hub.challenge': 'c' }, TOKEN).status, 403);
  });
  it('returns 403 when token is missing or not configured', () => {
    assert.equal(verifyHandshake({ 'hub.mode': 'subscribe', 'hub.challenge': 'c' }, TOKEN).status, 403);
    assert.equal(verifyHandshake({ 'hub.mode': 'subscribe', 'hub.verify_token': undefined, 'hub.challenge': 'c' }, undefined).status, 403);
  });
  it('handler parses the query from the URL', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = TOKEN;
    const res = response();
    await createHandler({ zul: {} })(request({ method: 'GET', url: `/webhook?hub.mode=subscribe&hub.verify_token=${TOKEN}&hub.challenge=42` }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, '42');
  });
});

describe('X-Hub-Signature-256', () => {
  const raw = JSON.stringify(payload([{ from: '5511987654321', id: 'wamid.1', type: 'text', text: { body: 'café 8,50' } }]));
  it('accepts a valid signature', () => assert.ok(verifyMetaSignature(raw, sign(raw), SECRET)));
  it('rejects a wrong secret, tampered body or missing header', () => {
    assert.equal(verifyMetaSignature(raw, sign(raw, 'other'), SECRET), false);
    assert.equal(verifyMetaSignature(`${raw} `, sign(raw), SECRET), false);
    assert.equal(verifyMetaSignature(raw, undefined, SECRET), false);
  });
  it('can verify an already-parsed body using Meta escaping', () => {
    const metaRaw = '{"text":"caf\\u00e9 8,50","url":"https:\\/\\/x"}';
    const parsed = JSON.parse(metaRaw);
    assert.equal(metaJsonStringify(parsed), metaRaw);
    assert.ok(checkSignature({ raw: null, parsed }, sign(metaRaw), SECRET).ok);
  });
  it('skips (with a warning) only when the secret is unset', () => {
    assert.deepEqual(checkSignature({ raw: Buffer.from('{}') }, undefined, undefined), { ok: true, skipped: true });
    assert.equal(checkSignature({ raw: Buffer.from('{}') }, undefined, SECRET).ok, false);
  });
});

describe('POST /webhook', () => {
  let calls;
  const fakeZul = { handlePayload: async (p) => { calls.push(p); return ['done']; } };
  beforeEach(() => {
    calls = [];
    process.env.WHATSAPP_APP_SECRET = SECRET;
    delete process.env.WEBHOOK_DRY_RUN;
  });
  afterEach(() => { delete process.env.WHATSAPP_APP_SECRET; });

  it('rejects an invalid signature with 401 and does not process', async () => {
    const raw = JSON.stringify(payload([{ from: '1', id: 'a', type: 'text', text: { body: 'x' } }]));
    const res = response();
    await createHandler({ zul: fakeZul })(request({ body: raw, headers: { 'x-hub-signature-256': sign(raw, 'nope') } }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(calls.length, 0);
  });

  it('processes messages inline, then answers 200', async () => {
    const raw = JSON.stringify(payload([{ from: '5511987654321', id: 'wamid.ok', type: 'text', text: { body: 'uber 23' } }]));
    const res = response();
    await createHandler({ zul: fakeZul })(request({ body: raw, headers: { 'x-hub-signature-256': sign(raw) } }), res);
    assert.equal(calls.length, 1);
    assert.equal(res.statusCode, 200);
  });

  it('ignores status callbacks cheaply', async () => {
    const raw = JSON.stringify(payload([], [{ id: 'wamid.x', status: 'delivered' }]));
    const res = response();
    await createHandler({ zul: fakeZul })(request({ body: raw, headers: { 'x-hub-signature-256': sign(raw) } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 0);
  });

  it('answers 200 even if processing throws (idempotent retries would fail the same way)', async () => {
    const raw = JSON.stringify(payload([{ from: '1', id: 'b', type: 'text', text: { body: 'x' } }]));
    const res = response();
    await createHandler({ zul: { handlePayload: async () => { throw new Error('boom'); } } })(request({ body: raw, headers: { 'x-hub-signature-256': sign(raw) } }), res);
    assert.equal(res.statusCode, 200);
  });

  it('rejects other methods', async () => {
    const res = response();
    await createHandler({ zul: fakeZul })(request({ method: 'PUT' }), res);
    assert.equal(res.statusCode, 405);
  });
});
