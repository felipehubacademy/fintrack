import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class TourService {

  /**
   * Marcar tour como completado
   */
  async markTourCompleted(tourType, userId) {
    try {
      // Primeiro, verificar se já existe um registro para o usuário
      const { data: existingRecord, error: fetchError } = await supabase
        .from('user_tours')
        .select('id, completed_tours')
        .eq('user_id', userId)
        .maybeSingle(); // Usar maybeSingle em vez de single

      if (fetchError) {
        console.error('Erro ao buscar registro existente:', fetchError);
        return false;
      }

      const completedTours = existingRecord?.completed_tours || {};
      completedTours[tourType] = true;

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('user_tours')
          .update({
            completed_tours: completedTours,
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
            completed_tours: completedTours,
            last_tour_viewed: tourType,
            last_tour_at: new Date().toISOString()
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
  async getCompletedTours(userId) {
    try {
      const { data, error } = await supabase
        .from('user_tours')
        .select('completed_tours')
        .eq('user_id', userId)
        .maybeSingle(); // Usar maybeSingle em vez de single

      if (error) {
        console.error('Erro ao obter tours completados:', error);
        return {};
      }

      return data?.completed_tours || {};
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
