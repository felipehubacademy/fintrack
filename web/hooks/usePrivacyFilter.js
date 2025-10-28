import { useMemo } from 'react';

export function usePrivacyFilter(organization, user, costCenters) {
  const filterByPrivacy = (data) => {
    if (!user || !costCenters) return data;
    
    return data.filter(item => {
      // Se for compartilhado/da org: todos veem
      if (item.split || item.is_shared) return true;
      
      // Se for individual: só o dono vê (só passa se tiver cost_center_id E for do usuário)
      if (!item.cost_center_id) return false;
      
      const userCostCenter = costCenters.find(cc => cc.user_id === user.id);
      return item.cost_center_id === userCostCenter?.id;
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

