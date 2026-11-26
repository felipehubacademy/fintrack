import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useOrganization() {
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSoloUser, setIsSoloUser] = useState(false);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current auth user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Not authenticated');
      }

      // 2. Get user row from users table (by email - more reliable)
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', currentUser.email)
        .maybeSingle();

      if (userError) {
        console.error('Error loading user:', userError);
        throw userError;
      }

      if (!userRow) {
        throw new Error('User not found in the database');
      }

      if (!userRow.organization_id) {
        throw new Error('User has no organization');
      }

      // Merge auth user data with DB user data
      setUser({ ...currentUser, ...userRow });

      // 3. Get organization
      const { data: orgRow, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userRow.organization_id)
        .single();

      if (orgError) {
        console.error('Error loading organization:', orgError);
        throw orgError;
      }

      setOrganization(orgRow);
      setIsSoloUser(orgRow.type === 'solo');

      // Buscar centros de custo
      const { data: centers, error: centersError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', userRow.organization_id)
        .order('name');
      
      if (centersError) {
        console.error('Error loading cost centers:', centersError);
        throw centersError;
      }
      setCostCenters(centers || []);

      // Buscar categorias de orçamento
      const { data: categories, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`organization_id.eq.${userRow.organization_id},organization_id.is.null`)
        .order('name');
      
      if (categoriesError) {
        console.error('Error loading budget categories:', categoriesError);
      } else {
        setBudgetCategories(categories || []);
      }

    } catch (err) {
      console.error('Error loading organization:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    organization,
    user,
    costCenters,
    budgetCategories,
    loading,
    error,
    isSoloUser,
    refetch: loadOrganization,
  };
}

