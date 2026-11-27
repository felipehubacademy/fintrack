/**
 * Message catalog access and reply builders. Every user-facing string comes
 * from messages/{lang}.js; money is formatted with Intl in the user's currency.
 */
import en from './messages/en.js';
import pt from './messages/pt.js';
import es from './messages/es.js';
import { formatMoney, formatShortDate, addDays, localeFor } from './language.js';
import { categoryLabel } from './categories.js';

export const CATALOGS = { en, pt, es };

export function t(lang, key, params = {}) {
  const catalog = CATALOGS[lang] || en;
  let template = catalog[key];
  if (params.count !== undefined && catalog[`${key}_${params.count === 1 ? 'one' : 'other'}`]) {
    template = catalog[`${key}_${params.count === 1 ? 'one' : 'other'}`];
  }
  if (template === undefined) template = en[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => (params[name] === undefined || params[name] === null ? '' : String(params[name])));
}

/** Small helper bound to one conversation. */
export function makeFormatter(ctx) {
  const { lang, currency, phone } = ctx;
  return {
    t: (key, params) => t(lang, key, params),
    money: (amount) => formatMoney(amount, { currency, lang, phone }),
    when: (date) => {
      if (!date || date === ctx.today) return t(lang, 'when_today');
      if (date === addDays(ctx.today, -1)) return t(lang, 'when_yesterday');
      return t(lang, 'when_date', { date: formatShortDate(date, lang, phone) });
    },
    monthName: (isoDate) => {
      try {
        const d = new Date(`${isoDate.slice(0, 7)}-15T12:00:00Z`);
        const s = new Intl.DateTimeFormat(localeFor(lang, phone), { month: 'long', timeZone: 'UTC' }).format(d);
        return s.charAt(0).toUpperCase() + s.slice(1);
      } catch (_) {
        return isoDate.slice(0, 7);
      }
    },
    date: (isoDate) => formatShortDate(isoDate, lang, phone),
  };
}

export function paymentDetail(lang, paymentMethod, cardName) {
  if (!paymentMethod || paymentMethod === 'other') return '';
  if (paymentMethod === 'credit_card' && cardName) return t(lang, 'pay_card_named', { card: cardName });
  const key = `pay_${paymentMethod}`;
  return CATALOGS[lang]?.[key] || en[key] ? t(lang, key) : '';
}

/**
 * One saved expense -> "✅ R$ 87,50 em Mercado, hoje."
 * expense: { amount, description, categoryName, date, paymentMethod, cardName }
 */
export function expenseLine(ctx, expense) {
  const f = makeFormatter(ctx);
  const extra = [];
  const desc = (expense.description || '').trim();
  if (desc && desc.toLowerCase() !== String(expense.categoryName || '').toLowerCase()) extra.push(`(${desc})`);
  const pay = paymentDetail(ctx.lang, expense.paymentMethod, expense.cardName);
  if (pay) extra.push(pay);
  return f.t('confirm_one', {
    amount: f.money(expense.amount),
    category: expense.categoryName || categoryLabel('other', ctx.lang),
    detail: extra.length ? ` ${extra.join(' ')}` : '',
    when: f.when(expense.date),
  });
}

/** Lines for a multi-item confirmation. */
export function multiExpenseText(ctx, expenses) {
  const f = makeFormatter(ctx);
  const dates = new Set(expenses.map((e) => e.date));
  const when = dates.size === 1 ? f.when(expenses[0].date) : f.when(ctx.today);
  const lines = expenses.map((e) => `• ${f.money(e.amount)} ${e.description} (${e.categoryName})`);
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  return [f.t('confirm_many_title', { count: expenses.length, when }), ...lines, f.t('confirm_many_total', { total: f.money(total) })].join('\n');
}

export function budgetLine(ctx, { categoryName, limit, spent }) {
  const f = makeFormatter(ctx);
  const left = Number(limit) - Number(spent);
  if (left >= 0) return f.t('budget_left', { left: f.money(left), category: categoryName });
  return f.t('budget_over', { over: f.money(-left), category: categoryName });
}

/** WhatsApp button titles max 20 chars. */
export function buttonTitle(text) {
  const s = String(text || '').trim();
  return s.length <= 20 ? s : `${s.slice(0, 19)}…`;
}
