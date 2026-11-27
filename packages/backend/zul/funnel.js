/**
 * Daily trial funnel (docs/launch/BILLING.md):
 *  - day 7, the day the trial ends: `fim_teste` (Plus monthly / annual)
 *  - day 8, trial over and still not Plus: `oferta_primeiro_mes` (first month at the win-back price)
 *
 * Each organization gets each message at most once (organizations.trial_ending_sent_at
 * and winback_sent_at, claimed before sending). The message goes to the
 * organization's primary WhatsApp user: someone who has talked to Zul
 * (has a zul_conversations row), preferring the organization admin.
 *
 * Inside the 24 h customer service window (the user wrote to Zul in the
 * last 24 h) the same text goes as a free message with a link button;
 * otherwise as the approved template.
 */
import { getSupabase, phoneVariants } from './db.js';
import { t } from './reply.js';
import {
  digitsOnly, localDate, addDays, timezoneFromPhone, normalizeLanguage, languageFromPhone, currencyFromPhone,
} from './language.js';
import {
  BILLING_TEMPLATES, orgBillingState, paywallEnabled, priceParams, subscribeLink, winbackLink,
} from './billing.js';
import { templateLanguage } from './whatsapp.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Free messages only inside the 24 h window; keep a margin for clock skew and slow runs. */
export const SERVICE_WINDOW_MS = 23 * HOUR;

/** A missed daily run still sends the day-8 offer up to this many days late. */
export const WINBACK_GRACE_DAYS = 2;

export const FUNNEL_COLUMNS = { trial_ending: 'trial_ending_sent_at', winback: 'winback_sent_at' };

/**
 * Which message (if any) this organization gets today, in the user's local calendar.
 * @returns {'trial_ending'|'winback'|null}
 */
export function funnelStep(org, { now = new Date(), timezone = 'UTC', graceDays = WINBACK_GRACE_DAYS } = {}) {
  if (!org?.trial_ends_at) return null;
  const end = new Date(org.trial_ends_at);
  if (Number.isNaN(end.getTime())) return null;
  if (orgBillingState(org, now).isPlus) return null;
  const today = localDate(timezone, now);
  const endDay = localDate(timezone, end);
  if (today === endDay) return org.trial_ending_sent_at ? null : 'trial_ending';
  if (today > endDay && today <= addDays(endDay, 1 + graceDays) && end <= now) {
    return org.winback_sent_at ? null : 'winback';
  }
  return null;
}

/**
 * Primary WhatsApp contact of an organization.
 * contacts: [{ user, conversation }] where conversation is the zul_conversations row.
 */
export function pickPrimary(org, contacts = []) {
  const usable = contacts.filter((c) => c?.conversation?.phone && c.user && c.user.is_active !== false);
  if (!usable.length) return null;
  const rank = (c) => {
    if (org?.admin_id && c.user.id === org.admin_id) return 0;
    if (c.user.role === 'admin') return 1;
    return 2;
  };
  const seen = (c) => Date.parse(c.conversation.last_seen_at || 0) || 0;
  return [...usable].sort((a, b) => rank(a) - rank(b) || seen(b) - seen(a))[0];
}

/** "Felipe" from "Felipe Souza"; null for placeholders like "+5511987654321". */
export function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  if (!first || /\d|@/.test(first)) return null;
  return first.slice(0, 30);
}

export function withinServiceWindow(lastSeenAt, now = new Date(), windowMs = SERVICE_WINDOW_MS) {
  const seen = Date.parse(lastSeenAt || '');
  return Number.isFinite(seen) && now.getTime() - seen >= 0 && now.getTime() - seen < windowMs;
}

/**
 * Text, link and template for one funnel message. The text is exactly the
 * template body of docs/launch/BILLING.md §4 with the variables filled in.
 */
export function buildFunnelMessage({ step, lang, currency, phone = '', name, organizationId }) {
  const language = normalizeLanguage(lang) || 'en';
  const p = priceParams({ currency, lang: language, phone });
  const who = firstName(name) || t(language, 'funnel_name_fallback');
  const winback = step === 'winback';
  const key = winback ? 'funnel_winback' : 'funnel_trial_ending';
  const bodyParams = winback ? [who, p.winback, p.monthly] : [who, p.monthly, p.annual];
  return {
    step,
    language,
    currency: p.currency,
    text: t(language, key, { name: who, monthly: p.monthly, annual: p.annual, winback: p.winback }),
    buttonLabel: t(language, `${key}_button`),
    url: winback ? winbackLink(organizationId) : subscribeLink(organizationId),
    template: {
      name: winback ? BILLING_TEMPLATES.winback : BILLING_TEMPLATES.trialEnding,
      language: templateLanguage(language),
      components: [
        { type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) },
        // URL button with a dynamic suffix: the base URL is fixed in the approved template.
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(organizationId) }] },
      ],
    },
  };
}

/** Free message with a link button inside the window, template otherwise (or if the free message fails). */
export async function deliverFunnelMessage(wa, to, message, { freeForm }) {
  if (freeForm) {
    try {
      if (typeof wa.sendCtaUrl === 'function') {
        return { channel: 'free', id: await wa.sendCtaUrl(to, message.text, message.buttonLabel, message.url) };
      }
      return { channel: 'free', id: await wa.sendText(to, `${message.text}\n\n${message.url}`) };
    } catch (err) {
      console.warn('[funnel] free message failed, using the template:', err.message);
    }
  }
  const { name, language, components } = message.template;
  return { channel: 'template', id: await wa.sendTemplate(to, name, language, components) };
}

