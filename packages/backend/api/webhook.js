/**
 * WhatsApp Cloud API webhook (Vercel function, route /webhook).
 *
 * GET  -> verification handshake with WHATSAPP_VERIFY_TOKEN.
 * POST -> checks X-Hub-Signature-256 with WHATSAPP_APP_SECRET, ignores status
 *         callbacks, then processes each message inline (idempotent by message
 *         id) and only then answers 200. No timers after the response.
 *
 * The old implementation (Assistants API, in-memory threads, setTimeout
 * debounce) lives in services/zulAssistant.js and is no longer used here.
 */
import { createZul, hasMessages } from '../zul/index.js';
import { verifyMetaSignature, metaJsonStringify, readBody, getQuery, send } from '../zul/security.js';

// Keep the raw body so the signature can be checked byte for byte.
export const config = { api: { bodyParser: false } };

let zul = null;
let warnedNoSecret = false;

export function verifyHandshake(query, expectedToken) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (expectedToken && mode === 'subscribe' && token === expectedToken) return { status: 200, body: String(challenge ?? '') };
  return { status: 403, body: 'Forbidden' };
}

/** Signature check that tolerates platforms which pre-parse JSON. */
export function checkSignature({ raw, parsed }, header, secret) {
  if (!secret) return { ok: true, skipped: true };
  if (!header) return { ok: false };
  if (raw && verifyMetaSignature(raw, header, secret)) return { ok: true };
  if (!raw && parsed && verifyMetaSignature(metaJsonStringify(parsed), header, secret)) return { ok: true };
  return { ok: false };
}

export function createHandler(deps = {}) {
  return async function handler(req, res) {
    if (req.method === 'GET') {
      const result = verifyHandshake(getQuery(req), process.env.WHATSAPP_VERIFY_TOKEN);
      return send(res, result.status, result.body);
    }
    if (req.method !== 'POST') return send(res, 405, 'Method Not Allowed');

    const body = await readBody(req);
    const secret = process.env.WHATSAPP_APP_SECRET;
    const signature = req.headers?.['x-hub-signature-256'];
    const check = checkSignature(body, signature, secret);
    if (check.skipped && !warnedNoSecret) {
      console.warn('[webhook] WHATSAPP_APP_SECRET is not set: signature NOT verified. Set it before launch.');
      warnedNoSecret = true;
    }
    if (!check.ok) {
      console.warn('[webhook] invalid X-Hub-Signature-256, ignoring request');
      return send(res, 401, 'Invalid signature');
    }

    const payload = body.parsed;
    if (!payload || payload.object !== 'whatsapp_business_account') return send(res, 200, 'OK');
    // Delivery/read receipts: nothing to do.
    if (!hasMessages(payload)) return send(res, 200, 'OK');
    if (process.env.WEBHOOK_DRY_RUN === '1') return send(res, 200, 'OK');

    try {
      zul = deps.zul || zul || createZul();
      await zul.handlePayload(payload);
    } catch (err) {
      // Per-message errors are handled inside; this is a bug or an outage.
      // Still answer 200: messages are idempotent and Meta would only retry into the same failure.
      console.error('[webhook] processing failed:', err);
    }
    return send(res, 200, 'OK');
  };
}

export default createHandler();
