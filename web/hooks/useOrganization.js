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

      // Buscar dados do usuário na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          organizations(*)
        `)
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        setError('Usuário não encontrado na organização');
        return;
      }

      setUser(userData);

      if (userData.organizations) {
        setOrganization(userData.organizations);
        
        // Buscar centros de custo
        const { data: centers, error: centersError } = await supabase
          .from('cost_centers')
          .select('*')
          .eq('organization_id', userData.organizations.id)
          .order('name');

        if (centersError) {
          console.error('Erro ao buscar centros de custo:', centersError);
        } else {
          setCostCenters(centers || []);
        }

        // Buscar categorias de orçamento
        const { data: categories, error: categoriesError } = await supabase
          .from('budget_categories')
          .select('*')
          .eq('organization_id', userData.organizations.id)
          .order('name');

        if (categoriesError) {
          console.error('Erro ao buscar categorias:', categoriesError);
        } else {
          setBudgetCategories(categories || []);
        }
      }

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
