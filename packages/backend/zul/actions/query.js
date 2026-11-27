/**
 * "quanto gastei com uber esse mês?" and the monthly summary.
 */
import { findCategoryKeyByName, categoryLabel } from '../categories.js';
import { makeFormatter } from '../reply.js';
import { periodRange, rowsForKey } from './common.js';

export async function spendingQuery(ctx, intent) {
  const f = makeFormatter(ctx);
  const period = intent.period || 'this_month';
  const periodText = f.t(`period_${period}`);
  if (!ctx.user) return [{ text: f.t('query_none_total', { period: periodText }) }];
  const { from, to } = periodRange(period, ctx.today);
  const term = intent.term ? String(intent.term).trim() : null;

  // "lazer" / "restaurants" -> whole category; "uber" -> matching descriptions only.
  const nameKey = term ? findCategoryKeyByName(term) : null;
  const key = nameKey || (!term ? intent.category || null : null);
  let categoryIds = null;
  if (key) {
    const catRows = await rowsForKey(ctx, key);
    categoryIds = catRows.length ? catRows.map((r) => r.id) : null;
  }
  const termFilter = term && (!nameKey || !categoryIds) ? term : null;
  const rows = (categoryIds || termFilter)
    ? await ctx.db.listExpenses(ctx.user.organization_id, { from, to, categoryIds, term: termFilter })
    : await ctx.db.listExpenses(ctx.user.organization_id, { from, to });
  const total = rows.reduce((s, e) => s + Number(e.amount || 0), 0);
  if (!term && !key) {
    return [{ text: rows.length ? f.t('query_total', { amount: f.money(total), period: periodText }) : f.t('query_none_total', { period: periodText }) }];
  }
  const label = term || categoryLabel(key, ctx.lang);
  if (!rows.length) return [{ text: f.t('query_none', { term: label, period: periodText }) }];
  return [{ text: f.t('query_result', { amount: f.money(total), term: label, period: periodText, count: rows.length }) }];
}

export async function monthlySummary(ctx) {
  const f = makeFormatter(ctx);
  const monthLabel = f.monthName(ctx.today);
  if (!ctx.user) return [{ text: f.t('summary_empty', { month: monthLabel }) }];
  const { from, to } = periodRange('this_month', ctx.today);
  const orgId = ctx.user.organization_id;
  const [expenses, incomes, budgets] = await Promise.all([
    ctx.db.listExpenses(orgId, { from, to }),
    ctx.db.listIncomes(orgId, { from, to }).catch(() => []),
    ctx.db.listBudgets(orgId, from).catch(() => []),
  ]);
  if (!expenses.length && !incomes.length) return [{ text: f.t('summary_empty', { month: monthLabel }) }];

  const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const income = incomes.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCat = new Map();
  for (const e of expenses) {
    const k = e.category_id || e.category || '?';
    const cur = byCat.get(k) || { name: e.category || f.t('other_category'), total: 0 };
    cur.total += Number(e.amount || 0);
    byCat.set(k, cur);
  }
  const top = [...byCat.values()].sort((a, b) => b.total - a.total).slice(0, 3);
  const lines = [f.t('summary_title', { month: monthLabel }), f.t('summary_spent', { amount: f.money(spent) })];
  if (income > 0) {
    lines.push(f.t('summary_income', { amount: f.money(income) }));
    lines.push(f.t('summary_balance', { amount: f.money(income - spent) }));
  }
  if (top.length) {
    lines.push('', f.t('summary_top'));
    for (const c of top) lines.push(`• ${c.name}: ${f.money(c.total)}`);
  }
  if (budgets.length) {
    lines.push('', f.t('summary_budgets'));
    for (const b of budgets) {
      const cat = [...byCat.entries()].find(([id]) => id === b.category_id)?.[1];
      const name = cat?.name || expenses.find((e) => e.category_id === b.category_id)?.category;
      if (!name) continue;
      lines.push(f.t('summary_budget_line', { category: name, spent: f.money(cat?.total || 0), limit: f.money(b.limit_amount) }));
    }
  }
  return [{ text: lines.join('\n') }];
}
