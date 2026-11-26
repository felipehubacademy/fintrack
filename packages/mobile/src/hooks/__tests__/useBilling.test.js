// State logic behind useBilling(): Supabase org columns + RevenueCat
// entitlement, SDK session (configure / logIn / logOut), offerings, purchase
// and restore. react-native-purchases is mocked (__mocks__/).

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-12-10T12:00:00Z');
const iso = (days) => new Date(NOW.getTime() + days * DAY).toISOString();

function fakeSupabase(row, { error = null } = {}) {
  const calls = [];
  const chain = {
    select: (cols) => { calls.push(['select', cols]); return chain; },
    eq: (col, val) => { calls.push(['eq', col, val]); return chain; },
    maybeSingle: async () => ({ data: error ? null : row, error }),
  };
  return { from: jest.fn(() => chain), calls };
}

const plusInfo = (overrides = {}) => ({
  entitlements: {
    active: {
      plus: { identifier: 'plus', isActive: true, willRenew: true, store: 'APP_STORE', expirationDate: iso(30), ...overrides },
    },
    all: {},
  },
  managementURL: 'https://apps.apple.com/account/subscriptions',
});

const product = (id, price, priceString, extra = {}) => ({ identifier: id, price, priceString, currencyCode: 'BRL', ...extra });
const offerings = {
  current: null,
  all: {
    default: {
      identifier: 'default',
      monthly: { identifier: '$rc_monthly', product: product('meuazulao_plus_monthly', 9.9, 'R$ 9,90') },
      annual: { identifier: '$rc_annual', product: product('meuazulao_plus_annual', 79.9, 'R$ 79,90', { pricePerMonthString: 'R$ 6,66' }) },
      availablePackages: [],
    },
    winback: {
      identifier: 'winback',
      monthly: {
        identifier: '$rc_monthly',
        product: product('meuazulao_plus_monthly', 9.9, 'R$ 9,90', {
          discounts: [{ identifier: 'first_month_winback', price: 0.99, priceString: 'R$ 0,99' }],
        }),
      },
      availablePackages: [],
    },
  },
};

const formatMoney = (v, { currency } = {}) => `${currency} ${Number(v).toFixed(2)}`;

function load({ iosKey = 'appl_test_key' } = {}) {
  // Fresh registry per case; the service's lazy require of the SDK then
  // resolves to the same mock instance the test configures.
  jest.resetModules();
  if (iosKey) process.env.EXPO_PUBLIC_RC_IOS_KEY = iosKey;
  else delete process.env.EXPO_PUBLIC_RC_IOS_KEY;
  return {
    Purchases: require('react-native-purchases'),
    billing: require('../../services/billing'),
    controller: require('../../services/billingController'),
  };
}

function controllerWith(mods, row, opts = {}) {
  const supabase = fakeSupabase(row, opts);
  const c = mods.controller.createBillingController({
    supabase,
    now: () => NOW,
    isPaywallEnabled: () => opts.paywall !== false,
  });
  return { c, supabase };
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_RC_IOS_KEY;
  jest.clearAllMocks();
});

describe('combineBillingState', () => {
  const { billing } = load();

  it('is trial with days left from trial_ends_at', () => {
    const s = billing.combineBillingState({ org: { trialEndsAt: iso(2.5) }, now: NOW });
    expect(s).toMatchObject({ status: 'trial', hasAccess: true, gated: false, daysLeft: 3 });
  });

  it('treats missing columns as trial', () => {
    const s = billing.combineBillingState({ org: null, now: NOW });
    expect(s).toMatchObject({ status: 'trial', hasAccess: true, gated: false });
  });

  it('gates an expired trial only when the paywall flag is on', () => {
    const org = { trialEndsAt: iso(-1) };
    expect(billing.combineBillingState({ org, now: NOW })).toMatchObject({ status: 'expired', hasAccess: false, gated: true });
    expect(billing.combineBillingState({ org, now: NOW, paywallEnabled: false })).toMatchObject({ status: 'expired', gated: false });
  });

  it('grants access from the RevenueCat entitlement alone', () => {
    const s = billing.combineBillingState({ org: { trialEndsAt: iso(-3) }, customerInfo: plusInfo(), now: NOW });
    expect(s).toMatchObject({ status: 'active', isPlus: true, hasAccess: true, gated: false, source: 'app_store', willRenew: true });
    expect(s.renewsAt).toBe(iso(30));
  });

  it('grants access from plus_until alone (web or promotional)', () => {
    const s = billing.combineBillingState({ org: { trialEndsAt: iso(-3), plusUntil: iso(20), source: 'stripe' }, now: NOW });
    expect(s).toMatchObject({ status: 'active', isPlus: true, source: 'stripe', willRenew: null, renewsAt: iso(20) });
  });

  it('reports a cancelled store subscription as not renewing', () => {
    const s = billing.combineBillingState({ org: {}, customerInfo: plusInfo({ willRenew: false }), now: NOW });
    expect(s.willRenew).toBe(false);
  });
});

