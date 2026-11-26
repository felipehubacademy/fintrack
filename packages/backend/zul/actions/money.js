/**
 * Income, recurring bills and budgets.
 */
import { addDays, addMonths, monthStart } from '../language.js';
import { makeFormatter } from '../reply.js';
import { ensureAccount, resolveCategory, resolveCategoryText, ownerFields, categoryChoices } from './common.js';
import { categoryLabel } from '../categories.js';

export async function logIncome(ctx, intent) {
  await ensureAccount(ctx);
  const f = makeFormatter(ctx);
  const category = await resolveCategory(ctx, intent.category || 'other_income', 'income').catch(() => null);
  const label = category?.name || categoryLabel(intent.category || 'other_income', ctx.lang);
  const date = intent.date && intent.date <= ctx.today ? intent.date : addDays(ctx.today, intent.dayOffset || 0);
  const base = ownerFields(ctx);
  const row = {
    description: intent.description || label,
    amount: Math.round(Number(intent.amount) * 100) / 100,
    date,
    category: label,
    category_id: category?.id || null,
    cost_center_id: base.cost_center_id,
    owner: base.owner,
    is_shared: false,
    source: 'whatsapp',
    status: 'confirmed',
    payment_method: 'other',
    organization_id: base.organization_id,
    user_id: base.user_id,
  };
  const saved = await ctx.db.insertIncome(row);
  const text = [f.t('income_confirm', { amount: f.money(row.amount), category: label, when: f.when(date) }), f.t('income_hint')].join('\n');
  return [{ text, track: { kind: 'income', ids: [saved.id], data: { amount: row.amount, description: row.description, categoryName: label, date } }, record: true }];
}

/** Next date with that day of month (today counts). */
export function nextDueDate(today, day) {
  const thisMonth = addMonths(monthStart(today), 0, day);
  return thisMonth >= today ? thisMonth : addMonths(monthStart(today), 1, day);
}

export async function logBill(ctx, intent) {
  await ensureAccount(ctx);
  const f = makeFormatter(ctx);
  const category = await resolveCategory(ctx, intent.category || 'other');
  const day = Math.min(31, Math.max(1, Number(intent.dayOfMonth) || 1));
  const dueDate = nextDueDate(ctx.today, day);
  const base = ownerFields(ctx);
  const description = intent.description.charAt(0).toUpperCase() + intent.description.slice(1);
  const bill = await ctx.db.insertBill({
    description,
    amount: Math.round(Number(intent.amount) * 100) / 100,
    due_date: dueDate,
    category_id: category.id,
    cost_center_id: base.cost_center_id,
    is_recurring: true,
    recurrence_frequency: 'monthly',
    status: 'pending',
    organization_id: base.organization_id,
    user_id: base.user_id,
  });
  const text = f.t('bill_confirm', { description, amount: f.money(intent.amount), day, date: f.date(dueDate) });
  return [{ text, track: { kind: 'bill', ids: [bill.id], data: { description, amount: Number(intent.amount) } }, record: true }];
}

export async function setBudget(ctx, intent) {
  await ensureAccount(ctx);
  const f = makeFormatter(ctx);
  const category = intent.category
    ? await resolveCategory(ctx, intent.category)
    : await resolveCategoryText(ctx, intent.categoryText || '');
  if (!category?.id) {
    return [{ text: f.t('category_unknown', { text: intent.categoryText || '', list: categoryChoices(ctx) }) }];
  }
  const month = monthStart(ctx.today);
  await ctx.db.upsertBudget({ organizationId: ctx.user.organization_id, categoryId: category.id, limitAmount: Number(intent.amount), monthYear: month });
  const rows = await ctx.db.listExpenses(ctx.user.organization_id, { from: month, to: ctx.today, categoryIds: [category.id] });
  const spent = rows.reduce((s, e) => s + Number(e.amount || 0), 0);
  const left = Number(intent.amount) - spent;
  const key = left >= 0 ? 'budget_confirm' : 'budget_confirm_over';
  return [{
    text: f.t(key, { amount: f.money(intent.amount), category: category.name, spent: f.money(spent), left: f.money(left), over: f.money(-left) }),
    record: true,
  }];
}
