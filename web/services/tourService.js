import { supabase } from '../lib/supabaseClient';

class TourService {

  /**
   * Marcar tour como completado
   * Estrutura: um registro por tour (user_id, organization_id, tour_name)
   */
  async markTourCompleted(tourName, userId, organizationId) {
    try {
      // Buscar registro existente para este tour específico
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('tour_name', tourName)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar tour:', fetchError);
        return false;
      }

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('user_tours')
          .update({
            is_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Erro ao atualizar tour:', error);
          return false;
        }
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('user_tours')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            tour_name: tourName,
            is_completed: true,
            completed_steps: []
          });

        if (error) {
          console.error('Erro ao criar tour:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro no serviço de tour:', error);
      return false;
    }
  }

  /**
   * Marcar step de um tour como completado
   */
  async markStepCompleted(tourName, stepId, userId, organizationId) {
    try {
      // Buscar registro existente
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('tour_name', tourName)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar tour:', fetchError);
        return false;
      }

      const currentSteps = existingRecord?.completed_steps || [];
      
      // Adicionar step se não existir
      if (!currentSteps.includes(stepId)) {
        currentSteps.push(stepId);
      }

      if (existingRecord) {
        // Atualizar
        const { error } = await supabase
          .from('user_tours')
          .update({
            completed_steps: currentSteps,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Erro ao atualizar steps:', error);
          return false;
        }
      } else {
        // Criar novo
        const { error } = await supabase
          .from('user_tours')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            tour_name: tourName,
            completed_steps: currentSteps,
            is_completed: false
          });

        if (error) {
          console.error('Erro ao criar tour com step:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar step:', error);
      return false;
    }
  }

  /**
   * Obter todos os tours completados pelo usuário
   * Retorna um objeto: { tourName: true/false }
   */
  async getCompletedTours(userId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('tour_name, is_completed')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao obter tours completados:', error);
        return {};
      }

      // Converter array para objeto { tourName: isCompleted }
      const completedTours = {};
      data?.forEach(tour => {
        completedTours[tour.tour_name] = tour.is_completed;
      });

      return completedTours;
    } catch (error) {
      console.error('Erro no serviço de tour:', error);
      return {};
    }
  }

  /**
   * Obter steps completados de um tour específico
   */
  async getCompletedSteps(tourName, userId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_steps')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('tour_name', tourName)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao obter steps:', error);
        return [];
      }

      return data?.completed_steps || [];
    } catch (error) {
      console.error('Erro ao obter steps:', error);
      return [];
    }
  }

  /**
   * Verificar se um tour foi completado
   */
  async isTourCompleted(tourName, userId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('is_completed')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('tour_name', tourName)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar tour:', error);
        return false;
      }

      return data?.is_completed || false;
    } catch (error) {
      console.error('Erro ao verificar tour:', error);
      return false;
    }
  }

  /**
   * Resetar um tour específico
   */
  async resetTour(tourName, userId, organizationId) {
    try {
      const { error } = await supabase
        .from('user_tours')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('tour_name', tourName);

      if (error) {
        console.error('Erro ao resetar tour:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao resetar tour:', error);
      return false;
    }
  }

  /**
   * Resetar todos os tours de um usuário
   */
  async resetAllTours(userId, organizationId) {
    try {
      const { error } = await supabase
        .from('user_tours')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao resetar tours:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao resetar tours:', error);
      return false;
    }
  }

  /**
   * Marcar onboarding como completado (usa completed_onboarding JSONB)
   * Onboarding é diferente de tours - é um JSONB único por usuário
   */
  async markOnboardingCompleted(onboardingType, userId, organizationId) {
    try {
      // Buscar qualquer registro do usuário para pegar o completed_onboarding
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('id, completed_onboarding')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar onboarding:', fetchError);
        return false;
      }

      const currentOnboarding = existingRecord?.completed_onboarding || {};
      const updatedOnboarding = {
        ...currentOnboarding,
        [onboardingType]: true
      };

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('user_tours')
          .update({
            completed_onboarding: updatedOnboarding,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) {
          console.error('Erro ao atualizar onboarding:', error);
          return false;
        }
      } else {
        // Criar novo registro genérico para armazenar onboarding
        const { error } = await supabase
          .from('user_tours')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            tour_name: '_onboarding_', // Tour especial para onboarding
            completed_onboarding: updatedOnboarding,
            is_completed: false
          });

        if (error) {
          console.error('Erro ao criar onboarding:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar onboarding:', error);
      return false;
    }
  }

  /**
   * Verificar se onboarding foi completado
   */
  async isOnboardingCompleted(onboardingType, userId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_onboarding')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar onboarding:', error);
        return false;
      }

      const completedOnboarding = data?.completed_onboarding || {};
      return completedOnboarding[onboardingType] === true;
    } catch (error) {
      console.error('Erro ao verificar onboarding:', error);
      return false;
    }
  }

  /**
   * Obter onboarding completado
   */
  async getCompletedOnboarding(userId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_onboarding')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao obter onboarding:', error);
        return {};
      }

      return data?.completed_onboarding || {};
    } catch (error) {
      console.error('Erro ao obter onboarding:', error);
      return {};
    }
  }
}

export default new TourService();
