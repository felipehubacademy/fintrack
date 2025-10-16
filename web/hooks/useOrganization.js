import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useOrganization() {
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setError('Usuário não autenticado');
        return;
      }

      // Buscar o usuário da nossa tabela por e-mail (mapeamento V2)
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', currentUser.email)
        .maybeSingle();

      if (userErr) throw userErr;
      if (!userRow?.organization_id) {
        setError('Organização não encontrada. Você precisa ser convidado para uma organização.');
        return;
      }

      setUser(userRow);

      // Buscar organização
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userRow.organization_id)
        .single();
      setOrganization(orgRow || null);

      // Buscar centros de custo
      const { data: centers } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', userRow.organization_id)
        .order('name');
      setCostCenters(centers || []);

      // Buscar categorias
      const { data: categories } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', userRow.organization_id)
        .order('name');
      setBudgetCategories(categories || []);

    } catch (error) {
      console.error('Erro ao buscar dados da organização:', error);
      setError(error.message);
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
    loading,
    error,
    refreshData
  };
}
