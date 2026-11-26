/**
 * Decides what a message means. Local rules first (no model call for the
 * obvious cases), then Chat Completions with tool calling.
 *
 * route() returns an intent: { type, ...args }. Types:
 *  expense, installments, income, bill, budget, query, summary, correction,
 *  closing_day, closing_day_invalid, name, language, currency, join,
 *  help, dashboard, plan, cancel, fewer, more, invite, greeting, thanks,
 *  off_topic, not_understood
 */
import { languageSwitch } from './language.js';
import { parseLocal, parseCorrection, parseCommand, looksLikeName, findAmounts } from './parse.js';
import { EXPENSE_KEYS } from './categories.js';
import { recentConfirmation } from './state.js';

/**
 * @param {object} input  { text, buttonId }
 * @param {object} ctx    { state, user, lang, currency, today, replyTarget }
 * @param {object} deps   { ai }
 */
export async function route(input, ctx, deps) {
  const text = String(input.text || '').trim();
  const { state } = ctx;

  // 1. Reply buttons (category choice on a low-confidence confirmation).
  if (input.buttonId) {
    const [kind, value] = String(input.buttonId).split(':');
    if (kind === 'cat' && EXPENSE_KEYS.includes(value)) {
      return { type: 'correction', correction: { categoryKey: value }, target: ctx.replyTarget || recentConfirmation(state) };
    }
  }
  if (!text) return { type: 'not_understood' };

  // 2. Language switch: "English", "Español", "Português".
  const lang = languageSwitch(text);
  if (lang) return { type: 'language', language: lang };

  // 3. Open question.
  const pending = state.pending;
  if (pending?.type === 'closing_day') {
    const m = text.match(/^\D{0,12}(\d{1,2})\D{0,12}$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31 && findAmounts(text).length <= 1) return { type: 'closing_day', day: Number(m[1]) };
    if (/^\s*\d+\s*$/.test(text)) return { type: 'closing_day_invalid' };
    state.pending = null; // they moved on
  }
  if (pending?.type === 'ask_name') {
    const name = !parseLocal(text) ? looksLikeName(text) : null;
    state.pending = null; // ask once
    if (name) return { type: 'name', name };
  }

  // 4. Corrections: replying to a confirmation, or right after one.
  const target = ctx.replyTarget || recentConfirmation(state);
  if (target) {
    const correction = parseCorrection(text);
    if (correction && (ctx.replyTarget || !parseCommand(text))) return { type: 'correction', correction, target };
  } else if (parseCorrection(text)?.delete) {
    return { type: 'correction', correction: { delete: true }, target: null };
  }

  // 5. Local rules.
  const local = parseLocal(text);
  const aiAvailable = deps.ai?.available?.() ?? false;
  if (local && (local.type !== 'expense' || local.allHighConfidence || !aiAvailable)) return local;

  // 6. Model.
  if (aiAvailable) {
    let intent = null;
    try {
      intent = await deps.ai.interpret(text, { ...ctx, replyingToConfirmation: !!ctx.replyTarget });
    } catch (err) {
      console.error('[zul] model error:', err.message);
    }
    if (intent) {
      if (intent.type === 'correction') return { ...intent, target: target || null };
      return intent;
    }
  }
  if (local) return local;
  // A reply to a confirmation we couldn't parse: say how to fix.
  if (ctx.replyTarget) return { type: 'correction', correction: {}, target: ctx.replyTarget };
  return { type: 'not_understood' };
}

/** Intents that write something (and therefore create the account on first use). */
export const RECORDING_INTENTS = new Set(['expense', 'installments', 'income', 'bill', 'budget', 'closing_day']);
