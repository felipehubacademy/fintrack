/**
 * Zul core entry point: one WhatsApp webhook payload in, replies out.
 * Stateless: everything that must survive between messages is in Supabase.
 */
import { createDb } from './db.js';
import { createAi } from './ai.js';
import { createWhatsApp } from './whatsapp.js';
import { localDate, canonicalPhone } from './language.js';
import { loadState, saveState } from './state.js';
import { route, RECORDING_INTENTS } from './intents.js';
import { parseLocal } from './parse.js';
import { t, makeFormatter } from './reply.js';
import { logExpenses, logInstallments, answerClosingDay } from './actions/expense.js';
import { logIncome, logBill, setBudget } from './actions/money.js';
import { spendingQuery, monthlySummary } from './actions/query.js';
import { applyCorrection } from './actions/correction.js';
import {
  dashboardLink, deleteAccountLink, simpleReply, setName, setLanguage, setCurrency, invite, joinOrganization, greeting,
} from './actions/account.js';
import { paywallReply, planReply, cancelReply, addTrialNotice } from './actions/billing.js';
import { isBlocked } from './billing.js';

const IGNORED_TYPES = new Set(['reaction', 'system', 'unsupported', 'ephemeral', 'request_welcome']);
const OPEN_TO_STRANGERS = new Set(['language', 'currency', 'join', 'plan', 'cancel', 'delete_account', 'help', 'off_topic']);

