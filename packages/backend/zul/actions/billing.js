/**
 * Plus subscription on WhatsApp: the paywall reply when the trial is over,
 * "assinar" / "suscribirme" / "subscribe" status, cancel help and the
 * one-time "your trial ends in N days" line.
 *
 * Replies built here carry `billing: true` so the trial line is not added to them.
 */
import { makeFormatter } from '../reply.js';
import {
  orgBillingState, paywallEnabled, priceParams, subscribeLink, TRIAL_NOTICE_DAYS,
} from '../billing.js';
import { deleteAccountLink } from './account.js';

const nowOf = (ctx) => ctx.now || new Date();

export function billingState(ctx) {
  return orgBillingState(ctx.user?.organization, nowOf(ctx));
}

function prices(ctx) {
  return priceParams({ currency: ctx.currency, lang: ctx.lang, phone: ctx.phone });
}

function orgId(ctx) {
  return ctx.user?.organization_id || ctx.user?.organization?.id;
}

function reply(text) {
  return [{ text, billing: true }];
}

/** Sent instead of saving anything once the trial is over without Plus. */
export function paywallReply(ctx) {
  const f = makeFormatter(ctx);
  return reply(f.t('paywall', { ...prices(ctx), link: subscribeLink(orgId(ctx)) }));
}

/** "assinar", "plano", "subscribe": where the account stands and the link. */
export function planReply(ctx) {
  const f = makeFormatter(ctx);
  const p = prices(ctx);
  if (!paywallEnabled()) return reply(f.t('plan_free'));
  if (!ctx.user) return reply(f.t('plan_new', p));
  const state = billingState(ctx);
  const link = subscribeLink(orgId(ctx));
  if (state.status === 'active') {
    const until = String(ctx.user.organization?.plus_until || '').slice(0, 10);
    return reply(f.t('plan_active', { date: until ? f.date(until) : '' }));
  }
  if (state.status === 'expired') return reply(f.t('plan_expired', { ...p, link }));
  return reply(f.t('plan_trial', { ...p, count: state.daysLeft, link }));
}

export function cancelReply(ctx) {
  const f = makeFormatter(ctx);
  if (ctx.user && billingState(ctx).isPlus) return reply(f.t('cancel_plus'));
  return reply(f.t('cancel', { link: deleteAccountLink() }));
}

/**
 * Appends "⏳ your free trial ends in N days" once per conversation when the
 * trial is about to end. Only for real trial dates (not legacy rows).
 */
export function addTrialNotice(ctx, replies) {
  if (!ctx.user || !replies.length || ctx.state.trial_notice_sent_at) return replies;
  if (replies.some((r) => r.billing) || !paywallEnabled()) return replies;
  if (!ctx.user.organization?.trial_ends_at) return replies;
  const state = billingState(ctx);
  if (state.status !== 'trial' || state.daysLeft > TRIAL_NOTICE_DAYS) return replies;
  const lastIndex = replies.map((r) => Boolean(r.text)).lastIndexOf(true);
  if (lastIndex < 0) return replies;
  const line = makeFormatter(ctx).t('trial_notice', { count: state.daysLeft });
  const out = [...replies];
  out[lastIndex] = { ...out[lastIndex], text: `${out[lastIndex].text}\n\n${line}` };
  ctx.state.trial_notice_sent_at = nowOf(ctx).toISOString();
  return out;
}
