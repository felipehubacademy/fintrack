import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import LoadingLogo from '../components/ui/LoadingLogo';
import { useOrganization } from '../hooks/useOrganization';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState(null);
  const [onboardingOrg, setOnboardingOrg] = useState(null);

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // Verificar se precisa mostrar onboarding
      if (session?.user) {
        checkOnboardingStatus(session.user);
      }
    });

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        checkOnboardingStatus(session.user);
      } else {
        setShowOnboarding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (user) => {
    try {
      // Buscar usuário completo com organization_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        console.error('Erro ao buscar usuário:', userError);
        return;
      }

      const organization = userData.organizations;

      if (!organization) {
        // Se não tem organização, não mostrar onboarding ainda
        return;
      }

      // Verificar progresso do onboarding
      const { data: progressData, error: progressError } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Erro ao buscar progresso:', progressError);
        return;
      }

      // Mostrar onboarding se:
      // 1. Não tem progresso ainda
      // 2. Tem progresso mas não está completo e não foi pulado
      const shouldShow = !progressData || (!progressData.is_completed && !progressData.skipped);

      if (shouldShow) {
        setOnboardingUser(user);
        setOnboardingOrg(organization);
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Erro ao verificar onboarding:', error);
    }
  };

  if (loading) {
    return (
      <LoadingLogo 
        size="large" 
        message="Carregando MeuAzulão..." 
        fullScreen={true} 
      />
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            presentation: 'card',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        >
          {session ? (
            <Stack.Screen name="Main" component={MainTabNavigator} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Onboarding Modal */}
      {showOnboarding && onboardingUser && onboardingOrg && (
        <OnboardingModal
          visible={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          user={onboardingUser}
          organization={onboardingOrg}
        />
      )}
    </>
  );
}

