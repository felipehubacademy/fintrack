/**
 * Minimal WhatsApp Cloud API client (fetch, no SDK).
 * Env: PHONE_ID (phone number id), WHATSAPP_TOKEN (permanent System User
 * token), WHATSAPP_GRAPH_VERSION (default v21.0).
 */
export function graphBase() {
  return `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'}`;
}

const DEFAULT_TEMPLATE_LANGS = { pt: 'pt_BR', es: 'es', en: 'en' };

/** Template language code for a Zul language (override with WHATSAPP_TEMPLATE_LANGS="pt:pt_BR,es:es,en:en_US"). */
export function templateLanguage(lang) {
  const map = { ...DEFAULT_TEMPLATE_LANGS };
  for (const pair of String(process.env.WHATSAPP_TEMPLATE_LANGS || '').split(',')) {
    const [k, v] = pair.split(':').map((s) => s && s.trim());
    if (k && v) map[k] = v;
  }
  return map[lang] || map.en;
}

function credentials() {
  const phoneId = process.env.PHONE_ID || process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) throw new Error('PHONE_ID and WHATSAPP_TOKEN must be set');
  return { phoneId, token };
}

async function graph(path, { method = 'GET', body, token }) {
  const res = await fetch(`${graphBase()}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`WhatsApp API ${res.status}: ${json?.error?.message || res.statusText}`);
    err.status = res.status;
    err.details = json?.error;
    if (res.status === 401) console.error('[zul] WhatsApp token invalid or expired: update WHATSAPP_TOKEN');
    throw err;
  }
  return json;
}

export function createWhatsApp() {
  async function send(payload) {
    const { phoneId, token } = credentials();
    const json = await graph(`${phoneId}/messages`, { method: 'POST', token, body: { messaging_product: 'whatsapp', ...payload } });
    return json?.messages?.[0]?.id || null;
  }

  return {
    sendText(to, body, { replyTo } = {}) {
      return send({
        to, type: 'text', text: { body: String(body).slice(0, 4096), preview_url: false },
        ...(replyTo ? { context: { message_id: replyTo } } : {}),
      });
    },

    /** Up to 3 quick-reply buttons: [{ id, title }]. */
    sendButtons(to, body, buttons, { replyTo } = {}) {
      return send({
        to,
        type: 'interactive',
        ...(replyTo ? { context: { message_id: replyTo } } : {}),
        interactive: {
          type: 'button',
          body: { text: String(body).slice(0, 1024) },
          action: { buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) },
        },
      });
    },

    /** Text with one link button (only inside the 24 h customer service window). */
    sendCtaUrl(to, body, displayText, url) {
      return send({
        to,
        type: 'interactive',
        interactive: {
          type: 'cta_url',
          body: { text: String(body).slice(0, 1024) },
          action: { name: 'cta_url', parameters: { display_text: String(displayText).slice(0, 20), url } },
        },
      });
    },

    sendTemplate(to, name, languageCode, components = []) {
      return send({ to, type: 'template', template: { name, language: { code: languageCode }, components } });
    },

    async markRead(messageId) {
      try {
        await send({ status: 'read', message_id: messageId });
      } catch (_) { /* not important */ }
    },

    /** Media id -> { buffer, mimeType } */
    async downloadMedia(mediaId) {
      const { token } = credentials();
      const meta = await graph(mediaId, { token });
      const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`media download failed: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, mimeType: meta.mime_type || res.headers.get('content-type') || 'application/octet-stream' };
    },
  };
}
