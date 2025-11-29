import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { normalizeExpense, normalizeIncome, sumAmounts } from '../utils/normalizers';

const getMonthBoundaries = (selectedMonth) => {
  if (!selectedMonth) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    selectedMonth = `${year}-${month}`;
  }

  const [year, month] = selectedMonth.split('-');
  const startDate = `${selectedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
};

export function useMonthlyFinancials(organization, selectedMonth) {
  const [state, setState] = useState({
    expenses: [],
    incomes: [],
    costCenters: [],
    cards: [],
    categories: [],
    categoryMap: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!organization) return;

    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getMonthBoundaries(selectedMonth);

      const [
        expensesRes,
        incomesRes,
        costCentersRes,
        cardsRes,
        categoriesRes,
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('*, expense_splits(*), budget_categories:category_id (id, name, type), parent_expense:parent_expense_id (installment_info)')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('incomes')
          .select('*, income_splits(*), budget_categories:category_id (id, name, type)')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
        supabase
          .from('cost_centers')
          .select('id, name, color, is_active, default_split_percentage')
          .eq('organization_id', organization.id)
          .eq('is_active', true),
        supabase
          .from('cards')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true),
        supabase
          .from('budget_categories')
          .select('*')
          .or(`organization_id.eq.${organization.id},organization_id.is.null`),
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (incomesRes.error) throw incomesRes.error;
      if (costCentersRes.error) throw costCentersRes.error;
      if (cardsRes.error) throw cardsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const categoriesData = categoriesRes.data || [];
      const categoryMap = categoriesData.reduce((acc, cat) => {
        if (cat && cat.id) {
          acc[cat.id] = cat;
        }
        return acc;
      }, {});

      const normalizedExpenses = (expensesRes.data || [])
        .map(normalizeExpense)
        .map(expense => ({
          ...expense,
          category_name:
            expense.category ||
            expense.category_name ||
            categoryMap[expense.category_id]?.name ||
            expense.budget_categories?.name ||
            null,
        }));

      const normalizedIncomes = (incomesRes.data || [])
        .map(normalizeIncome)
        .map(income => ({
          ...income,
          category_name:
            income.category ||
            income.category_name ||
            categoryMap[income.category_id]?.name ||
            income.budget_categories?.name ||
            null,
        }));

      setState({
        expenses: normalizedExpenses,
        incomes: normalizedIncomes,
        costCenters: costCentersRes.data || [],
        cards: cardsRes.data || [],
        categories: categoriesData,
        categoryMap,
      });
    } catch (err) {
      console.warn('⚠️ useMonthlyFinancials error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    return {
      totalExpenses: sumAmounts(state.expenses),
      totalIncome: sumAmounts(state.incomes),
    };
  }, [state.expenses, state.incomes]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    ...totals,
    loading,
    error,
    refresh,
  };
}

