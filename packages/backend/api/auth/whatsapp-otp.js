/**
 * Supabase Auth "Send SMS Hook" (HTTP). Supabase calls this instead of an SMS
 * provider when someone runs signInWithOtp({ phone }); we deliver the code on
 * WhatsApp with the authentication template `codigo_login` in the user's
 * language.
 *
 * Security: Standard Webhooks signature with SEND_SMS_HOOK_SECRET
 * ("v1,whsec_..." exactly as Supabase shows it).
 */
import { verifyStandardWebhook, readBody, send } from '../../zul/security.js';
import { createWhatsApp } from '../../zul/whatsapp.js';
import { createDb } from '../../zul/db.js';
import { digitsOnly, languageFromPhone, normalizeLanguage } from '../../zul/language.js';

export const config = { api: { bodyParser: false } };

const DEFAULT_TEMPLATE_LANGS = { pt: 'pt_BR', es: 'es', en: 'en' };

export function templateLanguage(lang) {
  const map = { ...DEFAULT_TEMPLATE_LANGS };
  for (const pair of String(process.env.WHATSAPP_TEMPLATE_LANGS || '').split(',')) {
    const [k, v] = pair.split(':').map((s) => s && s.trim());
    if (k && v) map[k] = v;
  }
  return map[lang] || map.en;
}

/** Authentication template: code in the body and in the copy-code button. */
export function otpTemplateComponents(otp) {
  return [
    { type: 'body', parameters: [{ type: 'text', text: String(otp) }] },
    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(otp) }] },
  ];
}

async function userLanguage(db, phone) {
  try {
    const conv = await db.getConversation(phone);
    if (normalizeLanguage(conv?.language)) return normalizeLanguage(conv.language);
    const user = await db.findUserByPhone(phone);
    if (normalizeLanguage(user?.language)) return normalizeLanguage(user.language);
  } catch (_) { /* fall back to the phone's country */ }
  return languageFromPhone(phone);
}

function hookError(res, status, message) {
  return send(res, status, { error: { http_code: status, message } }, 'application/json');
}

export function createHandler(deps = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return hookError(res, 405, 'Method not allowed');
    const { raw } = await readBody(req);
    if (!raw) return hookError(res, 400, 'Missing body');

    const check = verifyStandardWebhook(raw, req.headers || {}, process.env.SEND_SMS_HOOK_SECRET);
    if (!check.ok) {
      console.warn('[otp-hook] rejected:', check.reason);
      return hookError(res, 401, 'Invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      return hookError(res, 400, 'Invalid JSON');
    }
    const phone = digitsOnly(payload?.user?.phone);
    const otp = payload?.sms?.otp;
    if (!phone || !otp) return hookError(res, 400, 'Missing phone or otp');

    try {
      const db = deps.db || createDb();
      const wa = deps.wa || createWhatsApp();
      const lang = await userLanguage(db, phone);
      const name = process.env.WHATSAPP_OTP_TEMPLATE || 'codigo_login';
      await wa.sendTemplate(phone, name, templateLanguage(lang), otpTemplateComponents(otp));
      return send(res, 200, {}, 'application/json');
    } catch (err) {
      console.error('[otp-hook] could not send code:', err.message);
      return hookError(res, 500, 'Could not deliver the code on WhatsApp');
    }
  };
}

export default createHandler();
