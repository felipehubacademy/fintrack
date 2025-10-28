import { useMemo } from 'react';

export function usePrivacyFilter(organization, user, costCenters) {
  const filterByPrivacy = (data) => {
    if (!user || !costCenters) return data;
    
    return data.filter(item => {
      // Se for compartilhado/da org: todos veem
      if (item.split || item.is_shared) return true;
      
      // Se for individual: só o dono vê (só passa se tiver cost_center_id E for do usuário)
      if (!item.cost_center_id) {
        console.log('🚫 [FILTER] Item sem cost_center_id:', item.id);
        return false;
      }
      
      const userCostCenter = costCenters.find(cc => cc.user_id === user.id);
      const isVisible = item.cost_center_id === userCostCenter?.id;
      
      if (!isVisible) {
        console.log('🚫 [FILTER] Item ocultado:', {
          item_id: item.id,
          item_cost_center_id: item.cost_center_id,
          user_cost_center_id: userCostCenter?.id,
          user_id: user.id,
          cost_centers: costCenters.map(cc => ({ id: cc.id, name: cc.name, user_id: cc.user_id }))
        });
      }
      
      return isVisible;
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

