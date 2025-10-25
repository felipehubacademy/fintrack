import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../../lib/supabaseClient';
import LoadingLogo from '../../../../components/LoadingLogo';

export default function DynamicDashboard() {
  const router = useRouter();
  const { orgId, userId } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orgId && userId) {
      validateAccess();
    }
  }, [orgId, userId]);

  const validateAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário está autenticado
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setError('Usuário não autenticado');
        router.push('/');
        return;
      }

      // Verificar se o userId da URL corresponde ao usuário autenticado
      if (authUser.id !== userId) {
        setError('Acesso negado: usuário não autorizado');
        router.push('/');
        return;
      }

      // Verificar se o usuário pertence à organização
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .eq('organization_id', orgId)
        .single();

      if (userError || !userData) {
        setError('Usuário não encontrado nesta organização');
        router.push('/');
        return;
      }

      // Se chegou até aqui, redirecionar para o dashboard normal
      // O dashboard normal já tem toda a lógica de onboarding, useOrganization, etc.
      router.replace('/dashboard');

    } catch (error) {
      console.error('❌ Erro ao validar acesso:', error);
      setError('Erro ao validar acesso');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingLogo />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return <LoadingLogo />;
}