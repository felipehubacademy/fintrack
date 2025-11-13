import { BADGE_DEFINITIONS } from '../components/Goals/GoalBadges';

/**
 * Calcula quais badges o usuário conquistou baseado nas metas e contribuições
 */
export function calculateEarnedBadges(goals = [], contributions = []) {
  const earned = [];

  // 1. Primeira meta criada
  if (goals.length >= 1) {
    earned.push({ badge_id: 'first_goal', earned_at: goals[0].created_at });
  }

  // 2. Primeira contribuição
  if (contributions.length >= 1) {
    earned.push({ badge_id: 'first_contribution', earned_at: contributions[0].created_at });
  }

  // 3. Streak (meses consecutivos)
  const streak = calculateStreak(contributions);
  if (streak >= 3) {
    earned.push({ badge_id: 'streak_3', earned_at: new Date().toISOString() });
  }
  if (streak >= 6) {
    earned.push({ badge_id: 'streak_6', earned_at: new Date().toISOString() });
  }
  if (streak >= 12) {
    earned.push({ badge_id: 'streak_12', earned_at: new Date().toISOString() });
  }

  // 4. Total economizado
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
  if (totalSaved >= 10000) {
    earned.push({ badge_id: 'saved_10k', earned_at: new Date().toISOString() });
  }
  if (totalSaved >= 50000) {
    earned.push({ badge_id: 'saved_50k', earned_at: new Date().toISOString() });
  }
  if (totalSaved >= 100000) {
    earned.push({ badge_id: 'saved_100k', earned_at: new Date().toISOString() });
  }

  // 5. Metas completadas
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  if (completedGoals >= 1) {
    earned.push({ badge_id: 'goal_completed_1', earned_at: new Date().toISOString() });
  }
  if (completedGoals >= 3) {
    earned.push({ badge_id: 'goal_completed_3', earned_at: new Date().toISOString() });
  }
  if (completedGoals >= 10) {
    earned.push({ badge_id: 'goal_completed_10', earned_at: new Date().toISOString() });
  }

  // 6. Meta atingida antes do prazo
  const earlyGoals = goals.filter(g => {
    if (g.status !== 'completed' || !g.target_date || !g.completed_at) return false;
    return new Date(g.completed_at) < new Date(g.target_date);
  });
  if (earlyGoals.length >= 1) {
    earned.push({ badge_id: 'goal_early', earned_at: earlyGoals[0].completed_at });
  }

  return earned;
}

/**
 * Calcula o streak (meses consecutivos com contribuições)
 */
export function calculateStreak(contributions = []) {
  if (contributions.length === 0) return 0;

  // Agrupar contribuições por mês
  const monthsWithContributions = new Set();
  contributions.forEach(c => {
    const date = new Date(c.contribution_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthsWithContributions.add(monthKey);
  });

  // Ordenar meses
  const sortedMonths = Array.from(monthsWithContributions).sort().reverse();
  
  // Contar meses consecutivos a partir do mais recente
  let streak = 0;
  const now = new Date();
  let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let i = 0; i < sortedMonths.length; i++) {
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    if (sortedMonths.includes(monthKey)) {
      streak++;
      currentMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcula o nível do usuário baseado em progresso
 */
export function calculateUserLevel(goals = [], contributions = []) {
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
  const streak = calculateStreak(contributions);

  // Pontuação
  let points = 0;
  points += completedGoals * 100; // 100 pontos por meta completa
  points += Math.floor(totalSaved / 1000) * 10; // 10 pontos por R$ 1.000
  points += streak * 50; // 50 pontos por mês de streak

  // Níveis
  if (points < 200) return { level: 'Iniciante', progress: (points / 200) * 100, nextLevel: 'Planejador' };
  if (points < 500) return { level: 'Planejador', progress: ((points - 200) / 300) * 100, nextLevel: 'Investidor' };
  if (points < 1000) return { level: 'Investidor', progress: ((points - 500) / 500) * 100, nextLevel: 'Expert' };
  return { level: 'Expert', progress: 100, nextLevel: null };
}

/**
 * Gera insights baseados em gamificação
 */
export function generateGamificationInsights(goals = [], contributions = [], badges = []) {
  const insights = [];
  const streak = calculateStreak(contributions);
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
  const completedGoals = goals.filter(g => g.status === 'completed').length;

  // Insight de streak
  if (streak === 0 && contributions.length > 0) {
    insights.push({
      type: 'warning',
      message: 'Você perdeu o streak! Faça uma contribuição este mês para recomeçar.'
    });
  } else if (streak > 0 && streak < 3) {
    insights.push({
      type: 'tip',
      message: `${3 - streak} ${3 - streak === 1 ? 'mês' : 'meses'} até conquistar o badge "Consistente"!`
    });
  } else if (streak >= 3 && streak < 6) {
    insights.push({
      type: 'success',
      message: `Parabéns! ${streak} meses consecutivos. Continue assim para o badge "Disciplinado"!`
    });
  }

  // Insight de economia
  if (totalSaved >= 9000 && totalSaved < 10000) {
    insights.push({
      type: 'tip',
      message: `Faltam apenas R$ ${(10000 - totalSaved).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para o badge "Poupador"!`
    });
  }

  // Insight de metas
  if (completedGoals === 0 && goals.length > 0) {
    const closestGoal = goals
      .filter(g => g.status === 'active')
      .sort((a, b) => {
        const progressA = (parseFloat(a.current_amount) / parseFloat(a.target_amount)) * 100;
        const progressB = (parseFloat(b.current_amount) / parseFloat(b.target_amount)) * 100;
        return progressB - progressA;
      })[0];

    if (closestGoal) {
      const progress = (parseFloat(closestGoal.current_amount) / parseFloat(closestGoal.target_amount)) * 100;
      if (progress >= 80) {
        insights.push({
          type: 'success',
          message: `Você está a ${(100 - progress).toFixed(0)}% de completar "${closestGoal.name}"!`
        });
      }
    }
  }

  return insights;
}

