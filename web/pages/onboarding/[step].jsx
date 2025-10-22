import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import OnboardingModal from '../../components/onboarding/OnboardingModal';
import LoadingLogo from '../../components/LoadingLogo';

export default function OnboardingStepPage() {
  const router = useRouter();
  const { step } = router.query;
  const { organization, user, loading: orgLoading, error: orgError } = useOrganization();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orgLoading && !orgError && organization && user) {
      // Check if user needs onboarding
      checkOnboardingStatus();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, user, router]);

  const checkOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar onboarding:', error);
        router.push('/dashboard');
        return;
      }

      // If onboarding is completed, redirect to dashboard
      if (data && data.is_completed) {
        router.push('/dashboard');
        return;
      }

      // Show onboarding modal
      setShowModal(true);
    } catch (error) {
      console.error('❌ Erro ao verificar status do onboarding:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    router.push('/dashboard');
  };

  if (isLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <OnboardingModal
        isOpen={showModal}
        onClose={handleClose}
        user={user}
        organization={organization}
      />
    </>
  );
}
