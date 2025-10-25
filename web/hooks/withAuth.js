import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import LoadingLogo from '../components/LoadingLogo';

/**
 * HOC para proteção de páginas com URLs dinâmicas
 * Valida autenticação, orgId e userId antes de renderizar a página
 * 
 * @param {Component} WrappedComponent - Componente a ser protegido
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.requiresDynamicUrl - Se a página requer orgId/userId na URL
 * @param {string} options.redirectTo - URL de redirecionamento em caso de falha
 */
export function withAuth(WrappedComponent, options = {}) {
  const {
    requiresDynamicUrl = true,
    redirectTo = '/login'
  } = options;

  return function AuthenticatedComponent(props) {
    const router = useRouter();
    const { orgId, userId } = router.query;
    const [isValidating, setIsValidating] = useState(true);
    const [validationError, setValidationError] = useState(null);

    useEffect(() => {
      validateAccess();
    }, [orgId, userId]);

    const validateAccess = async () => {
      try {
        setIsValidating(true);
        setValidationError(null);

        // 1. Verificar se o usuário está autenticado
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.warn('🚨 [withAuth] Usuário não autenticado');
          router.push(`${redirectTo}?redirect=${router.asPath}`);
          return;
        }

        // 2. Se a página requer URL dinâmica, validar parâmetros
        if (requiresDynamicUrl) {
          if (!orgId || !userId) {
            console.warn('🚨 [withAuth] Parâmetros orgId/userId ausentes na URL');
            
            // Buscar dados do usuário para construir URL correta
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('organization_id')
              .eq('id', authUser.id)
              .single();

            if (userError || !userData?.organization_id) {
              console.error('🚨 [withAuth] Erro ao buscar dados do usuário:', userError);
              router.push('/');
              return;
            }

            // Redirecionar para URL com parâmetros corretos
            const correctPath = router.pathname
              .replace('[orgId]', userData.organization_id)
              .replace('[userId]', authUser.id);
            
            router.replace(correctPath);
            return;
          }

          // 3. Buscar dados do usuário por email
          const { data: userDataByEmail } = await supabase
            .from('users')
            .select('id, organization_id')
            .eq('email', authUser.email)
            .maybeSingle();

          // CRÍTICO: Verificar se userId da URL corresponde ao usuário
          // Aceitar tanto o ID do auth quanto o ID da tabela users
          const isValidUserId = userId === authUser.id || 
                               (userDataByEmail && userId === userDataByEmail.id);

          if (!isValidUserId) {
            console.error('🚨 [withAuth] Tentativa de acesso com userId diferente:', {
              authenticatedUser: authUser.id,
              dbUserId: userDataByEmail?.id,
              urlUser: userId,
              path: router.asPath
            });

            if (userDataByEmail?.organization_id) {
              // Redirecionar para a URL correta do usuário
              const correctPath = router.pathname
                .replace('[orgId]', userDataByEmail.organization_id)
                .replace('[userId]', userDataByEmail.id);
              
              router.replace(correctPath);
              return;
            }

            router.push('/');
            return;
          }

          // 4. Verificar se o usuário pertence à organização da URL
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('organization_id, is_active')
            .eq('id', userId)
            .eq('organization_id', orgId)
            .single();

          if (userError || !userData) {
            console.error('🚨 [withAuth] Usuário não pertence à organização:', {
              userId,
              orgId,
              error: userError
            });

            // Buscar a organização correta do usuário
            const { data: correctUserData } = await supabase
              .from('users')
              .select('organization_id')
              .eq('id', authUser.id)
              .single();

            if (correctUserData?.organization_id) {
              const correctPath = router.pathname
                .replace('[orgId]', correctUserData.organization_id)
                .replace('[userId]', authUser.id);
              
              router.replace(correctPath);
              return;
            }

            router.push('/');
            return;
          }

          // 5. Verificar se o usuário está ativo
          if (!userData.is_active) {
            console.warn('🚨 [withAuth] Usuário inativo:', userId);
            setValidationError('Sua conta está inativa. Entre em contato com o administrador.');
            return;
          }

          console.log('✅ [withAuth] Validação bem-sucedida:', {
            userId,
            orgId,
            path: router.asPath
          });
        }

        // Tudo OK - permitir acesso
        setIsValidating(false);

      } catch (error) {
        console.error('🚨 [withAuth] Erro na validação:', error);
        setValidationError('Erro ao validar acesso. Tente novamente.');
        setIsValidating(false);
      }
    };

    // Mostrar loading enquanto valida
    if (isValidating) {
      return <LoadingLogo />;
    }

    // Mostrar erro se houver
    if (validationError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-600 mb-6">{validationError}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }

    // Renderizar componente protegido
    return <WrappedComponent {...props} />;
  };
}

export default withAuth;

