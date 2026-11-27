/**
 * Webhook signature checks and raw-body helpers.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Meta's X-Hub-Signature-256: "sha256=<hex hmac of the raw body with the app secret>".
 */
export function verifyMetaSignature(rawBody, header, appSecret) {
  if (!appSecret || !header || rawBody === undefined || rawBody === null) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return safeEqual(expected, String(header).trim());
}

/**
 * Meta serializes JSON escaping "/" and non-ASCII characters. When the
 * platform already parsed the body, re-serialize it the same way so the
 * signature can still be checked.
 */
export function metaJsonStringify(value) {
  return JSON.stringify(value)
    .replace(/\//g, '\\/')
    .replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * Standard Webhooks (used by Supabase Auth hooks).
 * secret: "v1,whsec_<base64>" (as Supabase shows it) or "whsec_<base64>".
 * Signed content: `${id}.${timestamp}.${body}`; header "v1,<base64sig> v1,<...>".
 */
export function verifyStandardWebhook(rawBody, headers, secret, { toleranceSeconds = 300, now = Date.now() } = {}) {
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const get = (name) => headers[name] ?? headers[name.toLowerCase()] ?? headers.get?.(name);
  const id = get('webhook-id');
  const timestamp = get('webhook-timestamp');
  const signatures = get('webhook-signature');
  if (!id || !timestamp || !signatures) return { ok: false, reason: 'missing_headers' };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > toleranceSeconds) return { ok: false, reason: 'timestamp' };

  const base64Secret = String(secret).replace(/^v1,/, '').replace(/^whsec_/, '');
  const key = Buffer.from(base64Secret, 'base64');
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  const ok = String(signatures)
    .split(' ')
    .map((s) => s.split(','))
    .some(([version, sig]) => version === 'v1' && sig && safeEqual(sig, expected));
  return ok ? { ok: true } : { ok: false, reason: 'signature' };
}

/** Sign like Standard Webhooks (used by tests and local tooling). */
export function signStandardWebhook(rawBody, secret, id, timestamp) {
  const key = Buffer.from(String(secret).replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64')}`;
}

/**
 * Read the raw request body. Works with plain Node requests, with Vercel's
 * helpers (bodyParser disabled) and with Express (falls back to the parsed
 * body when the stream was already consumed).
 * Returns { raw: Buffer|null, parsed: any }.
 */
export async function readBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return { raw: req.rawBody, parsed: tryJson(req.rawBody) };
  if (typeof req.rawBody === 'string') return { raw: Buffer.from(req.rawBody), parsed: tryJson(req.rawBody) };
  let parsedBody;
  try {
    parsedBody = req.body; // Vercel exposes body as a lazy getter
  } catch (_) {
    parsedBody = undefined;
  }
  if (Buffer.isBuffer(parsedBody)) return { raw: parsedBody, parsed: tryJson(parsedBody) };
  if (typeof parsedBody === 'string') return { raw: Buffer.from(parsedBody), parsed: tryJson(parsedBody) };
  if (parsedBody && typeof parsedBody === 'object') return { raw: null, parsed: parsedBody };
  if (req.readable === false || req.readableEnded) return { raw: null, parsed: null };
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks);
  return { raw, parsed: tryJson(raw) };
}

function tryJson(buf) {
  try {
    return JSON.parse(Buffer.isBuffer(buf) ? buf.toString('utf8') : buf);
  } catch (_) {
    return null;
  }
}

/** Query string without relying on framework helpers. */
export function getQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  try {
    return Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  } catch (_) {
    return {};
  }
}

/** Respond with plain Node or Express/Vercel response objects. */
export function send(res, status, body, contentType = 'text/plain') {
  if (typeof res.status === 'function' && typeof res.send === 'function') {
    if (contentType === 'application/json') return res.status(status).json(body);
    return res.status(status).send(body);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.end(contentType === 'application/json' ? JSON.stringify(body) : String(body));
  return undefined;
}
