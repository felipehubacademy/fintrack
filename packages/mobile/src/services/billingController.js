/**
 * Billing state machine behind useBilling(). Plain JS (no React) so the
 * logic is unit-tested with the SDK mocked.
 *
 * setOrganization(id) after login -> Supabase columns + RevenueCat logIn,
 * customerInfo and offerings. signOut() -> RevenueCat logOut and a reset.
 */
import { isFeatureEnabled } from '@fintrack/shared/config';
import * as service from './billing';

const INITIAL = {
  loading: false,
  organizationId: null,
  org: null,
  customerInfo: null,
  offerings: null,
  packages: { monthly: null, annual: null, winback: null },
  purchasesAvailable: false,
  purchasing: false,
  restoring: false,
};

export function createBillingController({
  supabase,
  billing = service,
  isPaywallEnabled = () => isFeatureEnabled('paywall'),
  now = () => new Date(),
} = {}) {
  let raw = { ...INITIAL };
  let state = derive(raw);
  const listeners = new Set();
  let generation = 0; // ignores results from a previous organization

  function derive(r) {
    const combined = billing.combineBillingState({
      org: r.org,
      customerInfo: r.customerInfo,
      paywallEnabled: isPaywallEnabled(),
      now: now(),
    });
    const winbackOffer = combined.status === 'expired' && r.packages.winback ? r.packages.winback : null;
    return { ...r, ...combined, winbackOffer };
  }

  function set(patch) {
    raw = { ...raw, ...patch };
    state = derive(raw);
    listeners.forEach((l) => l(state));
  }

  async function loadOfferings(gen) {
    try {
      const offerings = await billing.getOfferings();
      if (gen !== generation) return;
      set({ offerings, packages: billing.pickPackages(offerings) });
    } catch (_) {
      // Paywall falls back to the shared price table.
    }
  }

  async function setOrganization(organizationId) {
    if (!organizationId) return signOut();
    if (organizationId === raw.organizationId && raw.org) return refresh();
    generation += 1;
    const gen = generation;
    set({ ...INITIAL, loading: true, organizationId, purchasesAvailable: billing.isPurchasesAvailable() });

    const [org, customerInfo] = await Promise.all([
      billing.fetchOrganizationBilling(supabase, organizationId),
      billing.identifyOrganization(organizationId).catch(() => null),
    ]);
    if (gen !== generation) return state;
    set({ org, customerInfo, loading: false });
    await loadOfferings(gen);
    return state;
  }

  async function refresh() {
    const { organizationId } = raw;
    if (!organizationId) return state;
    const gen = generation;
    const [org, customerInfo] = await Promise.all([
      billing.fetchOrganizationBilling(supabase, organizationId),
      billing.getCustomerInfo().catch(() => raw.customerInfo),
    ]);
    if (gen !== generation) return state;
    set({ org, customerInfo: customerInfo ?? raw.customerInfo });
    if (!raw.offerings) await loadOfferings(gen);
    return state;
  }

  async function signOut() {
    generation += 1;
    const wasSignedIn = Boolean(raw.organizationId);
    set({ ...INITIAL });
    if (wasSignedIn) await billing.resetPurchasesUser();
    return state;
  }

  function handleCustomerInfo(customerInfo) {
    if (!raw.organizationId || !customerInfo) return;
    set({ customerInfo });
  }

  /**
   * @returns {Promise<{ ok: boolean, cancelled?: boolean, error?: Error }>}
   */
  async function purchase(pkg, { winback = false } = {}) {
    if (raw.purchasing) return { ok: false };
    set({ purchasing: true });
    try {
      const customerInfo = await billing.purchasePackage(pkg, { winback });
      set({ customerInfo, purchasing: false });
      // The webhook updates plus_until on the server; read it in the background.
      refresh().catch(() => {});
      return { ok: billing.hasPlusEntitlement(customerInfo) || state.hasAccess };
    } catch (error) {
      set({ purchasing: false });
      if (error?.userCancelled) return { ok: false, cancelled: true };
      return { ok: false, error };
    }
  }

  /** @returns {Promise<{ ok: boolean, restored?: boolean, error?: Error }>} */
  async function restore() {
    if (raw.restoring) return { ok: false };
    set({ restoring: true });
    try {
      const customerInfo = await billing.restorePurchases();
      set({ customerInfo, restoring: false });
      return { ok: true, restored: billing.hasPlusEntitlement(customerInfo) };
    } catch (error) {
      set({ restoring: false });
      return { ok: false, error };
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Recompute derived fields (e.g. the trial ran out while the app was open). */
    recompute: () => set({}),
    setOrganization,
    refresh,
    signOut,
    handleCustomerInfo,
    purchase,
    restore,
  };
}
