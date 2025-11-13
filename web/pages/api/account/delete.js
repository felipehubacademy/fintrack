/**
 * API: Delete Account (Solo)
 * Executa limpeza completa via function delete_solo_account
 */

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { organizationId, userId } = req.body ?? {};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId é obrigatório' });
    }

    const { data, error } = await supabaseAdmin.rpc('delete_solo_account', {
      p_organization_id: organizationId,
      p_user_id: userId ?? null
    });

    if (error) {
      console.error('❌ [API] Erro ao executar delete_solo_account:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao excluir dados da organização',
        details: error.message
      });
    }

    if (userId) {
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.warn('⚠️ [API] Falha ao remover usuário do Auth:', authError);
        }
      } catch (authErr) {
        console.warn('⚠️ [API] Método deleteUser não disponível:', authErr);
      }
    }

    return res.status(200).json({
      success: true,
      result: data
    });
  } catch (err) {
    console.error('❌ [API] Erro inesperado ao excluir conta:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: err.message
    });
  }
}



