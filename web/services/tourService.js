import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class TourService {

  /**
   * Marcar tour como completado
   */
  async markTourCompleted(tourType, userId, organizationId) {
    try {
      // Buscar organização do usuário se não fornecida
      if (!organizationId) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userId)
          .single();
        
        organizationId = userData?.organization_id;
      }

      if (!organizationId) {
        console.error('❌ Organization ID não encontrado');
        return false;
      }

      // Verificar se já existe um registro para este tour
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('tour_name', tourType)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Erro ao buscar registro existente:', fetchError);
        return false;
      }

      const updateData = {
        is_completed: true,
        updated_at: new Date().toISOString()
      };

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('user_tours')
          .update(updateData)
          .eq('id', existingRecord.id);

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
            organization_id: organizationId,
            tour_name: tourType,
            is_completed: true
          });

        if (error) {
          console.error('Erro ao criar registro de tour:', error);
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
   * Obter todos os tours completados pelo usuário
   */
  async getCompletedTours(userId, organizationId) {
    try {
      // Buscar organização do usuário se não fornecida
      if (!organizationId) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userId)
          .single();
        
        organizationId = userData?.organization_id;
      }

      if (!organizationId) {
        console.log('⚠️ Organization ID não encontrado');
        return {};
      }

      const { data, error } = await supabase
        .from('user_tours')
        .select('tour_name, is_completed')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao obter tours completados:', error);
        return {};
      }

      // Converter array em objeto { tour_name: is_completed }
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
   * Resetar todos os tours (para admin ou teste)
   */
  async resetTours(userId) {
    try {
      const { error } = await supabase
        .from('user_tours')
        .delete()
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
}

export default new TourService();
