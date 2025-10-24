/**
 * Engagement Analyzer - MeuAzulão
 * Sistema de análise de padrões de uso e re-engajamento
 * 
 * Analisa quando e como os usuários interagem com o sistema
 */

import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente já estão disponíveis no Next.js
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

class EngagementAnalyzer {
  constructor() {
    this.engagementLevels = {
      HIGH: 'high',      // Usa diariamente
      MEDIUM: 'medium',  // Usa 3-4x por semana
      LOW: 'low',        // Usa 1-2x por semana
      INACTIVE: 'inactive' // Não usa há mais de 7 dias
    };
  }

  /**
   * Analisar padrões de engajamento do usuário
   */
  async analyzeUserEngagement(userId, organizationId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Buscar todas as atividades do usuário
      const { data: activities, error } = await supabase
        .from('expenses')
        .select('created_at, amount, description')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return this.calculateEngagementMetrics(activities || []);
    } catch (error) {
      console.error('Erro ao analisar engajamento:', error);
      return null;
    }
  }

  /**
   * Calcular métricas de engajamento
   */
  calculateEngagementMetrics(activities) {
    if (activities.length === 0) {
      return {
        level: this.engagementLevels.INACTIVE,
        streak: 0,
        frequency: 0,
        lastActivity: null,
        preferredHour: null,
        preferredDay: null,
        totalActivities: 0,
        averagePerDay: 0,
        engagementScore: 0
      };
    }

    // Calcular streak (dias consecutivos)
    const streak = this.calculateStreak(activities);
    
    // Calcular frequência (atividades por dia)
    const frequency = this.calculateFrequency(activities);
    
    // Encontrar horário preferido
    const preferredHour = this.findPreferredHour(activities);
    
    // Encontrar dia preferido
    const preferredDay = this.findPreferredDay(activities);
    
    // Calcular score de engajamento
    const engagementScore = this.calculateEngagementScore(activities, streak, frequency);
    
    // Determinar nível de engajamento
    const level = this.determineEngagementLevel(engagementScore, streak);

    return {
      level,
      streak,
      frequency,
      lastActivity: activities[0]?.created_at,
      preferredHour,
      preferredDay,
      totalActivities: activities.length,
      averagePerDay: activities.length / 30,
      engagementScore
    };
  }

  /**
   * Calcular streak de dias consecutivos
   */
  calculateStreak(activities) {
    if (activities.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    // Agrupar atividades por dia
    const activitiesByDate = {};
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      if (!activitiesByDate[date]) {
        activitiesByDate[date] = [];
      }
      activitiesByDate[date].push(activity);
    });

    // Verificar dias consecutivos a partir de hoje
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (activitiesByDate[dateStr] && activitiesByDate[dateStr].length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calcular frequência de uso
   */
  calculateFrequency(activities) {
    if (activities.length === 0) return 0;

    const uniqueDays = new Set();
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      uniqueDays.add(date);
    });

    return uniqueDays.size;
  }

  /**
   * Encontrar horário preferido
   */
  findPreferredHour(activities) {
    if (activities.length === 0) return null;

    const hourCounts = {};
    activities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts).reduce((max, [hour, count]) => 
      count > max.count ? { hour: parseInt(hour), count } : max, 
      { hour: 0, count: 0 }
    ).hour;
  }

  /**
   * Encontrar dia da semana preferido
   */
  findPreferredDay(activities) {
    if (activities.length === 0) return null;

    const dayCounts = {};
    activities.forEach(activity => {
      const day = new Date(activity.created_at).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    return Object.entries(dayCounts).reduce((max, [day, count]) => 
      count > max.count ? { day: parseInt(day), count } : max, 
      { day: 0, count: 0 }
    ).day;
  }

  /**
   * Calcular score de engajamento (0-100)
   */
  calculateEngagementScore(activities, streak, frequency) {
    const totalActivities = activities.length;
    const daysActive = frequency;
    const daysInPeriod = 30;
    
    // Fatores de peso
    const activityWeight = 0.4;      // 40% - número total de atividades
    const frequencyWeight = 0.3;     // 30% - frequência de uso
    const streakWeight = 0.3;        // 30% - consistência (streak)

    // Normalizar métricas (0-100)
    const activityScore = Math.min((totalActivities / 30) * 100, 100);
    const frequencyScore = (daysActive / daysInPeriod) * 100;
    const streakScore = Math.min(streak * 10, 100);

    const score = (
      activityScore * activityWeight +
      frequencyScore * frequencyWeight +
      streakScore * streakWeight
    );

    return Math.round(score);
  }

  /**
   * Determinar nível de engajamento
   */
  determineEngagementLevel(score, streak) {
    if (score >= 80 && streak >= 7) return this.engagementLevels.HIGH;
    if (score >= 60 && streak >= 3) return this.engagementLevels.MEDIUM;
    if (score >= 30) return this.engagementLevels.LOW;
    return this.engagementLevels.INACTIVE;
  }

  /**
   * Determinar melhor horário para lembrete
   */
  getOptimalReminderTime(engagementData) {
    if (!engagementData) return null;

    const { preferredHour, level, lastActivity } = engagementData;
    
    // Se usuário tem horário preferido, usar 30min depois
    if (preferredHour !== null) {
      const reminderHour = (preferredHour + 1) % 24;
      return {
        hour: reminderHour,
        minute: 0,
        reason: 'baseado_no_padrao'
      };
    }

    // Se usuário está inativo, tentar horários diferentes
    if (level === this.engagementLevels.INACTIVE) {
      const lastActivityDate = lastActivity ? new Date(lastActivity) : null;
      const daysSinceLastActivity = lastActivityDate ? 
        Math.floor((new Date() - lastActivityDate) / (1000 * 60 * 60 * 24)) : 999;

      if (daysSinceLastActivity > 7) {
        return {
          hour: 20, // 20h para usuários muito inativos
          minute: 0,
          reason: 'usuario_inativo'
        };
      }
    }

    // Horário padrão baseado no nível de engajamento
    const defaultHours = {
      [this.engagementLevels.HIGH]: 19,    // 19h para usuários ativos
      [this.engagementLevels.MEDIUM]: 20,  // 20h para usuários médios
      [this.engagementLevels.LOW]: 21,     // 21h para usuários pouco ativos
      [this.engagementLevels.INACTIVE]: 20 // 20h para inativos
    };

    return {
      hour: defaultHours[level] || 20,
      minute: 0,
      reason: 'padrao_por_nivel'
    };
  }

  /**
   * Gerar mensagem de re-engajamento personalizada
   */
  generateReEngagementMessage(userName, engagementData) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    const { level, streak, lastActivity, totalActivities } = engagementData;

    // Mensagens baseadas no nível de engajamento
    const messages = {
      [this.engagementLevels.HIGH]: [
        `Oi ${name}! Que tal registrar os gastos de hoje? 🔥`,
        `E aí ${name}! Vamos manter a sequência? 📊`,
        `${name}, bora anotar as despesas de hoje! 💪`
      ],
      [this.engagementLevels.MEDIUM]: [
        `Oi ${name}! Já registrou seus gastos de hoje? 📝`,
        `E aí ${name}! Que tal acompanhar suas despesas? 💰`,
        `${name}, bora manter o controle financeiro! 📊`
      ],
      [this.engagementLevels.LOW]: [
        `Oi ${name}! Faz tempo que não vejo você por aqui. Que tal registrar uma despesa? 🤔`,
        `E aí ${name}! Vamos voltar a acompanhar os gastos? 💡`,
        `${name}, que tal retomar o controle financeiro? 🚀`
      ],
      [this.engagementLevels.INACTIVE]: [
        `Oi ${name}! Sentimos sua falta! Que tal voltar a usar o MeuAzulão? 😊`,
        `E aí ${name}! Vamos retomar o controle das suas finanças? 💪`,
        `${name}, que tal começar de novo a acompanhar seus gastos? 🌟`
      ]
    };

    const levelMessages = messages[level] || messages[this.engagementLevels.LOW];
    const randomMessage = levelMessages[Math.floor(Math.random() * levelMessages.length)];

    // Adicionar contexto baseado no histórico
    let contextMessage = '';
    
    if (streak > 0) {
      contextMessage = `\n\n🔥 Você está em uma sequência de ${streak} dias! Continue assim!`;
    } else if (lastActivity) {
      const lastDate = new Date(lastActivity).toLocaleDateString('pt-BR');
      contextMessage = `\n\n📅 Última despesa: ${lastDate}`;
    } else if (totalActivities > 0) {
      contextMessage = `\n\n📊 Você já registrou ${totalActivities} despesas. Que tal continuar?`;
    }

    return randomMessage + contextMessage;
  }

  /**
   * Verificar se usuário precisa de re-engajamento
   */
  needsReEngagement(engagementData) {
    if (!engagementData) return true;

    const { level, lastActivity } = engagementData;
    
    // Usuários inativos sempre precisam de re-engajamento
    if (level === this.engagementLevels.INACTIVE) return true;
    
    // Verificar se passou muito tempo desde a última atividade
    if (lastActivity) {
      const daysSinceLastActivity = Math.floor(
        (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
      );
      
      // Usuários de baixo engajamento precisam de lembrete após 3 dias
      if (level === this.engagementLevels.LOW && daysSinceLastActivity >= 3) return true;
      
      // Usuários de médio engajamento precisam de lembrete após 5 dias
      if (level === this.engagementLevels.MEDIUM && daysSinceLastActivity >= 5) return true;
      
      // Usuários de alto engajamento precisam de lembrete após 7 dias
      if (level === this.engagementLevels.HIGH && daysSinceLastActivity >= 7) return true;
    }

    return false;
  }

  /**
   * Analisar todos os usuários da organização
   */
  async analyzeOrganizationEngagement(organizationId) {
    try {
      // Buscar todos os usuários ativos da organização
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, whatsapp_phone')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;

      const engagementData = [];

      for (const user of users || []) {
        const userEngagement = await this.analyzeUserEngagement(user.id, organizationId);
        
        if (userEngagement) {
          engagementData.push({
            user,
            engagement: userEngagement,
            needsReEngagement: this.needsReEngagement(userEngagement),
            optimalReminderTime: this.getOptimalReminderTime(userEngagement)
          });
        }
      }

      return engagementData;
    } catch (error) {
      console.error('Erro ao analisar engajamento da organização:', error);
      return [];
    }
  }
}

export default EngagementAnalyzer;
