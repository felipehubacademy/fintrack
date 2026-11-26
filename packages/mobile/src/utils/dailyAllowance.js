// The home screen's signature number: how much the user can spend per day
// until the end of the month without going over.
//
//   available = income this month
//             - money already spent this month (not on a credit card)
//             - bills still due this month
//             - credit card installments due this month
//             - what is left inside budgets (money already set aside)
//   perDay    = available / days left (today included)
//
// Card purchases are counted once, as installments due (they are paid when
// the statement is paid). Budget money is counted only for the part not yet
// spent, so spending inside a budget is not counted twice.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (items, pick) => (items || []).reduce((acc, item) => acc + (Number(pick(item)) || 0), 0);

export function daysLeftInMonth(today = new Date()) {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate() + 1;
}

export function lastDayOfMonth(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
}

/**
 * @param {object} input
 * @param {Array}  input.incomes   [{ amount }]
 * @param {Array}  input.expenses  [{ amount, payment_method }] confirmed this month
 * @param {Array}  input.bills     [{ amount }] pending/overdue, due this month
 * @param {Array}  input.budgets   [{ limit_amount, current_spent }] this month
 * @param {Date}   input.today
 * @returns {{ hasIncome, income, spent, billsDue, cardDue, budgetsReserved,
 *            committed, available, perDay, daysLeft, lastDay, overBy }}
 */
export function computeDailyAllowance({
  incomes = [],
  expenses = [],
  bills = [],
  budgets = [],
  today = new Date(),
} = {}) {
  const income = round2(sum(incomes, (i) => i.amount));
  const spentNotCard = round2(sum(
    (expenses || []).filter((e) => e.payment_method !== 'credit_card'),
    (e) => e.amount,
  ));
  const cardDue = round2(sum(
    (expenses || []).filter((e) => e.payment_method === 'credit_card'),
    (e) => e.amount,
  ));
  const billsDue = round2(sum(bills, (b) => b.amount));
  const budgetsReserved = round2(sum(budgets, (b) => Math.max(
    (Number(b.limit_amount) || 0) - (Number(b.current_spent) || 0),
    0,
  )));
  const monthSpent = round2(spentNotCard + cardDue);

  const committed = round2(spentNotCard + billsDue + cardDue + budgetsReserved);
  const available = round2(income - committed);
  const daysLeft = Math.max(daysLeftInMonth(today), 1);
  const perDay = available > 0 ? Math.floor((available / daysLeft) * 100) / 100 : 0;

  return {
    hasIncome: income > 0,
    income,
    spent: monthSpent,
    billsDue,
    cardDue,
    budgetsReserved,
    committed,
    available,
    perDay,
    daysLeft,
    lastDay: lastDayOfMonth(today),
    overBy: available < 0 ? Math.abs(available) : 0,
  };
}

/**
 * Next card statement among active credit cards: the nearest billing day
 * from today (this month or next) and what was charged on that card this month.
 * cards: [{ id, name, billing_day, card_type }]; expenses: [{ amount, card_id, payment_method }]
 */
export function nextCardStatement(cards = [], expenses = [], today = new Date()) {
  const candidates = (cards || [])
    .filter((c) => c && c.billing_day && c.card_type !== 'debit')
    .map((card) => {
      const day = Number(card.billing_day);
      let due = new Date(today.getFullYear(), today.getMonth(), day);
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (due < startOfToday) due = new Date(today.getFullYear(), today.getMonth() + 1, day);
      const amount = round2(sum(
        (expenses || []).filter((e) => e.card_id === card.id && e.payment_method === 'credit_card'),
        (e) => e.amount,
      ));
      return { card, dueDate: due, amount };
    })
    .sort((a, b) => a.dueDate - b.dueDate);
  return candidates[0] || null;
}

/** "30" -> "30th" in English; plain number in pt/es ("até o dia 30", "hasta el 30"). */
export function ordinalDay(day, language = 'en') {
  const n = Number(day);
  if (language !== 'en') return String(n);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
