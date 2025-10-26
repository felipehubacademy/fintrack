import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useOrganization() {
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [isSoloUser, setIsSoloUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar usuário atual
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      console.log('🔍 [useOrganization] currentUser:', currentUser?.email || 'Nenhum usuário');
      if (authError) throw authError;
      if (!currentUser) {
        console.log('❌ [useOrganization] Usuário não autenticado');
        setError('Usuário não autenticado');
        return;
      }

      // Buscar o usuário da nossa tabela por e-mail (mais confiável)
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', currentUser.email)
        .maybeSingle();

      console.log('🔍 [useOrganization] userRow:', userRow ? 'Encontrado' : 'Não encontrado');
      if (userRow) {
        console.log('🔍 [useOrganization] organization_id:', userRow.organization_id);
        console.log('🔍 [useOrganization] user id (db):', userRow.id);
        console.log('🔍 [useOrganization] user id (auth):', currentUser.id);
      }

      if (userErr) {
        console.error('❌ [useOrganization] Erro ao buscar usuário:', userErr);
        throw userErr;
      }
      
      if (!userRow) {
        console.log('❌ [useOrganization] Usuário não encontrado');
        setError('Usuário não encontrado. Por favor, faça login novamente.');
        return;
      }
      
      if (!userRow.organization_id) {
        console.log('❌ [useOrganization] Usuário sem organização');
        setError('Organização não encontrada. Você precisa ser convidado para uma organização.');
        return;
      }

      setUser(userRow);

      // Buscar organização
      const { data: orgRow, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userRow.organization_id)
        .single();
      
      if (orgError) throw orgError;
      setOrganization(orgRow || null);

      // Buscar centros de custo
      const { data: centers, error: centersError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', userRow.organization_id)
        .order('name');
      
      if (centersError) throw centersError;
      setCostCenters(centers || []);
      
      // Verificar se é conta solo pela coluna type OU pela contagem de cost centers
      // Prioridade: coluna type > contagem de cost centers
      let solo = false;
      if (orgRow?.type === 'solo') {
        solo = true;
      } else if (orgRow?.type === 'family') {
        solo = false;
      } else {
        // Fallback: contar cost centers vinculados a usuários
        const userCostCenters = (centers || []).filter(cc => cc.user_id);
        solo = userCostCenters.length === 1;
      }
      
      setIsSoloUser(solo);

      // Buscar categorias
      const { data: categories, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', userRow.organization_id)
        .order('name');
      
      if (categoriesError) throw categoriesError;
      setBudgetCategories(categories || []);

      // Buscar categorias de entrada (globais)
      const { data: incomeCats, error: incomeCatsError } = await supabase
        .from('income_categories')
        .select('*')
        .order('display_order');
      
      if (incomeCatsError) throw incomeCatsError;
      setIncomeCategories(incomeCats || []);

    } catch (error) {
      console.error('Erro ao buscar dados da organização:', error);
      setError(error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchOrganizationData();
  };

  return {
    organization,
    user,
    costCenters,
    budgetCategories,
    incomeCategories,
    isSoloUser,
    loading,
    error,
    refreshData
  };
}
