/**
 * Fix or delete what a confirmation recorded: reply "foi 78", "é lazer",
 * "apaga", "borra", "delete", "era no cartão" (or tap a category button).
 */
import { addDays } from '../language.js';
import { makeFormatter, expenseLine } from '../reply.js';
import { resolveCategory, resolveCategoryText, matchCard, categoryChoices } from './common.js';

function describe(ctx, target) {
  const f = makeFormatter(ctx);
  const d = target.data || {};
  if (d.items?.length === 1) return `${f.money(d.items[0].amount)} ${d.items[0].description}`;
  if (d.amount) return `${f.money(d.amount)} ${d.description || ''}`.trim();
  return '';
}

export async function applyCorrection(ctx, target, correction) {
  const f = makeFormatter(ctx);
  if (!target || !ctx.user) return [{ text: f.t('nothing_to_fix') }];
  const orgId = ctx.user.organization_id;
  const { kind, ids } = target;

  if (correction.delete) {
    let removed = [];
    if (kind === 'expense' || kind === 'installments') removed = await ctx.db.deleteExpenses(ids, orgId);
    else if (kind === 'income') removed = await ctx.db.deleteIncomes(ids, orgId);
    else if (kind === 'bill') removed = await ctx.db.deleteBills(ids, orgId);
    if (ctx.state.last_confirmation?.ids?.join() === ids.join()) ctx.state.last_confirmation = null;
    if (!removed.length) return [{ text: f.t('nothing_to_fix') }];
    if (kind === 'expense' && ids.length > 1) return [{ text: f.t('deleted_many', { count: ids.length }) }];
    return [{ text: f.t('deleted', { what: describe(ctx, target) }) }];
  }

  if (kind === 'income') {
    const patch = {};
    if (correction.amount) patch.amount = correction.amount;
    if (correction.categoryText || correction.categoryKey) {
      const cat = correction.categoryKey
        ? await resolveCategory(ctx, correction.categoryKey, 'income')
        : await resolveCategoryText(ctx, correction.categoryText, 'income');
      if (!cat) return [{ text: f.t('category_unknown', { text: correction.categoryText, list: categoryChoices(ctx, 'income') }) }];
      patch.category = cat.name;
      patch.category_id = cat.id;
    }
    if (correction.dayOffset) patch.date = addDays(ctx.today, correction.dayOffset);
    if (correction.date) patch.date = correction.date;
    if (!Object.keys(patch).length) return [{ text: f.t('nothing_to_fix') }];
    const [row] = await ctx.db.updateIncomes(ids, patch, orgId).catch(async (err) => {
      if (patch.category_id) {
        delete patch.category_id;
        return ctx.db.updateIncomes(ids, patch, orgId);
      }
      throw err;
    });
    if (!row) return [{ text: f.t('nothing_to_fix') }];
    const line = f.t('income_confirm', { amount: f.money(row.amount), category: row.category, when: f.when(row.date) });
    return [{ text: f.t('updated', { line }), track: { ...target, data: { amount: row.amount, description: row.description } } }];
  }

  if (kind === 'bill') return [{ text: f.t('fix_ambiguous') }];
  if (ids.length > 1 && (kind === 'expense')) return [{ text: f.t('fix_ambiguous') }];
  if (kind === 'installments' && (correction.amount || correction.dayOffset || correction.date)) return [{ text: f.t('installments_hint') }];

  const patch = {};
  if (correction.amount && kind === 'expense') patch.amount = correction.amount;
  if (correction.categoryText || correction.categoryKey) {
    const cat = correction.categoryKey
      ? await resolveCategory(ctx, correction.categoryKey)
      : await resolveCategoryText(ctx, correction.categoryText);
    if (!cat) return [{ text: f.t('category_unknown', { text: correction.categoryText, list: categoryChoices(ctx) }) }];
    patch.category = cat.name;
    patch.category_id = cat.id;
  }
  if (correction.paymentMethod) {
    patch.payment_method = correction.paymentMethod;
    if (correction.paymentMethod === 'credit_card') {
      const cards = await ctx.db.listCards(orgId);
      const card = matchCard(cards, correction.cardName) || (cards.length === 1 ? cards[0] : null);
      patch.card_id = card?.id || null;
    } else {
      patch.card_id = null;
    }
  }
  if (correction.dayOffset) patch.date = addDays(ctx.today, correction.dayOffset);
  if (correction.date && correction.date <= ctx.today) patch.date = correction.date;
  if (!Object.keys(patch).length) return [{ text: f.t('nothing_to_fix') }];

  const rows = await ctx.db.updateExpenses(ids, patch, orgId);
  const row = rows.find((r) => r.id === ids[0]) || rows[0];
  if (!row) return [{ text: f.t('nothing_to_fix') }];
  let cardName = null;
  if (row.card_id) cardName = (await ctx.db.listCards(orgId)).find((c) => c.id === row.card_id)?.name || correction.cardName || null;
  const view = {
    id: row.id, amount: row.amount, description: row.description, categoryName: row.category, categoryId: row.category_id,
    date: row.date, paymentMethod: row.payment_method, cardName,
  };
  const line = kind === 'installments'
    ? `${row.description} (${row.category})`
    : expenseLine(ctx, view).replace(/^✅\s*/, '');
  return [{ text: f.t('updated', { line }), track: { kind, ids, data: kind === 'expense' ? { items: [view] } : target.data } }];
}
