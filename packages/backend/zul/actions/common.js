/**
 * Helpers shared by actions: account bootstrap, category and card resolution,
 * budget status.
 */
import { normalizeText, monthStart, addMonths, addDays } from '../language.js';
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryByKey, findCategoryKeyByName, guessCategory,
} from '../categories.js';
import { budgetLine } from '../reply.js';

/** Make sure the sender has an account; creates one on first record. */
export async function ensureAccount(ctx) {
  if (ctx.user) return ctx.user;
  const user = await ctx.db.createAccount({
    phone: ctx.phone,
    name: ctx.contactName || null,
    language: ctx.lang,
    currency: ctx.currency,
  });
  ctx.user = user;
  ctx.accountCreated = true;
  ctx.state.user_id = user.id;
  await ensureDefaultCategories(ctx).catch((err) => console.warn('[zul] default categories:', err.message));
  return user;
}

/** Default expense categories in the user's language (org-level when the globals don't cover them). */
export async function ensureDefaultCategories(ctx) {
  const orgId = ctx.user.organization_id;
  const rows = await ctx.db.loadCategories(orgId, 'expense');
  const existing = new Set(rows.map((r) => normalizeText(r.name)));
  for (const cat of EXPENSE_CATEGORIES) {
    const name = (cat.names[ctx.lang] || cat.names.en)[0];
    if (existing.has(normalizeText(name))) continue;
    await ctx.db.createCategory(orgId, { name, kind: 'expense', macro: cat.macro });
  }
  ctx.categoryCache = null;
}

async function categoryRows(ctx, kind) {
  ctx.categoryCache = ctx.categoryCache || {};
  if (!ctx.categoryCache[kind]) ctx.categoryCache[kind] = await ctx.db.loadCategories(ctx.user.organization_id, kind);
  return ctx.categoryCache[kind];
}

/** Every budget_categories row that stands for a canonical key (any language). */
export async function rowsForKey(ctx, key, kind = 'expense') {
  const def = categoryByKey(key);
  if (!def) return [];
  const all = Object.values(def.names).flat().map(normalizeText);
  return (await categoryRows(ctx, kind)).filter((r) => all.includes(normalizeText(r.name)));
}

/** Canonical key -> { id, name } row, creating an org category if needed. */
export async function resolveCategory(ctx, key, kind = 'expense') {
  const def = categoryByKey(key) || categoryByKey(kind === 'income' ? 'other_income' : 'other');
  const rows = await categoryRows(ctx, kind);
  const preferred = (def.names[ctx.lang] || def.names.en).map(normalizeText);
  const anyLang = Object.values(def.names).flat().map(normalizeText);
  const orgId = ctx.user.organization_id;
  const pick = (names, own) => {
    for (const name of names) {
      const row = rows.find((r) => normalizeText(r.name) === name && (own ? r.organization_id === orgId : true));
      if (row) return row;
    }
    return null;
  };
  const found = pick(preferred, true) || pick(preferred, false) || pick(anyLang, true) || pick(anyLang, false);
  if (found) return { id: found.id, name: found.name, key: def.key };
  const created = await ctx.db.createCategory(orgId, { name: def.names[ctx.lang]?.[0] || def.names.en[0], kind, macro: def.macro });
  if (created) rows.push(created);
  return { id: created?.id || null, name: created?.name || def.names[ctx.lang]?.[0], key: def.key };
}

/** Free text ("lazer", "Academia") -> category row, or null. */
export async function resolveCategoryText(ctx, text, kind = 'expense') {
  const n = normalizeText(text);
  if (!n) return null;
  const rows = await categoryRows(ctx, kind);
  const exact = rows.find((r) => normalizeText(r.name) === n);
  if (exact) return { id: exact.id, name: exact.name, key: findCategoryKeyByName(exact.name, { income: kind === 'income' }) };
  const key = findCategoryKeyByName(n, { income: kind === 'income' });
  if (key) return resolveCategory(ctx, key, kind);
  const partial = rows.find((r) => normalizeText(r.name).includes(n) || (n.length >= 4 && n.includes(normalizeText(r.name))));
  if (partial) return { id: partial.id, name: partial.name, key: null };
  const guess = guessCategory(n, { income: kind === 'income' });
  if (guess.confidence === 'high') return resolveCategory(ctx, guess.key, kind);
  return null;
}

export function categoryChoices(ctx, kind = 'expense') {
  const list = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.slice(0, 8).map((c) => c.names[ctx.lang]?.[0] || c.names.en[0]).join(', ');
}

/** Find an existing card by (partial) name. */
export function matchCard(cards, name) {
  if (!name) return null;
  const n = normalizeText(name);
  return cards.find((c) => normalizeText(c.name) === n)
    || cards.find((c) => normalizeText(c.name).includes(n) || n.includes(normalizeText(c.name)))
    || cards.find((c) => c.bank && normalizeText(c.bank).includes(n))
    || null;
}

export function ownerFields(ctx) {
  const user = ctx.user;
  return {
    owner: user.costCenter?.name || user.name,
    cost_center_id: user.costCenter?.id || null,
    organization_id: user.organization_id,
    user_id: user.id,
  };
}

export function periodRange(period, today) {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case 'this_week': {
      const d = new Date(`${today}T12:00:00Z`);
      const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
      return { from: addDays(today, -dow), to: today };
    }
    case 'last_month': {
      const start = addMonths(monthStart(today), -1, 1);
      return { from: start, to: addDays(monthStart(today), -1) };
    }
    case 'this_year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default:
      return { from: monthStart(today), to: today };
  }
}

/** Budget lines for the categories just used (only when a limit exists this month). */
export async function budgetLines(ctx, categoryIds) {
  const ids = [...new Set(categoryIds.filter(Boolean))];
  if (!ids.length || ctx.state.quiet) return [];
  const month = monthStart(ctx.today);
  const budgets = (await ctx.db.listBudgets(ctx.user.organization_id, month)).filter((b) => ids.includes(b.category_id));
  if (!budgets.length) return [];
  const rows = await categoryRows(ctx, 'expense');
  const lines = [];
  for (const b of budgets) {
    const spentRows = await ctx.db.listExpenses(ctx.user.organization_id, { from: month, to: addDays(addMonths(month, 1, 1), -1), categoryIds: [b.category_id] });
    const spent = spentRows.reduce((s, e) => s + Number(e.amount || 0), 0);
    const name = rows.find((r) => r.id === b.category_id)?.name || '';
    lines.push(budgetLine(ctx, { categoryName: name, limit: b.limit_amount, spent }));
  }
  return lines;
}
