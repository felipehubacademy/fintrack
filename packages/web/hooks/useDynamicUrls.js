import { useRouter } from 'next/router';
import { useOrganization } from './useOrganization';
import { useEffect, useState } from 'react';

export function useDynamicUrls() {
  const router = useRouter();
  const { organization, user, loading } = useOrganization();
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [validationError, setValidationError] = useState(null);

  // Validar se os parâmetros da URL correspondem ao usuário autenticado
  useEffect(() => {
    if (!loading && organization && user) {
      const { orgId, userId } = router.query;
      
      // Se a URL tem parâmetros dinâmicos, validar
      if (orgId && userId) {
        const isOrgValid = orgId === organization.id;
        // Usar o ID da tabela users (onde estão os dados)
        const isUserValid = userId === user.id;
        
        if (!isOrgValid || !isUserValid) {
          setIsValidUrl(false);
          setValidationError({
            expected: { orgId: organization.id, userId: user.id },
            received: { orgId, userId }
          });
          
          console.warn('⚠️ [useDynamicUrls] URL com parâmetros diferentes:', {
            expected: { orgId: organization.id, userId: user.id },
            received: { orgId, userId }
          });
          
          // Redirecionar para a URL correta usando ID da tabela users
          const correctPath = router.pathname
            .replace('[orgId]', organization.id)
            .replace('[userId]', user.id);
          
          console.log('🔄 [useDynamicUrls] Redirecionando para:', correctPath);
          router.replace(correctPath);
        } else {
          setIsValidUrl(true);
          setValidationError(null);
        }
      }
    }
  }, [loading, organization, user, router.query]);

  const getDynamicUrl = (path) => {
    if (loading || !organization || !user) {
      return path; // Fallback para URL original enquanto carrega
    }

    // Se o path já está no formato dinâmico, retornar como está
    if (path.includes('/org/') && path.includes('/user/')) {
      return path;
    }

    // Mapear paths antigos para dinâmicos
    const pathMappings = {
      '/dashboard': `/org/${organization.id}/user/${user.id}/dashboard`,
      '/dashboard/transactions': `/org/${organization.id}/user/${user.id}/dashboard/transactions`,
      '/dashboard/bank-accounts': `/org/${organization.id}/user/${user.id}/dashboard/bank-accounts`,
      '/dashboard/cards': `/org/${organization.id}/user/${user.id}/dashboard/cards`,
      '/dashboard/bills': `/org/${organization.id}/user/${user.id}/dashboard/bills`,
      '/dashboard/budgets': `/org/${organization.id}/user/${user.id}/dashboard/budgets`,
      '/dashboard/insights': `/org/${organization.id}/user/${user.id}/dashboard/insights`,
      '/dashboard/goals': `/org/${organization.id}/user/${user.id}/dashboard/goals`,
      '/dashboard/investments': `/org/${organization.id}/user/${user.id}/dashboard/investments`,
      '/dashboard/closing': `/org/${organization.id}/user/${user.id}/dashboard/closing`,
      '/dashboard/config': `/org/${organization.id}/user/${user.id}/dashboard/config`,
      '/onboarding/welcome': `/org/${organization.id}/user/${user.id}/onboarding/welcome`,
      '/onboarding/responsibles': `/org/${organization.id}/user/${user.id}/onboarding/responsibles`,
      '/onboarding/invite': `/org/${organization.id}/user/${user.id}/onboarding/invite`,
      '/onboarding/complete': `/org/${organization.id}/user/${user.id}/onboarding/complete`,
    };

    return pathMappings[path] || path;
  };

  // Função helper para verificar se um path requer autenticação
  const requiresAuth = (path) => {
    const protectedPaths = ['/dashboard', '/onboarding'];
    return protectedPaths.some(p => path.startsWith(p));
  };

  // Função helper para obter orgId e userId atuais
  const getCurrentIds = () => {
    if (loading || !organization || !user) {
      return { orgId: null, userId: null };
    }
    return { orgId: organization.id, userId: user.id };
  };

  return { 
    getDynamicUrl, 
    isValidUrl, 
    validationError,
    requiresAuth,
    getCurrentIds,
    loading,
    organization,
    user
  };
}
