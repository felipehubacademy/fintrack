import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../../../../lib/supabaseClient';
import LoadingLogo from '../../../../../../components/LoadingLogo';
import OnboardingStepPage from '../../../../../onboarding/[step]';
import { useI18n } from '../../../../../../contexts/I18nContext';

export default function DynamicOnboardingStepPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { orgId, userId, step } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orgId && userId && step) {
      validateAccess();
    }
  }, [orgId, userId, step]);

  const validateAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário está autenticado
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setError(t('web.shared.youReNotSignedIn'));
        router.push('/');
        return;
      }

      // Verificar se o userId da URL corresponde ao usuário autenticado
      if (authUser.id !== userId) {
        setError(t('web.onboardingStep.accessDenied'));
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
        setError(t('web.onboardingStep.youReNotPartOf'));
        router.push('/');
        return;
      }

      // Se chegou até aqui, renderizar o onboarding diretamente
      setLoading(false);

    } catch (error) {
      console.error('❌ Erro ao validar acesso:', error);
      setError(t('web.onboardingStep.couldnTCheckYourAccess'));
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('web.onboardingStep.error')}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('web.shared.backToHome2')}
          </button>
        </div>
      </div>
    );
  }

  return <OnboardingStepPage />;
}