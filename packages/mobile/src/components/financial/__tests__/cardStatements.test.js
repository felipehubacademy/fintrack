import {
  statementMonthKey,
  statementRange,
  committedByMonth,
  committedWindowEnd,
  tomorrowString,
  addMonths,
} from '../cardStatements';

const inst = (date, amount, extra = {}) => ({
  date,
  amount,
  installment_info: { total_installments: 10, current_installment: 2, installment_amount: amount },
  ...extra,
});

describe('statementMonthKey', () => {
  it('uses the calendar month without a closing day', () => {
    expect(statementMonthKey('2026-11-26', null)).toBe('2026-11');
  });

  it('moves purchases after the closing day to the next statement', () => {
    expect(statementMonthKey('2026-11-10', 10)).toBe('2026-11');
    expect(statementMonthKey('2026-11-11', 10)).toBe('2026-12');
    expect(statementMonthKey('2026-12-20', 10)).toBe('2027-01');
  });

  it('clamps closing days to short months', () => {
    expect(statementMonthKey('2027-02-28', 31)).toBe('2027-02');
  });
});

describe('statementRange', () => {
  it('returns the calendar month without a closing day', () => {
    expect(statementRange('2026-02', null)).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
  });

  it('runs from the day after the previous closing to the closing day', () => {
    expect(statementRange('2026-12', 10)).toEqual({ startDate: '2026-11-11', endDate: '2026-12-10' });
    expect(statementRange('2027-01', 5)).toEqual({ startDate: '2026-12-06', endDate: '2027-01-05' });
  });
});

describe('committedByMonth', () => {
  const today = new Date(2026, 10, 26); // 26 Nov 2026

  it('returns 6 empty months starting next month', () => {
    const r = committedByMonth([], { today });
    expect(r.months.map((m) => m.monthKey)).toEqual([
      '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05',
    ]);
    expect(r.total).toBe(0);
    expect(r.max).toBe(0);
  });

  it('sums future installments per statement month, ignoring past and non-installments', () => {
    const rows = [
      inst('2026-11-20', 100), // already charged
      inst('2026-12-05', 240),
      inst('2027-01-05', 240),
      inst('2027-01-09', 60.5),
      { date: '2027-01-09', amount: 999, installment_info: null }, // one-off
      { date: '2027-01-09', amount: 50, installment_info: { total_installments: 1 } },
      inst('2027-07-05', 240), // beyond the window
    ];
    const r = committedByMonth(rows, { today });
    expect(r.months[0]).toEqual({ monthKey: '2026-12', total: 240 });
    expect(r.months[1]).toEqual({ monthKey: '2027-01', total: 300.5 });
    expect(r.total).toBe(540.5);
    expect(r.max).toBe(300.5);
  });

  it('uses each card closing day to pick the statement', () => {
    const rows = [
      inst('2026-12-15', 100, { card_id: 'a' }), // closes 10 -> January statement
      inst('2026-12-15', 50, { card_id: 'b' }), // no closing day -> December
    ];
    const r = committedByMonth(rows, { today, closingDayByCard: { a: 10, b: null } });
    expect(r.months[0].total).toBe(50);
    expect(r.months[1].total).toBe(100);
    expect(r.total).toBe(150);
  });
});

describe('query window helpers', () => {
  const today = new Date(2026, 10, 26);
  it('starts tomorrow and ends at the end of the 6th month ahead', () => {
    expect(tomorrowString(today)).toBe('2026-11-27');
    expect(committedWindowEnd(today, 6)).toBe('2027-05-31');
  });
  it('adds months across years', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
  });
});
