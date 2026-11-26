/**
 * Pure helpers for credit card statements and installments ("parcelas",
 * "cuotas / meses sin intereses").
 *
 * A statement is identified by the month it closes in ("YYYY-MM"). With a
 * closing day C, the statement of month M holds purchases dated from C+1 of
 * month M-1 up to C of month M (clamped to the month's length). Without a
 * closing day, a statement is the calendar month.
 *
 * Future installments are stored as one `expenses` row per installment, dated
 * in the month they are charged, with installment_info.total_installments > 1.
 */

const pad = (n) => String(n).padStart(2, '0');

export const toMonthKey = (year, monthIndex) => {
  const d = new Date(year, monthIndex, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const addMonths = (monthKey, delta) => {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(y, m - 1 + delta);
};

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const validClosingDay = (closingDay) => {
  const n = Number(closingDay);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
};

const parseDate = (value) => {
  if (value instanceof Date) {
    return { year: value.getFullYear(), monthIndex: value.getMonth(), day: value.getDate() };
  }
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1, day: Number(match[3]) };
};

/** Month key ("YYYY-MM") of the statement a purchase dated `date` falls in. */
export function statementMonthKey(date, closingDay) {
  const parts = parseDate(date);
  if (!parts) return null;
  const closing = validClosingDay(closingDay);
  const { year, monthIndex, day } = parts;
  if (closing === null) return toMonthKey(year, monthIndex);
  const effectiveClosing = Math.min(closing, daysInMonth(year, monthIndex));
  return day > effectiveClosing ? toMonthKey(year, monthIndex + 1) : toMonthKey(year, monthIndex);
}

/** Date range (inclusive, "YYYY-MM-DD") of the statement that closes in monthKey. */
export function statementRange(monthKey, closingDay) {
  const [y, m] = monthKey.split('-').map(Number);
  const monthIndex = m - 1;
  const closing = validClosingDay(closingDay);
  const fmt = (year, mi, day) => {
    const d = new Date(year, mi, day);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  if (closing === null) {
    return { startDate: fmt(y, monthIndex, 1), endDate: fmt(y, monthIndex, daysInMonth(y, monthIndex)) };
  }
  const endDay = Math.min(closing, daysInMonth(y, monthIndex));
  const prevYear = monthIndex === 0 ? y - 1 : y;
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevClosing = Math.min(closing, daysInMonth(prevYear, prevMonth));
  return { startDate: fmt(prevYear, prevMonth, prevClosing + 1), endDate: fmt(y, monthIndex, endDay) };
}

export const isInstallment = (expense) => Number(expense?.installment_info?.total_installments || 0) > 1;

/** Amount one expense row adds to its statement. */
export const statementAmount = (expense) => Number(expense?.amount || 0);

/**
 * Totals of installments already scheduled (dated after today) for the next
 * `months` statements, starting with the statement that closes next calendar
 * month.
 *
 * @param {Array} expenses rows with { date, amount, card_id, installment_info }
 * @param {Object} opts
 *   - closingDayByCard: { [cardId]: closingDay }; closingDay: fallback for all rows
 *   - today: Date (defaults to now)
 *   - months: number of months (default 6)
 * @returns {{ months: Array<{ monthKey: string, total: number }>, total: number, max: number }}
 */
export function committedByMonth(expenses, opts = {}) {
  const { closingDayByCard = {}, closingDay = null, today = new Date(), months = 6 } = opts;
  const closingFor = (expense) => (
    expense && expense.card_id && Object.prototype.hasOwnProperty.call(closingDayByCard, expense.card_id)
      ? closingDayByCard[expense.card_id]
      : closingDay
  );
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const startKey = toMonthKey(today.getFullYear(), today.getMonth() + 1);

  const buckets = [];
  const index = {};
  for (let i = 0; i < months; i += 1) {
    const bucket = { monthKey: addMonths(startKey, i), total: 0 };
    buckets.push(bucket);
    index[bucket.monthKey] = bucket;
  }

  for (const expense of expenses || []) {
    if (!isInstallment(expense)) continue;
    const date = String(expense.date || '').slice(0, 10);
    if (!date || date <= todayStr) continue;
    const key = statementMonthKey(date, closingFor(expense));
    if (key && index[key]) index[key].total += statementAmount(expense);
  }

  buckets.forEach((b) => { b.total = Math.round(b.total * 100) / 100; });
  const total = Math.round(buckets.reduce((sum, b) => sum + b.total, 0) * 100) / 100;
  const max = buckets.reduce((m, b) => Math.max(m, b.total), 0);
  return { months: buckets, total, max };
}

/** Last date ("YYYY-MM-DD") that committedByMonth may look at. */
export function committedWindowEnd(today = new Date(), months = 6) {
  const key = toMonthKey(today.getFullYear(), today.getMonth() + months);
  // Covers any closing day: the statement closing in `key` ends on or before its last day.
  return statementRange(key, null).endDate;
}

/** First date after today, as "YYYY-MM-DD" (future installments start here). */
export function tomorrowString(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
