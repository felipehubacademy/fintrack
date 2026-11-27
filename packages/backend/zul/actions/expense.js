/**
 * Expenses: single, several in one message, and credit-card installments.
 */
import { addDays, addMonths } from '../language.js';
import { categoryLabel } from '../categories.js';
import { makeFormatter, expenseLine, multiExpenseText, buttonTitle } from '../reply.js';
import { ensureAccount, resolveCategory, matchCard, ownerFields, budgetLines } from './common.js';

function expenseDate(ctx, item) {
  if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.date <= ctx.today) return item.date;
  return item.dayOffset ? addDays(ctx.today, item.dayOffset) : ctx.today;
}

export async function logExpenses(ctx, intent) {
  await ensureAccount(ctx);
  const f = makeFormatter(ctx);
  const cards = intent.items.some((i) => i.cardName || i.paymentMethod === 'credit_card') ? await ctx.db.listCards(ctx.user.organization_id) : [];

  const prepared = [];
  for (const item of intent.items) {
    const category = await resolveCategory(ctx, item.category || 'other');
    const paymentMethod = item.paymentMethod || (item.cardName ? 'credit_card' : 'other');
    const card = paymentMethod === 'credit_card' ? matchCard(cards, item.cardName) || (cards.length === 1 ? cards[0] : null) : null;
    prepared.push({
      item,
      category,
      card,
      row: {
        amount: Math.round(Number(item.amount) * 100) / 100,
        description: item.description || category.name,
        date: expenseDate(ctx, item),
        category: category.name,
        category_id: category.id,
        payment_method: paymentMethod,
        card_id: card?.id || null,
        status: 'confirmed',
        is_shared: false,
        confirmed_at: new Date().toISOString(),
        confirmed_by: ctx.user.id,
        source: 'whatsapp',
        whatsapp_message_id: ctx.messageId,
        ...ownerFields(ctx),
      },
    });
  }

  const saved = await ctx.db.insertExpenses(prepared.map((p) => p.row));
  const ids = saved.map((s) => s.id);
  const view = prepared.map((p, i) => ({
    id: ids[i],
    amount: p.row.amount,
    description: p.row.description,
    categoryName: p.category.name,
    categoryId: p.category.id,
    date: p.row.date,
    paymentMethod: p.row.payment_method,
    cardName: p.card?.name || p.item.cardName || null,
  }));

  const extra = await budgetLines(ctx, view.map((v) => v.categoryId)).catch(() => []);
  const track = { kind: 'expense', ids, data: { items: view } };

  if (view.length === 1) {
    const v = view[0];
    const low = prepared[0].item.confidence === 'low';
    const body = [expenseLine(ctx, v), ...extra, low ? f.t('confirm_low_hint') : f.t('confirm_hint')].join('\n');
    if (low) {
      const keys = [...new Set([...(prepared[0].item.alternatives || []), 'restaurants', 'groceries', 'shopping'])]
        .filter((k) => k !== prepared[0].category.key)
        .slice(0, 3);
      return [{ text: body, buttons: keys.map((k) => ({ id: `cat:${k}`, title: buttonTitle(categoryLabel(k, ctx.lang)) })), track, record: true }];
    }
    return [{ text: body, track, record: true }];
  }
  const body = [multiExpenseText(ctx, view), ...extra, f.t('confirm_many_hint')].join('\n');
  return [{ text: body, track, record: true }];
}

/** Which statement (month) the first installment falls on. */
export function firstStatementMonth(purchaseDate, closingDay) {
  const day = Number(purchaseDate.slice(8, 10));
  return day <= closingDay ? purchaseDate : addMonths(purchaseDate, 1, 1);
}

