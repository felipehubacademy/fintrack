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

      if (userRow) {
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

      // Buscar categorias da ORG + GLOBAIS (expense)
      const [orgExpenses, globalExpenses] = await Promise.all([
        supabase
          .from('budget_categories')
          .select('*')
          .eq('organization_id', userRow.organization_id)
          .or('type.eq.expense,type.eq.both')
          .order('name'),
        supabase
          .from('budget_categories')
          .select('*')
          .is('organization_id', null)
          .or('type.eq.expense,type.eq.both')
          .order('name')
      ]);
      
      if (orgExpenses.error) throw orgExpenses.error;
      if (globalExpenses.error) throw globalExpenses.error;
      
      // Combinar categorias da org + globais (sem duplicatas)
      const orgExpensesList = orgExpenses.data || [];
      const globalExpensesList = globalExpenses.data || [];
      const orgExpensesNames = new Set(orgExpensesList.map(c => c.name));
      const uniqueGlobalExpenses = globalExpensesList.filter(cat => !orgExpensesNames.has(cat.name));
      setBudgetCategories([...orgExpensesList, ...uniqueGlobalExpenses]);

      // Buscar categorias da ORG + GLOBAIS (income)
      const [orgIncomes, globalIncomes] = await Promise.all([
        supabase
          .from('budget_categories')
          .select('*')
          .eq('organization_id', userRow.organization_id)
          .or('type.eq.income,type.eq.both')
          .order('name'),
        supabase
          .from('budget_categories')
          .select('*')
          .is('organization_id', null)
          .or('type.eq.income,type.eq.both')
          .order('name')
      ]);
      
      if (orgIncomes.error) throw orgIncomes.error;
      if (globalIncomes.error) throw globalIncomes.error;
      
      // Combinar categorias da org + globais (sem duplicatas)
      const orgIncomesList = orgIncomes.data || [];
      const globalIncomesList = globalIncomes.data || [];
      const orgIncomesNames = new Set(orgIncomesList.map(c => c.name));
      const uniqueGlobalIncomes = globalIncomesList.filter(cat => !orgIncomesNames.has(cat.name));
      setIncomeCategories([...orgIncomesList, ...uniqueGlobalIncomes]);

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
