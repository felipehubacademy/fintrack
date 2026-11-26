import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';
import ZulHint from '../ZulHint';
import {
  budgetRemaining,
  pendingBillsTotal,
  computeDailyAllowance,
  englishOrdinal,
} from '../../lib/dailyAllowance';

// Signature number on the dashboard home. Only meaningful for the current
// month; for other months it shows what was spent.
export default function DailyAllowanceCard({ organizationId, selectedMonth, income, spentOutsideCards, cardDue }) {
  const { t, formatMoney } = useI18n();
  const [bills, setBills] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedMonth === currentMonth;

  useEffect(() => {
    if (!organizationId || organizationId === 'default-org' || !isCurrentMonth) return undefined;
    let cancelled = false;
    const [year, month] = selectedMonth.split('-');
    const start = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    (async () => {
      try {
        const [billsRes, budgetsRes] = await Promise.all([
          supabase
            .from('bills')
            .select('amount, status, due_date')
            .eq('organization_id', organizationId)
            .gte('due_date', start)
            .lte('due_date', end),
          supabase
            .from('budgets')
            .select('limit_amount, current_spent')
            .eq('organization_id', organizationId)
            .eq('month_year', start),
        ]);
        if (cancelled) return;
        setBills(billsRes.data || []);
        setBudgets(budgetsRes.data || []);
      } catch (error) {
        console.error('Error loading daily allowance data:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, selectedMonth, isCurrentMonth]);

  const result = useMemo(() => computeDailyAllowance({
    income,
    spentOutsideCards,
    cardDue,
    bills: pendingBillsTotal(bills),
    budgetsLeft: budgetRemaining(budgets),
    today: now,
  }), [income, spentOutsideCards, cardDue, bills, budgets]); // eslint-disable-line react-hooks/exhaustive-deps

  const spent = (Number(spentOutsideCards) || 0) + (Number(cardDue) || 0);

  if (!isCurrentMonth) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
        <p className="text-sm font-medium text-ink-500">{t('web.allowance.monthSpentLabel')}</p>
        <p className="mt-1 text-3xl sm:text-4xl font-bold text-ink-900">{formatMoney(spent)}</p>
      </section>
    );
  }

  if (!result.hasIncome) {
    return (
      <section className="rounded-xl border border-brand-500/15 bg-brand-50 p-5 sm:p-6 shadow-sm">
        <p className="text-sm font-medium text-ink-500">{t('web.allowance.soFarLabel')}</p>
        <p className="mt-1 text-3xl sm:text-4xl font-bold text-ink-900">{formatMoney(spent)}</p>
        <p className="mt-3 mb-4 text-sm text-ink-500">{t('web.allowance.noIncomeHint')}</p>
        <ZulHint text={t('web.allowance.incomeExample')} align="left" />
      </section>
    );
  }

  const params = {
    amount: formatMoney(result.perDay),
    day: result.lastDay,
    dayOrdinal: englishOrdinal(result.lastDay),
  };
  const overCommitted = result.available <= 0;

  return (
    <section className="rounded-xl border border-brand-500/15 bg-brand-50 p-5 sm:p-6 shadow-sm">
      {overCommitted ? (
        <>
          <p className="text-2xl sm:text-3xl font-bold text-negative">{t('web.allowance.overTitle')}</p>
          <p className="mt-2 text-sm text-ink-500">
            {t('web.allowance.overBody', { amount: formatMoney(Math.abs(result.available)) })}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-ink-500">{t('web.allowance.label')}</p>
          <p className="mt-1 text-2xl sm:text-4xl font-bold leading-tight text-ink-900">
            {t('web.allowance.headline', params)}
          </p>
        </>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-500">{t('web.allowance.income')}</dt>
          <dd className="font-semibold text-ink-900">{formatMoney(result.income)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t('web.allowance.committed')}</dt>
          <dd className="font-semibold text-ink-900">{formatMoney(result.committed)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t('web.allowance.left')}</dt>
          <dd className={`font-semibold ${overCommitted ? 'text-negative' : 'text-positive'}`}>{formatMoney(result.available)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">{t('web.allowance.daysLeftLabel')}</dt>
          <dd className="font-semibold text-ink-900">{t('web.allowance.daysLeft', { count: result.daysLeft })}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-500">{t('web.allowance.howItWorks')}</p>
    </section>
  );
}
