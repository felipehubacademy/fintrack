export const normalizeExpense = (expense = {}) => {
  const amount = Number(expense.amount || 0);
  const relation = expense.budget_categories;
  const parentInstallmentInfo = expense.parent_expense?.installment_info;
  const rawCategory =
    typeof expense.category === 'string'
      ? expense.category
      : expense.category?.name ||
        relation?.name ||
        expense.category_name;

  return {
    id: expense.id,
    type: 'expense',
    description: expense.description || '',
    amount,
    payment_method: expense.payment_method || 'unknown',
    date: expense.date || new Date().toISOString(),
    category_id: expense.category_id || relation?.id || expense.category?.id || null,
    category_name: rawCategory || null,
    category: rawCategory || null,
    cost_center_id: expense.cost_center_id || null,
    card_id: expense.card_id || null,
    card_name: expense.card?.name || expense.card_name || null,
    installment_info: expense.installment_info || parentInstallmentInfo || null,
    parent_expense_id: expense.parent_expense_id || null,
    is_shared: Boolean(
      expense.is_shared ||
        (expense.expense_splits && expense.expense_splits.length > 0)
    ),
    expense_splits: Array.isArray(expense.expense_splits)
      ? expense.expense_splits
      : [],
    raw: expense,
  };
};

export const normalizeIncome = (income = {}) => {
  const amount = Number(income.amount || 0);
  const relation = income.budget_categories;
  const rawCategory =
    typeof income.category === 'string'
      ? income.category
      : income.category?.name ||
        relation?.name ||
        income.income_category_name;

  return {
    id: income.id,
    type: 'income',
    description: income.description || '',
    amount,
    date: income.date || new Date().toISOString(),
    category_id: income.income_category_id || relation?.id || income.category?.id || null,
    category_name: rawCategory || null,
    category: rawCategory || null,
    cost_center_id: income.cost_center_id || null,
    is_shared: Boolean(
      income.is_shared ||
        (income.income_splits && income.income_splits.length > 0)
    ),
    income_splits: Array.isArray(income.income_splits)
      ? income.income_splits
      : [],
    raw: income,
  };
};

export const sumAmounts = (items = []) =>
  items.reduce((total, item) => total + Number(item.amount || 0), 0);

