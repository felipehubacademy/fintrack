import {
  computeDailyAllowance,
  nextCardStatement,
  daysLeftInMonth,
  lastDayOfMonth,
  ordinalDay,
} from '../dailyAllowance';

// Nov 2026 has 30 days; on the 21st there are 10 days left (today included).
const today = new Date(2026, 10, 21);

describe('daysLeftInMonth / lastDayOfMonth', () => {
  it('counts today', () => {
    expect(daysLeftInMonth(today)).toBe(10);
    expect(daysLeftInMonth(new Date(2026, 10, 30))).toBe(1);
    expect(lastDayOfMonth(today)).toBe(30);
    expect(lastDayOfMonth(new Date(2028, 1, 10))).toBe(29);
  });
});

describe('computeDailyAllowance', () => {
  it('divides what is left after commitments by the days left', () => {
    const r = computeDailyAllowance({
      incomes: [{ amount: 3200 }],
      expenses: [
        { amount: 500, payment_method: 'pix' },
        { amount: 300, payment_method: 'credit_card' },
      ],
      bills: [{ amount: 400 }],
      budgets: [
        { limit_amount: 600, current_spent: 200 }, // 400 still reserved
        { limit_amount: 100, current_spent: 150 }, // over: nothing reserved
      ],
      today,
    });
    expect(r.hasIncome).toBe(true);
    expect(r.spent).toBe(800);
    expect(r.cardDue).toBe(300);
    expect(r.billsDue).toBe(400);
    expect(r.budgetsReserved).toBe(400);
    expect(r.committed).toBe(1600);
    expect(r.available).toBe(1600);
    expect(r.daysLeft).toBe(10);
    expect(r.perDay).toBe(160);
    expect(r.lastDay).toBe(30);
    expect(r.overBy).toBe(0);
  });

  it('rounds the daily amount down to cents', () => {
    const r = computeDailyAllowance({ incomes: [{ amount: 100 }], today: new Date(2026, 10, 28) });
    expect(r.daysLeft).toBe(3);
    expect(r.perDay).toBe(33.33);
  });

  it('reports how much is over when commitments exceed income', () => {
    const r = computeDailyAllowance({
      incomes: [{ amount: 1000 }],
      bills: [{ amount: 1200 }],
      today,
    });
    expect(r.available).toBe(-200);
    expect(r.perDay).toBe(0);
    expect(r.overBy).toBe(200);
  });

  it('flags when there is no income', () => {
    const r = computeDailyAllowance({ expenses: [{ amount: 42.5, payment_method: 'cash' }], today });
    expect(r.hasIncome).toBe(false);
    expect(r.spent).toBe(42.5);
  });

  it('handles missing input', () => {
    const r = computeDailyAllowance({ today });
    expect(r.perDay).toBe(0);
    expect(r.hasIncome).toBe(false);
  });
});

describe('nextCardStatement', () => {
  const cards = [
    { id: 'a', name: 'Nubank', billing_day: 10, card_type: 'credit' },
    { id: 'b', name: 'Inter', billing_day: 25, card_type: 'credit' },
    { id: 'c', name: 'Debit', billing_day: 22, card_type: 'debit' },
  ];
  const expenses = [
    { amount: 100, card_id: 'b', payment_method: 'credit_card' },
    { amount: 50, card_id: 'b', payment_method: 'credit_card' },
    { amount: 70, card_id: 'a', payment_method: 'credit_card' },
    { amount: 999, card_id: 'b', payment_method: 'pix' },
  ];

  it('picks the nearest billing day from today, skipping debit cards', () => {
    const r = nextCardStatement(cards, expenses, today);
    expect(r.card.id).toBe('b');
    expect(r.dueDate).toEqual(new Date(2026, 10, 25));
    expect(r.amount).toBe(150);
  });

  it('rolls a past billing day into next month', () => {
    const r = nextCardStatement([cards[0]], expenses, today);
    expect(r.dueDate).toEqual(new Date(2026, 11, 10));
    expect(r.amount).toBe(70);
  });

  it('returns null without credit cards', () => {
    expect(nextCardStatement([], expenses, today)).toBeNull();
    expect(nextCardStatement([cards[2]], expenses, today)).toBeNull();
  });
});

describe('ordinalDay', () => {
  it('adds English suffixes', () => {
    expect(ordinalDay(1, 'en')).toBe('1st');
    expect(ordinalDay(2, 'en')).toBe('2nd');
    expect(ordinalDay(3, 'en')).toBe('3rd');
    expect(ordinalDay(11, 'en')).toBe('11th');
    expect(ordinalDay(22, 'en')).toBe('22nd');
    expect(ordinalDay(30, 'en')).toBe('30th');
    expect(ordinalDay(31, 'en')).toBe('31st');
  });

  it('keeps the plain number in pt and es', () => {
    expect(ordinalDay(30, 'pt')).toBe('30');
    expect(ordinalDay(31, 'es')).toBe('31');
  });
});
