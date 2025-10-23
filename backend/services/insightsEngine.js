/**
 * Insights Engine - FinTrack
 * Sistema inteligente de análise de padrões financeiros
 * 
 * Analisa gastos, gera insights e sugestões personalizadas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

class InsightsEngine {
  constructor() {
    this.insightTypes = {
      COMPARATIVE: 'comparative',
      OPPORTUNITY: 'opportunity', 
      PATTERN: 'pattern',
      PROJECTION: 'projection',
      ACHIEVEMENT: 'achievement',
      ALERT: 'alert'
    };
  }

  /**
   * Analisar padrões de gastos do usuário
   */
  async analyzeUserPatterns(userId, organizationId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Buscar despesas do período
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
          *,
          category:budget_categories(name, color),
          cost_center:cost_centers(name, color)
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      // Buscar dados do mês anterior para comparação
      const prevMonthStart = new Date(startDate);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      const prevMonthEnd = new Date(startDate);

      const { data: prevExpenses } = await supabase
        .from('expenses')
        .select('amount, category_id, date')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed')
        .gte('date', prevMonthStart.toISOString().split('T')[0])
        .lt('date', prevMonthEnd.toISOString().split('T')[0]);

      return this.generateInsights(expenses || [], prevExpenses || []);
    } catch (error) {
      console.error('Erro ao analisar padrões:', error);
      return [];
    }
  }

  /**
   * Gerar insights baseados nos dados
   */
  generateInsights(currentExpenses, previousExpenses) {
    const insights = [];

    // 1. Análise comparativa mensal
    const comparativeInsight = this.generateComparativeInsight(currentExpenses, previousExpenses);
    if (comparativeInsight) insights.push(comparativeInsight);

    // 2. Análise de padrões por categoria
    const categoryInsights = this.generateCategoryInsights(currentExpenses);
    insights.push(...categoryInsights);

    // 3. Análise de padrões temporais
    const temporalInsights = this.generateTemporalInsights(currentExpenses);
    insights.push(...temporalInsights);

    // 4. Projeções
    const projectionInsight = this.generateProjectionInsight(currentExpenses);
    if (projectionInsight) insights.push(projectionInsight);

    // 5. Oportunidades de economia
    const opportunityInsights = this.generateOpportunityInsights(currentExpenses);
    insights.push(...opportunityInsights);

    // 6. Conquistas
    const achievementInsights = this.generateAchievementInsights(currentExpenses);
    insights.push(...achievementInsights);

    // Filtrar e priorizar insights
    return this.prioritizeInsights(insights);
  }

  /**
   * Insight comparativo (mês atual vs anterior)
   */
  generateComparativeInsight(current, previous) {
    const currentTotal = current.reduce((sum, e) => sum + Number(e.amount), 0);
    const previousTotal = previous.reduce((sum, e) => sum + Number(e.amount), 0);

    if (previousTotal === 0) return null;

    const changePercent = ((currentTotal - previousTotal) / previousTotal) * 100;
    const changeAmount = currentTotal - previousTotal;

    if (Math.abs(changePercent) < 5) return null; // Mudança muito pequena

    const isIncrease = changePercent > 0;
    const changeText = isIncrease ? 'aumentaram' : 'diminuíram';
    const emoji = isIncrease ? '📈' : '📉';
    const action = isIncrease ? 'Considere revisar suas despesas.' : 'Parabéns pela economia!';

    return {
      type: this.insightTypes.COMPARATIVE,
      priority: Math.abs(changePercent) > 30 ? 'high' : 'normal',
      text: `${emoji} Seus gastos ${changeText} ${Math.abs(changePercent).toFixed(1)}% este mês (R$ ${Math.abs(changeAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
      action: action,
      data: {
        currentTotal,
        previousTotal,
        changePercent,
        changeAmount
      }
    };
  }

  /**
   * Insights por categoria
   */
  generateCategoryInsights(expenses) {
    const insights = [];
    const categoryTotals = {};

    // Agrupar por categoria
    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Outros';
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = {
          total: 0,
          count: 0,
          expenses: []
        };
      }
      categoryTotals[categoryName].total += Number(expense.amount);
      categoryTotals[categoryName].count += 1;
      categoryTotals[categoryName].expenses.push(expense);
    });

    const totalSpent = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0);

    // Analisar cada categoria
    Object.entries(categoryTotals).forEach(([categoryName, data]) => {
      const percentage = (data.total / totalSpent) * 100;
      
      // Categoria com muito gasto
      if (percentage > 40) {
        insights.push({
          type: this.insightTypes.ALERT,
          priority: 'high',
          text: `⚠️ ${categoryName} representa ${percentage.toFixed(1)}% dos seus gastos (R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
          action: 'Considere otimizar gastos nesta categoria.',
          data: { categoryName, percentage, total: data.total }
        });
      }

      // Muitas transações pequenas
      if (data.count > 10 && data.total / data.count < 50) {
        insights.push({
          type: this.insightTypes.PATTERN,
          priority: 'normal',
          text: `🔍 Você fez ${data.count} gastos pequenos em ${categoryName} (média: R$ ${(data.total / data.count).toFixed(2)}).`,
          action: 'Considere agrupar compras para economizar.',
          data: { categoryName, count: data.count, average: data.total / data.count }
        });
      }
    });

    return insights;
  }

  /**
   * Insights temporais (dia da semana, horário)
   */
  generateTemporalInsights(expenses) {
    const insights = [];
    const dayOfWeekTotals = {};
    const hourTotals = {};

    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const dayOfWeek = date.getDay();
      const hour = new Date(expense.created_at).getHours();

      if (!dayOfWeekTotals[dayOfWeek]) dayOfWeekTotals[dayOfWeek] = 0;
      if (!hourTotals[hour]) hourTotals[hour] = 0;

      dayOfWeekTotals[dayOfWeek] += Number(expense.amount);
      hourTotals[hour] += Number(expense.amount);
    });

    // Dia da semana com mais gastos
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const maxDay = Object.entries(dayOfWeekTotals).reduce((max, [day, total]) => 
      total > max.total ? { day: parseInt(day), total } : max, { day: 0, total: 0 });

    if (maxDay.total > 0) {
      const totalSpent = Object.values(dayOfWeekTotals).reduce((sum, total) => sum + total, 0);
      const percentage = (maxDay.total / totalSpent) * 100;

      if (percentage > 25) {
        insights.push({
          type: this.insightTypes.PATTERN,
          priority: 'normal',
          text: `📅 ${dayNames[maxDay.day]} é o dia que você mais gasta (${percentage.toFixed(1)}% do total).`,
          action: 'Planeje melhor suas compras para este dia.',
          data: { day: maxDay.day, dayName: dayNames[maxDay.day], percentage, total: maxDay.total }
        });
      }
    }

    return insights;
  }

  /**
   * Projeção de gastos
   */
  generateProjectionInsight(expenses) {
    if (expenses.length < 5) return null; // Poucos dados para projeção

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysPassed = Math.ceil((now - monthStart) / (1000 * 60 * 60 * 24));
    const totalDays = monthEnd.getDate();

    const currentTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const dailyAverage = currentTotal / daysPassed;
    const projectedTotal = dailyAverage * totalDays;

    const projection = {
      type: this.insightTypes.PROJECTION,
      priority: 'normal',
      text: `📊 No ritmo atual, você vai gastar R$ ${projectedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} este mês.`,
      action: projectedTotal > currentTotal * 1.2 ? 'Considere reduzir gastos para manter o controle.' : 'Continue acompanhando seus gastos.',
      data: {
        currentTotal,
        projectedTotal,
        dailyAverage,
        daysPassed,
        totalDays
      }
    };

    return projection;
  }

  /**
   * Oportunidades de economia
   */
  generateOpportunityInsights(expenses) {
    const insights = [];
    const categoryTotals = {};

    // Agrupar por categoria
    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Outros';
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = { total: 0, count: 0 };
      }
      categoryTotals[categoryName].total += Number(expense.amount);
      categoryTotals[categoryName].count += 1;
    });

    // Encontrar categorias com potencial de economia
    Object.entries(categoryTotals).forEach(([categoryName, data]) => {
      if (data.total > 500 && data.count > 5) { // Categoria significativa
        const potentialSavings = data.total * 0.1; // 10% de economia
        insights.push({
          type: this.insightTypes.OPPORTUNITY,
          priority: 'normal',
          text: `💰 Se reduzir 10% em ${categoryName}, você economizaria R$ ${potentialSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          action: 'Pesquise preços ou considere alternativas mais baratas.',
          data: { categoryName, currentTotal: data.total, potentialSavings }
        });
      }
    });

    return insights;
  }

  /**
   * Conquistas e marcos
   */
  generateAchievementInsights(expenses) {
    const insights = [];
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const expenseCount = expenses.length;

    // Marco de número de transações
    if (expenseCount >= 50) {
      insights.push({
        type: this.insightTypes.ACHIEVEMENT,
        priority: 'low',
        text: `🎉 Parabéns! Você já registrou ${expenseCount} despesas.`,
        action: 'Continue acompanhando seus gastos para melhor controle financeiro.',
        data: { count: expenseCount }
      });
    }

    // Controle de gastos (se não há gastos muito altos)
    const maxExpense = Math.max(...expenses.map(e => Number(e.amount)));
    if (maxExpense < 200 && totalSpent > 1000) {
      insights.push({
        type: this.insightTypes.ACHIEVEMENT,
        priority: 'low',
        text: `✅ Excelente controle! Você mantém gastos moderados (máximo: R$ ${maxExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
        action: 'Continue com essa disciplina financeira!',
        data: { maxExpense, totalSpent }
      });
    }

    return insights;
  }

  /**
   * Priorizar insights por relevância
   */
  prioritizeInsights(insights) {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    return insights
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 3); // Máximo 3 insights por vez
  }

  /**
   * Gerar insight para orçamento
   */
  async generateBudgetInsight(userId, organizationId, categoryId, monthYear) {
    try {
      const { data: budgetData } = await supabase.rpc('get_budget_usage', {
        org_id: organizationId,
        cat_id: categoryId,
        month_year: monthYear
      });

      if (!budgetData || budgetData.length === 0) return null;

      const budget = budgetData[0];
      const { budget_limit, spent_amount, usage_percentage, remaining_amount } = budget;

      if (usage_percentage >= 100) {
        return {
          type: this.insightTypes.ALERT,
          priority: 'urgent',
          text: `🚨 Orçamento ultrapassado! Você gastou R$ ${spent_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ ${budget_limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          action: 'Revise suas despesas e considere ajustar o orçamento.',
          data: budget
        };
      } else if (usage_percentage >= 90) {
        return {
          type: this.insightTypes.ALERT,
          priority: 'high',
          text: `⚠️ Atenção! Você já usou ${usage_percentage.toFixed(1)}% do orçamento (R$ ${remaining_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} restantes).`,
          action: 'Controle seus gastos para não ultrapassar o limite.',
          data: budget
        };
      } else if (usage_percentage >= 80) {
        return {
          type: this.insightTypes.ALERT,
          priority: 'normal',
          text: `📊 Você já usou ${usage_percentage.toFixed(1)}% do orçamento.`,
          action: 'Continue acompanhando para manter o controle.',
          data: budget
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao gerar insight de orçamento:', error);
      return null;
    }
  }
}

export default InsightsEngine;
