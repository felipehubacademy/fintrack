/**
 * Conversation state lives in Supabase (table zul_conversations), never in
 * memory, so any serverless instance can answer any message.
 *
 * Fields:
 *  - language / currency: user's choice (defaults come from the phone number)
 *  - pending: an open question { type: 'ask_name' | 'closing_day', ... , at }
 *  - last_confirmation: { waMessageId, kind, ids, at } for "foi 78" without a reply
 *  - records_count: how many messages produced a record (onboarding milestones)
 *  - quiet: "fewer messages" mode
 *  - trial_notice_sent_at: when the "trial ends in N days" line was added (once)
 */
import { digitsOnly, languageFromPhone, currencyFromPhone, timezoneFromPhone, normalizeLanguage } from './language.js';

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
export const LAST_CONFIRMATION_TTL_MS = 30 * 60 * 1000;

export function defaultState(phone) {
  return {
    phone: digitsOnly(phone),
    user_id: null,
    language: languageFromPhone(phone),
    currency: currencyFromPhone(phone),
    pending: null,
    last_confirmation: null,
    records_count: 0,
    quiet: false,
    intro_sent_at: null,
    trial_notice_sent_at: null,
    last_seen_at: null,
    isNew: true,
  };
}

export async function loadState(db, phone, user = null) {
  const base = defaultState(phone);
  const row = await db.getConversation(phone);
  const state = row ? { ...base, ...row, isNew: false } : base;
  // The users row wins when the conversation has no explicit choice yet.
  if (!row?.language && normalizeLanguage(user?.language)) state.language = normalizeLanguage(user.language);
  if (!row?.currency && user?.currency) state.currency = user.currency;
  if (state.pending?.at && Date.now() - new Date(state.pending.at).getTime() > PENDING_TTL_MS) state.pending = null;
  state.timezone = timezoneFromPhone(phone);
  return state;
}

export async function saveState(db, state) {
  await db.saveConversation(state.phone, {
    user_id: state.user_id || null,
    language: state.language,
    currency: state.currency,
    pending: state.pending || null,
    last_confirmation: state.last_confirmation || null,
    records_count: state.records_count || 0,
    quiet: !!state.quiet,
    intro_sent_at: state.intro_sent_at || null,
    trial_notice_sent_at: state.trial_notice_sent_at || null,
    last_seen_at: new Date().toISOString(),
  });
}

export function recentConfirmation(state) {
  const c = state.last_confirmation;
  if (!c?.at) return null;
  return Date.now() - new Date(c.at).getTime() <= LAST_CONFIRMATION_TTL_MS ? c : null;
}
