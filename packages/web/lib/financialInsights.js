// ============================================================================
// Financial Insights Library
// Calculates trends, patterns, and generates insights for budget planning
// ============================================================================

const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Investimentos'
};

/**
 * Calculate spending trends for the last N months
 * @param {Array} expenses - Expenses data with date, amount, category_id
 * @param {Array} budgets - Budgets data with month_year, category_id, limit_amount
 * @param {number} months - Number of months to analyze
 * @returns {Array} Trend data by macro category
 */
export function calculateTrends(expenses, budgets, months = 6) {
  const result = [];
  const today = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = targetDate.toISOString().slice(0, 7);
    const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    // Filter expenses for this month
    const monthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getFullYear() === targetDate.getFullYear() &&
             expenseDate.getMonth() === targetDate.getMonth();
    });
    
    // Group by macro
    const macroTotals = {
      needs: 0,
      wants: 0,
      investments: 0
    };
    
    monthExpenses.forEach(expense => {
      // Find budget for this expense to get macro_group
      const budget = budgets.find(b => 
        b.category_id === expense.category_id &&
        b.month_year.startsWith(monthKey)
      );
      
      if (budget?.macro_group && macroTotals.hasOwnProperty(budget.macro_group)) {
        macroTotals[budget.macro_group] += parseFloat(expense.amount || 0);
      }
    });
    
    result.push({
      month: monthLabel,
      monthKey,
      ...macroTotals
    });
  }
  
  return result;
}

/**
 * Detect spending patterns and generate insights
 * @param {Array} expenses - Recent expenses
 * @param {Array} budgets - Current budgets
 * @returns {Array} Array of insight objects {type, title, message, severity}
 */
export function detectPatterns(expenses, budgets) {
  const insights = [];
  
  // Calculate current month stats
  const today = new Date();
  const currentMonthKey = today.toISOString().slice(0, 7);
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
  
  const currentExpenses = expenses.filter(e => e.date.startsWith(currentMonthKey));
  const previousExpenses = expenses.filter(e => e.date.startsWith(previousMonthKey));
  
  // Group by macro
  const currentByMacro = groupExpensesByMacro(currentExpenses, budgets);
  const previousByMacro = groupExpensesByMacro(previousExpenses, budgets);
  
  // Compare with previous month
  Object.keys(currentByMacro).forEach(macro => {
    const current = currentByMacro[macro];
    const previous = previousByMacro[macro] || 0;
    
    if (previous > 0) {
      const change = ((current - previous) / previous) * 100;
      
      if (change > 30) {
        insights.push({
          type: 'warning',
          title: `Aumento em ${MACRO_LABELS[macro]}`,
          message: `Seus gastos com ${MACRO_LABELS[macro]} aumentaram ${change.toFixed(0)}% nos últimos 2 meses`,
          severity: 'medium',
          macro
        });
      } else if (change < -20 && macro !== 'investments') {
        insights.push({
          type: 'success',
          title: `Redução em ${MACRO_LABELS[macro]}`,
          message: `Parabéns! Você reduziu gastos com ${MACRO_LABELS[macro]} em ${Math.abs(change).toFixed(0)}%`,
          severity: 'low',
          macro
        });
      }
    }
  });
  
  // Check investment consistency
  const last3Months = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const monthExpenses = expenses.filter(e => e.date.startsWith(key));
    const grouped = groupExpensesByMacro(monthExpenses, budgets);
    last3Months.push(grouped.investments || 0);
  }
  
  const allInvestmentsPositive = last3Months.every(v => v > 0);
  if (allInvestmentsPositive) {
    insights.push({
      type: 'success',
      title: 'Investindo consistentemente!',
      message: 'Você está economizando e investindo todos os meses. Continue assim!',
      severity: 'low',
      macro: 'investments'
    });
  }
  
  // Check budget adherence
  const currentBudgets = budgets.filter(b => b.month_year.startsWith(currentMonthKey));
  currentBudgets.forEach(budget => {
    const spent = currentExpenses
      .filter(e => e.category_id === budget.category_id)
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
    const percentage = (spent / budget.limit_amount) * 100;
    
    if (percentage > 90) {
      insights.push({
        type: 'alert',
        title: 'Orçamento próximo do limite',
        message: `${budget.category_name || 'Uma categoria'} está em ${percentage.toFixed(0)}% do orçamento`,
        severity: 'high',
        categoryId: budget.category_id
      });
    }
  });
  
  return insights.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Calculate financial health score (0-100)
 * @param {Object} data - Financial data {budgets, expenses, goals, income}
 * @returns {Object} Score and breakdown by category
 */
