import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import { shouldShowOnboarding } from '../components/onboarding/onboardingState';
import LoadingLogo from '../components/ui/LoadingLogo';
import { useI18n } from '../contexts/I18nContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { t } = useI18n();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(null); // { user, organization } | null

  // Onboarding happens on WhatsApp (plan 3.1). The in-app modal is a short,
  // always-dismissible hello; any failure here simply skips it.
  const checkOnboardingStatus = useCallback(async (user) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single();
      if (userError || !userData?.organizations) return;

      const organization = userData.organizations;
      const { data: progress, error: progressError } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (progressError) return;

      if (shouldShowOnboarding(progress)) {
        setOnboarding({ user, organization });
      }
    } catch (error) {
      // Never block the app behind onboarding.
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        const current = data?.session ?? null;
        setSession(current);
        if (current?.user) checkOnboardingStatus(current.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (!next?.user) {
        setOnboarding(null);
      } else if (event === 'SIGNED_IN') {
        checkOnboardingStatus(next.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkOnboardingStatus]);

  if (loading) {
    return <LoadingLogo size="large" message={t('navigation.loading')} fullScreen />;
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
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen
                name="AddTransaction"
                component={AddTransactionScreen}
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {session && onboarding && (
        <OnboardingModal
          visible
          onClose={() => setOnboarding(null)}
          user={onboarding.user}
          organization={onboarding.organization}
        />
      )}
    </>
  );
}
