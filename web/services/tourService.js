import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class TourService {

  /**
   * Marcar tour como completado
   * Usa a tabela user_tours com completed_tours (JSONB)
   */
  async markTourCompleted(tourType, userId, organizationId) {
    try {
      console.log('💾 Salvando tour no banco:', { tourType, userId, organizationId });

      // Verificar se já existe um registro para este usuário
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('completed_tours')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar registro existente:', fetchError);
        // Se a tabela não existir, tentar criar via SQL direto
        return false;
      }

      const currentTours = existingRecord?.completed_tours || {};
      const updatedTours = {
        ...currentTours,
        [tourType]: true
      };

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('user_tours')
          .update({
            completed_tours: updatedTours,
            last_tour_viewed: tourType,
            last_tour_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Erro ao atualizar tour completado:', error);
          return false;
        }
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('user_tours')
          .insert({
            user_id: userId,
            completed_tours: updatedTours,
            last_tour_viewed: tourType,
            last_tour_at: new Date().toISOString()
          });

        if (error) {
          console.error('Erro ao criar registro de tour:', error);
          // Se a tabela não existir, retornar false mas não bloquear
          return false;
        }
      }

      console.log('✅ Tour salvo com sucesso:', tourType);
      return true;
    } catch (error) {
      console.error('Erro no serviço de tour:', error);
      return false;
    }
  }

  /**
   * Obter todos os tours completados pelo usuário
   * Usa a tabela user_tours com completed_tours (JSONB)
   */
  async getCompletedTours(userId, organizationId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_tours')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao obter tours completados:', error);
        return {};
      }

      // Retornar completed_tours diretamente (já é um objeto JSONB)
      const completedTours = data?.completed_tours || {};
      console.log('📊 Tours completados encontrados:', completedTours);
      return completedTours;
    } catch (error) {
      console.error('Erro no serviço de tour:', error);
      return {};
    }
  }

  /**
   * Resetar todos os tours (para admin ou teste)
   * Limpa completed_tours mas mantém o registro
   */
  async resetTours(userId) {
    try {
      const { error } = await supabase
        .from('user_tours')
        .update({
          completed_tours: {},
          last_tour_viewed: null,
          last_tour_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao resetar tours:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro no serviço de tour:', error);
      return false;
    }
  }

  /**
   * Marcar onboarding como completado
   * Usa a tabela user_tours com completed_onboarding (JSONB)
   */
  async markOnboardingCompleted(onboardingType, userId) {
    try {
      console.log('💾 Salvando onboarding no banco:', { onboardingType, userId });

      // Verificar se já existe um registro para este usuário
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('completed_onboarding')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar registro existente:', fetchError);
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
          .eq('user_id', userId);

        if (error) {
          console.error('Erro ao atualizar onboarding completado:', error);
          return false;
        }
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('user_tours')
          .insert({
            user_id: userId,
            completed_onboarding: updatedOnboarding
          });

        if (error) {
          console.error('Erro ao criar registro de onboarding:', error);
          return false;
        }
      }

      console.log('✅ Onboarding salvo com sucesso:', onboardingType);
      return true;
    } catch (error) {
      console.error('Erro no serviço de onboarding:', error);
      return false;
    }
  }

  /**
   * Verificar se onboarding foi completado
   * Usa a tabela user_tours com completed_onboarding (JSONB)
   */
  async isOnboardingCompleted(onboardingType, userId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_onboarding')
        .eq('user_id', userId)
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
   * Obter todos os onboarding completados
   * Usa a tabela user_tours com completed_onboarding (JSONB)
   */
  async getCompletedOnboarding(userId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_onboarding')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao obter onboarding completado:', error);
        return {};
      }

      return data?.completed_onboarding || {};
    } catch (error) {
      console.error('Erro ao obter onboarding completado:', error);
      return {};
    }
  }
}

export default new TourService();