describe('offerings and prices', () => {
  const { billing } = load();

  it('picks monthly, annual and the win-back package', () => {
    const p = billing.pickPackages(offerings);
    expect(p.monthly.product.identifier).toBe('meuazulao_plus_monthly');
    expect(p.annual.product.identifier).toBe('meuazulao_plus_annual');
    expect(p.winback.product.discounts[0].identifier).toBe('first_month_winback');
  });

  it('finds packages by product id when package types are custom', () => {
    const p = billing.pickPackages({
      all: { default: { availablePackages: [{ product: { identifier: 'meuazulao_plus_annual:annual' } }] } },
    });
    expect(p.annual.product.identifier).toBe('meuazulao_plus_annual:annual');
    expect(p.monthly).toBeNull();
    expect(p.winback).toBeNull();
  });

  it('uses store price strings when offerings exist', () => {
    const prices = billing.paywallPrices({ packages: billing.pickPackages(offerings), currency: 'USD', formatMoney });
    expect(prices).toMatchObject({
      monthly: 'R$ 9,90', annual: 'R$ 79,90', annualPerMonth: 'R$ 6,66', winback: 'R$ 0,99', fromStore: true, currency: 'BRL',
    });
    expect(prices.savingsPercent).toBe(32);
  });

  it('falls back to the shared price table without offerings', () => {
    const prices = billing.paywallPrices({ packages: billing.pickPackages(null), currency: 'MXN', formatMoney });
    expect(prices).toMatchObject({ monthly: 'MXN 59.00', annual: 'MXN 449.00', winback: null, fromStore: false });
    const usd = billing.paywallPrices({ packages: billing.pickPackages(null), currency: 'ARS', formatMoney });
    expect(usd.monthly).toBe('USD 4.99');
  });
});

