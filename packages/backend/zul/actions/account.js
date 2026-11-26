/**
 * Profile and app commands: name, language, currency, dashboard link,
 * partner invite/join, plan, help, fewer messages, off-topic.
 */
import { toE164, digitsOnly } from '../language.js';
import { makeFormatter } from '../reply.js';
import { ensureDefaultCategories } from './common.js';

export function dashboardLink(ctx) {
  const base = (process.env.ZUL_DASHBOARD_URL || 'https://meuazulao.com.br').replace(/\/$/, '');
  return `${base}/login?phone=${encodeURIComponent(toE164(ctx.phone))}`;
}

export function simpleReply(ctx, key, params = {}) {
  return [{ text: makeFormatter(ctx).t(key, params) }];
}

export async function setName(ctx, name) {
  ctx.state.pending = null;
  if (!ctx.user) return simpleReply(ctx, 'intro');
  const clean = String(name).trim().slice(0, 60);
  await ctx.db.updateUser(ctx.user.id, { name: clean });
  ctx.user.name = clean;
  if (ctx.user.organization?.type === 'solo' && ctx.user.role === 'admin') {
    await ctx.db.setOrganizationName?.(ctx.user.organization_id, clean);
  }
  return simpleReply(ctx, 'name_saved', { name: clean.split(' ')[0] });
}

export async function setLanguage(ctx, language) {
  ctx.state.language = language;
  ctx.lang = language;
  if (ctx.user) await ctx.db.updateUser(ctx.user.id, { language }).catch(() => {});
  const f = makeFormatter(ctx);
  if (!ctx.user) {
    ctx.state.intro_sent_at = new Date().toISOString();
    return [{ text: `${f.t('lang_switched')}\n\n${f.t('intro')}` }];
  }
  return [{ text: f.t('lang_switched') }];
}

export async function setCurrency(ctx, currency) {
  if (!currency) return simpleReply(ctx, 'currency_invalid');
  ctx.state.currency = currency;
  ctx.currency = currency;
  if (ctx.user) await ctx.db.updateUser(ctx.user.id, { currency }).catch(() => {});
  return simpleReply(ctx, 'currency_set', { currency });
}

export function invite(ctx) {
  const f = makeFormatter(ctx);
  const code = ctx.user?.organization?.invite_code;
  if (!code) return simpleReply(ctx, 'dashboard', { link: dashboardLink(ctx) });
  const number = digitsOnly(process.env.ZUL_WHATSAPP_NUMBER || '');
  if (!number) return [{ text: f.t('invite_code', { code }) }];
  const link = `https://wa.me/${number}?text=${encodeURIComponent(f.t('invite_text', { code }))}`;
  return [{ text: f.t('invite_link', { link }) }];
}

/** "entrar ABC123" from someone without an account: join the inviter's organization. */
export async function joinOrganization(ctx, code) {
  if (ctx.user) return simpleReply(ctx, 'join_already');
  const org = await ctx.db.findOrganizationByInviteCode(code);
  if (!org) return simpleReply(ctx, 'join_invalid');
  const user = await ctx.db.createAccount({
    phone: ctx.phone, name: ctx.contactName || null, language: ctx.lang, currency: ctx.currency,
    organizationId: org.id, role: 'member',
  });
  ctx.user = user;
  ctx.state.user_id = user.id;
  ctx.state.records_count = 0;
  if (org.type === 'solo') await ctx.db.setOrganizationType(org.id, 'family');
  await ensureDefaultCategories(ctx).catch(() => {});
  return simpleReply(ctx, 'joined', { name: org.name });
}

export function greeting(ctx) {
  if (!ctx.user) {
    ctx.state.intro_sent_at = new Date().toISOString();
    return simpleReply(ctx, 'intro');
  }
  const first = String(ctx.user.name || '').split(' ')[0];
  const name = first && !/^\+?\d+$/.test(first) ? `, ${first}` : '';
  return simpleReply(ctx, 'greeting_known', { name });
}
