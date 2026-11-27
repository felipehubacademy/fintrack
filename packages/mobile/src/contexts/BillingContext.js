import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { addCustomerInfoListener } from '../services/billing';
import { createBillingController } from '../services/billingController';
import { PaywallModal } from '../components/billing/PaywallModal';
import { BillingContext } from '../hooks/useBilling';

async function organizationIdFor(user) {
  if (!supabase || !user) return null;
  try {
    const byId = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle();
    if (byId?.data?.organization_id) return byId.data.organization_id;
    if (!user.email) return null;
    const byEmail = await supabase.from('users').select('organization_id').eq('email', user.email).maybeSingle();
    return byEmail?.data?.organization_id || null;
  } catch (_) {
    return null;
  }
}

/**
 * App-wide billing state (useBilling) and the paywall. Follows the Supabase
 * session: RevenueCat logIn with the organization id after login, logOut on
 * sign-out. Mounted once in App.js.
 */
export function BillingProvider({ children }) {
  const controllerRef = useRef(null);
  if (!controllerRef.current) controllerRef.current = createBillingController({ supabase });
  const controller = controllerRef.current;

  const [state, setState] = useState(controller.getState());
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => controller.subscribe(setState), [controller]);

  // Session -> organization -> RevenueCat user.
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const follow = async (user) => {
      if (!user) {
        setPaywallVisible(false);
        await controller.signOut();
        return;
      }
      const orgId = await organizationIdFor(user);
      if (active) await controller.setOrganization(orgId);
    };

    supabase.auth.getSession()
      .then(({ data }) => follow(data?.session?.user || null))
      .catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      follow(next?.user || null).catch(() => {});
    });
    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, [controller]);

  // Renewals and purchases made elsewhere.
  useEffect(() => addCustomerInfoListener((info) => controller.handleCustomerInfo(info)), [controller, state.organizationId]);

  // Back to the foreground: the trial may have ended or the webhook landed.
  useEffect(() => {
    const sub = AppState.addEventListener?.('change', (next) => {
      if (next === 'active') controller.refresh().catch(() => {});
    });
    return () => sub?.remove?.();
  }, [controller]);

  // Close the paywall once access is granted.
  useEffect(() => {
    if (paywallVisible && state.isPlus) setPaywallVisible(false);
  }, [paywallVisible, state.isPlus]);

  const showPaywall = useCallback(() => setPaywallVisible(true), []);
  const hidePaywall = useCallback(() => setPaywallVisible(false), []);

  // Runs `action` when the user may add things; otherwise opens the paywall.
  const requireAccess = useCallback((action) => {
    if (controller.getState().gated) {
      setPaywallVisible(true);
      return false;
    }
    if (typeof action === 'function') action();
    return true;
  }, [controller]);

  const value = useMemo(() => ({
    ...state,
    purchase: controller.purchase,
    restore: controller.restore,
    refresh: controller.refresh,
    showPaywall,
    hidePaywall,
    requireAccess,
    paywallVisible,
  }), [state, controller, showPaywall, hidePaywall, requireAccess, paywallVisible]);

  return (
    <BillingContext.Provider value={value}>
      {children}
      <PaywallModal visible={paywallVisible} onClose={hidePaywall} />
    </BillingContext.Provider>
  );
}