describe('billing controller (useBilling state)', () => {
  it('configures RevenueCat with the organization id, then logs in on org change and out on sign-out', async () => {
    const mods = load();
    const { Purchases } = mods;
    const { c } = controllerWith(mods, { trial_ends_at: iso(5), plus_until: null, plus_source: null });

    await c.setOrganization('org-1');
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_test_key', appUserID: 'org-1' });
    expect(c.getState()).toMatchObject({ organizationId: 'org-1', status: 'trial', daysLeft: 5, purchasesAvailable: true, loading: false });
    expect(c.getState().packages.monthly).toBeNull();

    await c.setOrganization('org-2');
    expect(Purchases.configure).toHaveBeenCalledTimes(1);
    expect(Purchases.logIn).toHaveBeenCalledWith('org-2');

    await c.signOut();
    expect(Purchases.logOut).toHaveBeenCalledTimes(1);
    expect(c.getState()).toMatchObject({ organizationId: null, status: 'trial', gated: false });
  });

  it('no-ops the SDK without a key and still reads Supabase', async () => {
    const mods = load({ iosKey: '' });
    const { Purchases } = mods;
    const { c } = controllerWith(mods, { trial_ends_at: iso(-2) });

    await c.setOrganization('org-1');
    expect(Purchases.configure).not.toHaveBeenCalled();
    expect(Purchases.getOfferings).not.toHaveBeenCalled();
    expect(c.getState()).toMatchObject({ status: 'expired', gated: true, purchasesAvailable: false, winbackOffer: null });

    const result = await c.purchase({ identifier: '$rc_monthly' });
    expect(result.ok).toBe(false);
    await c.signOut();
    expect(Purchases.logOut).not.toHaveBeenCalled();
  });

  it('treats a failed column query as trial (migration not run yet)', async () => {
    const mods = load();
    const { c } = controllerWith(mods, null, { error: { message: 'column organizations.trial_ends_at does not exist' } });
    await c.setOrganization('org-1');
    expect(c.getState()).toMatchObject({ status: 'trial', hasAccess: true, gated: false });
  });

  it('exposes the win-back offering only when expired', async () => {
    const mods = load();
    mods.Purchases.getOfferings.mockResolvedValue(offerings);

    const expired = controllerWith(mods, { trial_ends_at: iso(-1) }).c;
    await expired.setOrganization('org-1');
    expect(expired.getState().winbackOffer).toBe(offerings.all.winback.monthly);
    expect(expired.getState().packages.annual).toBe(offerings.all.default.annual);

    const trial = controllerWith(mods, { trial_ends_at: iso(1) }).c;
    await trial.setOrganization('org-1');
    expect(trial.getState().winbackOffer).toBeNull();
  });

  it('either source grants access: RevenueCat entitlement unlocks an expired org', async () => {
    const mods = load();
    mods.Purchases.getCustomerInfo.mockResolvedValue(plusInfo());
    const { c } = controllerWith(mods, { trial_ends_at: iso(-4) });
    await c.setOrganization('org-1');
    expect(c.getState()).toMatchObject({ status: 'active', isPlus: true, gated: false });
  });

  it('does not gate when the paywall flag is off', async () => {
    const mods = load();
    const { c } = controllerWith(mods, { trial_ends_at: iso(-4) }, { paywall: false });
    await c.setOrganization('org-1');
    expect(c.getState()).toMatchObject({ status: 'expired', hasAccess: false, gated: false });
  });

  it('purchase unlocks access and notifies subscribers', async () => {
    const mods = load();
    mods.Purchases.getOfferings.mockResolvedValue(offerings);
    const { c } = controllerWith(mods, { trial_ends_at: iso(-1) });
    await c.setOrganization('org-1');
    const seen = [];
    c.subscribe((s) => seen.push(s.status));

    mods.Purchases.purchasePackage.mockResolvedValue({ customerInfo: plusInfo() });
    const result = await c.purchase(c.getState().packages.annual);
    expect(mods.Purchases.purchasePackage).toHaveBeenCalledWith(offerings.all.default.annual);
    expect(result).toEqual({ ok: true });
    expect(c.getState()).toMatchObject({ status: 'active', gated: false, purchasing: false });
    expect(seen).toContain('active');
  });

  it('buys the win-back package with the iOS promotional offer', async () => {
    const mods = load();
    const promo = { identifier: 'first_month_winback', signature: 'sig' };
    mods.Purchases.getOfferings.mockResolvedValue(offerings);
    mods.Purchases.getPromotionalOffer.mockResolvedValue(promo);
    mods.Purchases.purchaseDiscountedPackage.mockResolvedValue({ customerInfo: plusInfo() });
    const { c } = controllerWith(mods, { trial_ends_at: iso(-1) });
    await c.setOrganization('org-1');

    const pkg = c.getState().winbackOffer;
    const result = await c.purchase(pkg, { winback: true });
    expect(mods.Purchases.getPromotionalOffer).toHaveBeenCalledWith(pkg.product, pkg.product.discounts[0]);
    expect(mods.Purchases.purchaseDiscountedPackage).toHaveBeenCalledWith(pkg, promo);
    expect(mods.Purchases.purchasePackage).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('reports a cancelled purchase without an error', async () => {
    const mods = load();
    mods.Purchases.getOfferings.mockResolvedValue(offerings);
    mods.Purchases.purchasePackage.mockRejectedValue(Object.assign(new Error('cancelled'), { userCancelled: true }));
    const { c } = controllerWith(mods, { trial_ends_at: iso(-1) });
    await c.setOrganization('org-1');
    const result = await c.purchase(c.getState().packages.monthly);
    expect(result).toEqual({ ok: false, cancelled: true });
    expect(c.getState()).toMatchObject({ purchasing: false, gated: true });
  });

  it('restore tells whether Plus came back', async () => {
    const mods = load();
    const { c } = controllerWith(mods, { trial_ends_at: iso(-1) });
    await c.setOrganization('org-1');

    expect(await c.restore()).toEqual({ ok: true, restored: false });
    mods.Purchases.restorePurchases.mockResolvedValue(plusInfo());
    expect(await c.restore()).toEqual({ ok: true, restored: true });
    expect(c.getState().isPlus).toBe(true);
  });

  it('applies CustomerInfo updates from the SDK listener', async () => {
    const mods = load();
    const { c } = controllerWith(mods, { trial_ends_at: iso(-1) });
    await c.setOrganization('org-1');
    c.handleCustomerInfo(plusInfo());
    expect(c.getState().hasAccess).toBe(true);
  });
});

describe('plan row and banner', () => {
  const { planStatusText, canManageInStore, bannerKind } = require('../../components/billing/planStatus');
  const t = (key, p) => (p ? `${key}:${JSON.stringify(p)}` : key);
  const formatDate = (v) => `D(${v})`;

  it('describes each status', () => {
    expect(planStatusText({ status: 'trial', daysLeft: 2 }, t, formatDate)).toBe('billing.plan.trial:{"count":2}');
    expect(planStatusText({ status: 'expired' }, t, formatDate)).toBe('billing.plan.expired');
    expect(planStatusText({ status: 'active', renewsAt: 'x', willRenew: true }, t, formatDate)).toBe('billing.plan.active:{"date":"D(x)"}');
    expect(planStatusText({ status: 'active', renewsAt: 'x', willRenew: false }, t, formatDate)).toBe('billing.plan.activeUntil:{"date":"D(x)"}');
    expect(planStatusText({ status: 'active', renewsAt: null }, t, formatDate)).toBe('billing.plan.activeNoDate');
  });

  it('offers store management only for store subscriptions', () => {
    expect(canManageInStore({ isPlus: true, source: 'app_store' })).toBe(true);
    expect(canManageInStore({ isPlus: true, source: 'stripe' })).toBe(false);
    expect(canManageInStore({ isPlus: false, source: 'play_store' })).toBe(false);
  });

  it('shows the banner in the last 3 trial days and always when expired', () => {
    expect(bannerKind({ status: 'trial', daysLeft: 4 })).toBeNull();
    expect(bannerKind({ status: 'trial', daysLeft: 3 })).toBe('trialEnding');
    expect(bannerKind({ status: 'trial', daysLeft: 1 })).toBe('trialEnding');
    expect(bannerKind({ status: 'expired', daysLeft: 0 })).toBe('expired');
    expect(bannerKind({ status: 'active', daysLeft: 0 })).toBeNull();
    expect(bannerKind({ status: 'expired', daysLeft: 0 }, false)).toBeNull();
  });
});
