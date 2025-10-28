import { useMemo } from 'react';

export function usePrivacyFilter(organization, user, costCenters) {
  const filterByPrivacy = (data) => {
    if (!user || !costCenters) return data;
    
    return data.filter(item => {
      // Se for compartilhado/da org: todos veem
      if (item.split || item.is_shared) return true;
      
      // Se for individual: só o dono vê
      const userCostCenter = costCenters.find(cc => cc.user_id === user.id);
      const shouldShow = item.cost_center_id === userCostCenter?.id || !item.cost_center_id;
      
      console.log('🔍 [PRIVACY] Filtering expense:', {
        expenseId: item.id,
        expenseOwner: item.owner,
        expenseCostCenterId: item.cost_center_id,
        userCostCenterId: userCostCenter?.id,
        shouldShow
      });
      
      return shouldShow;
    });
  };
  
  const getOwnerLabel = (costCenterId) => {
    if (!costCenterId) return organization?.name || 'Organização';
    
    const costCenter = costCenters.find(cc => cc.id === costCenterId);
    if (!costCenter) return organization?.name || 'Organização';
    
    // Se for cost_center sem user_id, é da organização
    if (!costCenter.user_id) return organization?.name || 'Organização';
    
    // Se for cost_center com user_id, retorna nome do usuário
    return costCenter.name;
  };
  
  const getOrgLabel = useMemo(() => {
    return () => organization?.name || 'Organização';
  }, [organization?.name]);
  
  return { filterByPrivacy, getOwnerLabel, getOrgLabel };
}