export function createZul(deps = {}) {
  let db = deps.db || null;
  let ai = deps.ai || null;
  let wa = deps.wa || null;
  const getDb = () => (db = db || createDb());
  const getAi = () => (ai = ai || createAi());
  const getWa = () => (wa = wa || createWhatsApp());
  const now = deps.now || (() => new Date());

  async function extractInput(message, ctx) {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body || '' };
      case 'interactive': {
        const reply = message.interactive?.button_reply || message.interactive?.list_reply;
        return { buttonId: reply?.id || null, text: reply?.title || '' };
      }
      case 'button':
        return { text: message.button?.text || message.button?.payload || '' };
      case 'audio':
      case 'voice': {
        try {
          const media = await getWa().downloadMedia(message.audio?.id || message.voice?.id);
          const text = await getAi().transcribe(media.buffer, media.mimeType, ctx.lang);
          return text ? { text, fromAudio: true } : { error: 'audio_failed' };
        } catch (err) {
          console.error('[zul] audio failed:', err.message);
          return { error: 'audio_failed' };
        }
      }
      case 'image':
      case 'document': {
        const media = message.image || message.document;
        if (message.type === 'document' && !/^image\//.test(media?.mime_type || '')) return { error: 'unsupported_media' };
        const caption = media?.caption || '';
        const local = caption ? parseLocal(caption) : null;
        if (local && ['expense', 'installments', 'income'].includes(local.type)) return { intent: local };
        try {
          const file = await getWa().downloadMedia(media.id);
          const intent = await getAi().interpretImage(file.buffer, file.mimeType, caption, ctx);
          return intent && intent.type !== 'off_topic' ? { intent } : { error: 'receipt_failed' };
        } catch (err) {
          console.error('[zul] receipt failed:', err.message);
          return { error: 'receipt_failed' };
        }
      }
      default:
        return IGNORED_TYPES.has(message.type) ? { ignore: true } : { error: 'unsupported_media' };
    }
  }

  async function execute(intent, ctx) {
    const type = intent.type;
    if (!ctx.user && !RECORDING_INTENTS.has(type) && !OPEN_TO_STRANGERS.has(type)) {
      ctx.state.intro_sent_at = now().toISOString();
      return simpleReply(ctx, 'intro');
    }
    // Trial over without Plus: keep reading, stop writing (data is never deleted).
    if (ctx.user && RECORDING_INTENTS.has(type) && isBlocked(ctx.user.organization, ctx.now || now())) return paywallReply(ctx);
    switch (type) {
      case 'expense': return logExpenses(ctx, intent);
      case 'installments': return logInstallments(ctx, intent);
      case 'closing_day': return answerClosingDay(ctx, intent.day);
      case 'closing_day_invalid': return simpleReply(ctx, 'closing_day_invalid');
      case 'income': return logIncome(ctx, intent);
      case 'bill': return logBill(ctx, intent);
      case 'budget': return setBudget(ctx, intent);
      case 'query': return spendingQuery(ctx, intent);
      case 'summary': return monthlySummary(ctx);
      case 'correction': return applyCorrection(ctx, intent.target, intent.correction || {});
      case 'name': return setName(ctx, intent.name);
      case 'language': return setLanguage(ctx, intent.language);
      case 'currency': return setCurrency(ctx, intent.currency);
      case 'join': return joinOrganization(ctx, intent.code);
      case 'invite': return invite(ctx);
      case 'dashboard': return simpleReply(ctx, 'dashboard', { link: dashboardLink(ctx) });
      case 'plan': return planReply(ctx);
      case 'cancel': return cancelReply(ctx);
      case 'delete_account': return simpleReply(ctx, 'delete_account', { link: deleteAccountLink() });
      case 'help': return simpleReply(ctx, 'help');
      case 'fewer': ctx.state.quiet = true; return simpleReply(ctx, 'fewer_on');
      case 'more': ctx.state.quiet = false; return simpleReply(ctx, 'fewer_off');
      case 'greeting': return greeting(ctx);
      case 'thanks': return simpleReply(ctx, 'thanks');
      case 'off_topic': return simpleReply(ctx, 'off_topic');
      default: return simpleReply(ctx, 'not_understood');
    }
  }

  /** Onboarding milestones: welcome on the first record, name after it, dashboard on the 3rd. */
  function addOnboarding(ctx, replies) {
    if (!replies.some((r) => r.record)) return replies;
    const f = makeFormatter(ctx);
    const state = ctx.state;
    state.records_count = (state.records_count || 0) + 1;
    const out = [...replies];
    if (ctx.accountCreated && !state.intro_sent_at && out[0]?.text) {
      out[0] = { ...out[0], text: `${f.t('welcome_first')}\n\n${out[0].text}` };
      state.intro_sent_at = now().toISOString();
    }
    if (state.records_count === 1 && !state.pending) {
      out.push({ text: f.t('ask_name', { currency: ctx.currency }) });
      state.pending = { type: 'ask_name', at: now().toISOString() };
    }
    if (state.records_count === 3 && !state.quiet) {
      out.push({ text: f.t('third_record', { count: 3, link: dashboardLink(ctx) }) });
    }
    return out;
  }

  async function sendReplies(ctx, to, replies) {
    for (const reply of replies) {
      let waId = null;
      try {
        waId = reply.buttons?.length
          ? await getWa().sendButtons(to, reply.text, reply.buttons)
          : await getWa().sendText(to, reply.text);
      } catch (err) {
        console.error('[zul] send failed:', err.message);
        if (reply.buttons?.length) {
          waId = await getWa().sendText(to, reply.text).catch(() => null);
        }
      }
      if (reply.track) {
        ctx.state.last_confirmation = { waMessageId: waId, kind: reply.track.kind, ids: reply.track.ids, data: reply.track.data || {}, at: now().toISOString() };
        if (waId) await getDb().saveConfirmation(waId, ctx.phone, reply.track);
      }
    }
  }

  async function handleMessage(message, contact = null) {
    // Reply to the wa_id Meta gave us; store and look up by the canonical
    // E.164 form the app's phone login uses.
    const waId = message.from;
    const phone = canonicalPhone(waId);
    const db = getDb();
    if (!phone || !message.id) return 'invalid';
    if (!(await db.claimMessage(message.id, phone))) return 'duplicate';
    if (IGNORED_TYPES.has(message.type)) {
      await db.finishMessage(message.id, 'ignored');
      return 'ignored';
    }

    let ctx = null;
    try {
      const user = await db.findUserByPhone(phone);
      const state = await loadState(db, phone, user);
      if (user) state.user_id = user.id;
      ctx = {
        db, ai: getAi(), wa: getWa(), phone, state, user,
        lang: state.language, currency: state.currency, today: localDate(state.timezone, now()), now: now(),
        contactName: contact?.profile?.name || null, messageId: message.id, replyTarget: null,
      };
      const read = getWa().markRead(message.id);

      if (message.context?.id) ctx.replyTarget = await db.getConfirmation(message.context.id, phone);

      // Receipt photos only ever record something: skip the model call when the trial is over.
      const blockedMedia = (message.type === 'image' || message.type === 'document') && user && isBlocked(user.organization, ctx.now);
      const input = blockedMedia ? { blocked: true } : await extractInput(message, ctx);
      let replies;
      if (input.blocked) replies = paywallReply(ctx);
      else if (input.ignore) replies = [];
      else if (input.error) replies = simpleReply(ctx, input.error);
      else {
        const intent = input.intent || await route(input, ctx, { ai: ctx.ai });
        replies = await execute(intent, ctx);
      }
      replies = addOnboarding(ctx, replies);
      replies = addTrialNotice(ctx, replies);
      await sendReplies(ctx, waId, replies);
      await saveState(db, ctx.state);
      await read;
      await db.finishMessage(message.id, 'done');
      return 'done';
    } catch (err) {
      console.error('[zul] message failed:', err);
      const lang = ctx?.lang || 'en';
      await getWa().sendText(waId, t(lang, 'error')).catch(() => {});
      if (ctx) await saveState(db, ctx.state).catch(() => {});
      await db.finishMessage(message.id, 'error', String(err.message || err).slice(0, 500));
      return 'error';
    }
  }

  /** Whole webhook body. Status callbacks are ignored. */
  async function handlePayload(payload) {
    const results = [];
    for (const entry of payload?.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field && change.field !== 'messages') continue;
        const value = change.value || {};
        const contacts = value.contacts || [];
        for (const message of value.messages || []) {
          const contact = contacts.find((c) => c.wa_id === message.from) || contacts[0] || null;
          results.push(await handleMessage(message, contact));
        }
      }
    }
    return results;
  }

  return { handlePayload, handleMessage, execute };
}

/** True when the payload carries at least one user message (not just status callbacks). */
export function hasMessages(payload) {
  return (payload?.entry || []).some((e) => (e.changes || []).some((c) => (c.value?.messages || []).length > 0));
}