async function createInstallmentRows(ctx, { description, amount, installments, card, category, date }) {
  const base = ownerFields(ctx);
  try {
    const parentId = await ctx.db.createInstallments({
      amount, installments, description, date, cardId: card.id, categoryId: category.id,
      costCenterId: base.cost_center_id, owner: base.owner, organizationId: base.organization_id,
      userId: base.user_id, whatsappMessageId: ctx.messageId,
    });
    if (parentId) {
      await ctx.db.updateExpenses([parentId], { source: 'whatsapp', whatsapp_message_id: ctx.messageId }, base.organization_id).catch(() => {});
      return parentId;
    }
  } catch (err) {
    console.warn('[zul] create_installments RPC failed, inserting rows directly:', err.message);
  }
  // Fallback: same convention as the RPC (one row per month, same day).
  const each = Math.round((amount / installments) * 100) / 100;
  const common = {
    description, payment_method: 'credit_card', card_id: card.id, category_id: category.id, category: category.name,
    status: 'confirmed', is_shared: false, confirmed_at: new Date().toISOString(), confirmed_by: base.user_id,
    source: 'whatsapp', whatsapp_message_id: ctx.messageId, ...base,
  };
  const info = (n) => ({ total_installments: installments, current_installment: n, installment_amount: each, total_amount: amount });
  const [parent] = await ctx.db.insertExpenses([{ ...common, amount: each, date, installment_info: info(1) }]);
  const children = [];
  for (let i = 2; i <= installments; i += 1) {
    children.push({ ...common, amount: each, date: addMonths(date, i - 1), installment_info: info(i), parent_expense_id: parent.id });
  }
  if (children.length) await ctx.db.insertExpenses(children);
  return parent.id;
}

async function finishInstallments(ctx, args, card) {
  const f = makeFormatter(ctx);
  const category = await resolveCategory(ctx, args.category || 'other');
  const date = ctx.today;
  const parentId = await createInstallmentRows(ctx, { ...args, card, category, date });
  const statement = firstStatementMonth(date, Number(card.closing_day) || 10);
  const text = [
    f.t('installments_confirm', {
      description: args.description,
      count: args.installments,
      installment: f.money(Math.round((args.amount / args.installments) * 100) / 100),
      card: f.t('pay_card_named', { card: card.name }),
      total: f.money(args.amount),
      month: f.monthName(statement),
    }),
    f.t('installments_hint'),
  ].join('\n');
  return [{ text, track: { kind: 'installments', ids: [parentId], data: { description: args.description, amount: args.amount } }, record: true }];
}

export async function logInstallments(ctx, intent) {
  await ensureAccount(ctx);
  const cards = await ctx.db.listCards(ctx.user.organization_id);
  const credit = cards.filter((c) => !c.type || c.type === 'credit' || c.card_type === 'credit');
  const cardName = intent.cardName || null;
  const card = cardName ? matchCard(cards, cardName) : (credit.length === 1 ? credit[0] : null);
  const args = {
    description: intent.description,
    amount: Number(intent.amount),
    installments: Number(intent.installments),
    category: intent.category,
  };
  if (card && card.closing_day) return finishInstallments(ctx, args, card);

  const name = card?.name || cardName || makeFormatter(ctx).t('default_card_name');
  ctx.state.pending = { type: 'closing_day', cardId: card?.id || null, cardName: name, args, at: new Date().toISOString() };
  return [{ text: makeFormatter(ctx).t('ask_closing_day', { card: name }) }];
}

/** Answer to "what day does the statement close?" */
export async function answerClosingDay(ctx, day) {
  const pending = ctx.state.pending;
  ctx.state.pending = null;
  await ensureAccount(ctx);
  let card;
  if (pending.cardId) {
    await ctx.db.updateCard(pending.cardId, { closing_day: day });
    card = (await ctx.db.listCards(ctx.user.organization_id)).find((c) => c.id === pending.cardId);
    if (card) card.closing_day = day;
  }
  if (!card) card = await ctx.db.createCard(ctx.user.organization_id, { name: pending.cardName, closingDay: day, ownerId: ctx.user.id });
  return finishInstallments(ctx, pending.args, card);
}