/**
 * One run of the funnel.
 * store: { listCandidates(now, { limit }), whatsappContacts(org), claim(orgId, column, at), release(orgId, column) }
 * Returns { sent, planned, failed, skipped, candidates, done }.
 */
export async function runTrialFunnel({
  store, wa, now = new Date(), dryRun = false, limit = 500, deadline = Infinity, log = console,
} = {}) {
  const result = { dryRun, candidates: 0, sent: [], planned: [], failed: [], skipped: [], done: true };
  if (!paywallEnabled()) return { ...result, disabled: 'paywall' };

  const orgs = await store.listCandidates(now, { limit });
  result.candidates = orgs.length;
  for (const org of orgs) {
    if (Date.now() > deadline) {
      result.done = false;
      break;
    }
    try {
      const contact = pickPrimary(org, await store.whatsappContacts(org));
      if (!contact) {
        if (funnelStep(org, { now, timezone: 'UTC' })) {
          result.skipped.push({ organizationId: org.id, reason: 'no_whatsapp_user' });
        }
        continue;
      }
      const { user, conversation } = contact;
      const phone = digitsOnly(conversation.phone);
      const step = funnelStep(org, { now, timezone: timezoneFromPhone(phone) });
      if (!step) continue;

      const message = buildFunnelMessage({
        step,
        lang: normalizeLanguage(conversation.language) || normalizeLanguage(user.language) || languageFromPhone(phone),
        currency: conversation.currency || user.currency || currencyFromPhone(phone),
        phone,
        name: user.name,
        organizationId: org.id,
      });
      const freeForm = withinServiceWindow(conversation.last_seen_at, now);
      const entry = {
        organizationId: org.id, userId: user.id, step, language: message.language, channel: freeForm ? 'free' : 'template',
      };

      if (dryRun) {
        log.info?.(`[funnel] dry run: ${step} to org ${org.id} (${entry.channel}, ${message.language})`);
        result.planned.push({ ...entry, text: message.text, url: message.url, template: message.template.name });
        continue;
      }

      const column = FUNNEL_COLUMNS[step];
      if (!(await store.claim(org.id, column, now.toISOString()))) continue; // another run got it
      try {
        const sent = await deliverFunnelMessage(wa, phone, message, { freeForm });
        result.sent.push({ ...entry, channel: sent.channel });
      } catch (err) {
        await store.release(org.id, column).catch(() => {});
        result.failed.push({ ...entry, error: String(err.message || err).slice(0, 200) });
      }
    } catch (err) {
      result.failed.push({ organizationId: org.id, error: String(err.message || err).slice(0, 200) });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Supabase store
// ---------------------------------------------------------------------------

function isMissingColumn(error) {
  return error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|Could not find the .* column/i.test(error.message || ''));
}

export class BillingMigrationPending extends Error {
  constructor() {
    super('organizations billing columns are missing: run docs/migrations/2026-11-26-billing-01.sql');
    this.code = 'billing_migration_pending';
  }
}

export function createFunnelStore(supabase = getSupabase()) {
  return {
    /** Trials that ended in a window wide enough for every timezone and the grace days. */
    async listCandidates(now, { limit = 500 } = {}) {
      const from = new Date(now.getTime() - (WINBACK_GRACE_DAYS + 3) * DAY).toISOString();
      const to = new Date(now.getTime() + 2 * DAY).toISOString();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, admin_id, trial_ends_at, plus_until, trial_ending_sent_at, winback_sent_at')
        .gte('trial_ends_at', from)
        .lte('trial_ends_at', to)
        .or('trial_ending_sent_at.is.null,winback_sent_at.is.null')
        .order('trial_ends_at', { ascending: true })
        .limit(limit);
      if (error) {
        if (isMissingColumn(error)) throw new BillingMigrationPending();
        throw error;
      }
      return data || [];
    },

    async whatsappContacts(org) {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, phone, role, language, currency, is_active')
        .eq('organization_id', org.id)
        .eq('is_active', true);
      if (error) throw error;
      const withPhone = (users || []).filter((u) => digitsOnly(u.phone).length >= 8);
      if (!withPhone.length) return [];
      const byPhone = new Map();
      for (const u of withPhone) for (const v of phoneVariants(u.phone)) byPhone.set(v, u);
      const { data: conversations, error: convError } = await supabase
        .from('zul_conversations')
        .select('phone, user_id, language, currency, last_seen_at')
        .in('phone', [...byPhone.keys()]);
      if (convError) throw convError;
      return (conversations || [])
        .map((conversation) => ({
          conversation,
          user: withPhone.find((u) => u.id === conversation.user_id) || byPhone.get(conversation.phone),
        }))
        .filter((c) => c.user);
    },

    /** Marks the step as sent only if nobody did yet; true when this run owns it. */
    async claim(orgId, column, at) {
      const { data, error } = await supabase
        .from('organizations')
        .update({ [column]: at })
        .eq('id', orgId)
        .is(column, null)
        .select('id');
      if (error) throw error;
      return (data || []).length === 1;
    },

    async release(orgId, column) {
      const { error } = await supabase.from('organizations').update({ [column]: null }).eq('id', orgId);
      if (error) throw error;
    },
  };
}
