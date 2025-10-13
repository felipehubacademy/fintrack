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

      // FALLBACK: Se tabelas V2 não existem, usar dados mock
      try {
        // Tentar buscar dados do usuário na tabela users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            *,
            organizations(*)
          `)
          .eq('id', currentUser.id)
          .single();

        if (!userError && userData?.organizations) {
          // V2: Usar dados reais da organização
          setUser(userData);
          setOrganization(userData.organizations);
          
          // Buscar centros de custo
          const { data: centers } = await supabase
            .from('cost_centers')
            .select('*')
            .eq('organization_id', userData.organizations.id)
            .order('name');

          setCostCenters(centers || []);

          // Buscar categorias de orçamento
          const { data: categories } = await supabase
            .from('budget_categories')
            .select('*')
            .eq('organization_id', userData.organizations.id)
            .order('name');

          setBudgetCategories(categories || []);
        } else {
          throw new Error('V2 tables not found, using fallback');
        }
      } catch (v2Error) {
        console.log('V2 não disponível, usando fallback para V1:', v2Error.message);
        
        // FALLBACK V1: Usar dados mock
        const mockUser = {
          id: currentUser.id,
          name: 'Usuário',
          email: currentUser.email,
          role: 'admin'
        };
        
        const mockOrganization = {
          id: 'default-org',
          name: 'FinTrack'
        };
        
        const mockCostCenters = [
          { name: 'Felipe', type: 'individual', color: '#3B82F6' },
          { name: 'Leticia', type: 'individual', color: '#EC4899' },
          { name: 'Compartilhado', type: 'shared', color: '#8B5CF6', split_percentage: 50 }
        ];
        
        const mockCategories = [
          'Alimentação', 'Transporte', 'Saúde', 'Lazer',
          'Contas', 'Casa', 'Educação', 'Investimentos', 'Outros'
        ];

        setUser(mockUser);
        setOrganization(mockOrganization);
        setCostCenters(mockCostCenters);
        setBudgetCategories(mockCategories);
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
