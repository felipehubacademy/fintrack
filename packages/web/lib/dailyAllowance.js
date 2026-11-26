// "You can spend X a day until the Nth": the dashboard's signature number.
//
// available = income this month
//           - money already spent outside credit cards
//           - credit card charges and installments dated this month
//           - bills still to pay this month
//           - what is left in this month's budgets (money set aside)
// perDay = available / days left in the month (today included)
//
// Budget spending already shows up in the spent figures, so only the unspent
// part of each budget is subtracted, which avoids counting it twice.

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function budgetRemaining(budgets = []) {
  return budgets.reduce((sum, b) => sum + Math.max(0, num(b.limit_amount) - num(b.current_spent)), 0);
}

export function pendingBillsTotal(bills = []) {
  return bills
    .filter((b) => b && (b.status === 'pending' || b.status === 'overdue'))
    .reduce((sum, b) => sum + num(b.amount), 0);
}

export function daysLeftInMonth(today = new Date()) {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return { daysLeft: last - today.getDate() + 1, lastDay: last };
}

export function computeDailyAllowance({
  income = 0,
  spentOutsideCards = 0,
  cardDue = 0,
  bills = 0,
  budgetsLeft = 0,
  today = new Date(),
} = {}) {
  const { daysLeft, lastDay } = daysLeftInMonth(today);
  const committed = num(spentOutsideCards) + num(cardDue) + num(bills) + num(budgetsLeft);
  const available = num(income) - committed;
  const perDay = daysLeft > 0 ? Math.max(0, available) / daysLeft : 0;
  return {
    hasIncome: num(income) > 0,
    income: num(income),
    committed,
    available,
    perDay: Math.floor(perDay * 100) / 100,
    daysLeft,
    lastDay,
  };
}

export function englishOrdinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
}