export function calculateHealthScore(data) {
  const { budgets, expenses, goals = [], income = [] } = data;
  let score = 0;
  const breakdown = {};
  
  // 1. Budget adherence (30 points)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentBudgets = budgets.filter(b => b.month_year.startsWith(currentMonth));
  const currentExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  
  let adherenceScore = 0;
  if (currentBudgets.length > 0) {
    const withinBudget = currentBudgets.filter(budget => {
      const spent = currentExpenses
        .filter(e => e.category_id === budget.category_id)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      return spent <= budget.limit_amount;
    }).length;
    
    adherenceScore = (withinBudget / currentBudgets.length) * 30;
  }
  breakdown.budgetAdherence = Math.round(adherenceScore);
  score += adherenceScore;
  
  // 2. Investment consistency (25 points)
  let investmentScore = 0;
  const last3Months = [];
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const monthExpenses = expenses.filter(e => e.date.startsWith(key));
    const grouped = groupExpensesByMacro(monthExpenses, budgets);
    last3Months.push(grouped.investments || 0);
  }
  const consistentInvestments = last3Months.filter(v => v > 0).length;
  investmentScore = (consistentInvestments / 3) * 25;
  breakdown.investmentConsistency = Math.round(investmentScore);
  score += investmentScore;
  
  // 3. Emergency fund (20 points)
  // Placeholder - would need actual savings data
  const emergencyScore = 10; // Assume partial
  breakdown.emergencyFund = emergencyScore;
  score += emergencyScore;
  
  // 4. Income diversity (15 points)
  // Placeholder - would need income categories
  const diversityScore = 5; // Assume low
  breakdown.incomeDiversity = diversityScore;
  score += diversityScore;
  
  // 5. Debt reduction (10 points)
  // Placeholder - would need debt tracking
  const debtScore = 5; // Assume some progress
  breakdown.debtReduction = debtScore;
  score += debtScore;
  
  return {
    total: Math.round(score),
    breakdown,
    rating: score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Regular' : 'Precisa melhorar'
  };
}

/**
 * Predict spending for end of month
 * @param {Array} expenses - Expenses so far this month
 * @param {number} daysRemaining - Days remaining in month
 * @returns {Object} Prediction data
 */
export function predictSpending(expenses, daysRemaining) {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = today.getDate();
  
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const dailyAverage = totalSpent / daysPassed;
  const projected = totalSpent + (dailyAverage * daysRemaining);
  
  return {
    currentSpent: totalSpent,
    dailyAverage,
    projected,
    daysRemaining,
    pace: projected > totalSpent * 1.1 ? 'high' : projected < totalSpent * 0.9 ? 'low' : 'normal'
  };
}

/**
 * Generate textual insights
 * @param {Object} data - All financial data
 * @returns {Array} Array of insight strings
 */
export function generateInsights(data) {
  const patterns = detectPatterns(data.expenses, data.budgets);
  const score = calculateHealthScore(data);
  const prediction = predictSpending(
    data.expenses.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7))),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
  );
  
  const insights = [];
  
  // Add pattern insights
  patterns.slice(0, 5).forEach(p => insights.push(p.message));
  
  // Add score insight
  insights.push(`Sua saúde financeira está ${score.rating.toLowerCase()} (${score.total}/100 pontos)`);
  
  // Add prediction insight
  if (prediction.pace === 'high') {
    insights.push(`No ritmo atual, você vai gastar R$ ${prediction.projected.toFixed(2)} até o fim do mês`);
  }
  
  return insights;
}

// Helper functions
function groupExpensesByMacro(expenses, budgets) {
  const grouped = { needs: 0, wants: 0, investments: 0 };
  
  expenses.forEach(expense => {
    const budget = budgets.find(b => b.category_id === expense.category_id);
    if (budget?.macro_group && grouped.hasOwnProperty(budget.macro_group)) {
      grouped[budget.macro_group] += parseFloat(expense.amount || 0);
    }
  });
  
  return grouped;
}

