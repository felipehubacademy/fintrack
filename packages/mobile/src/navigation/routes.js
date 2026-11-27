/**
 * Route names are internal identifiers (other screens navigate by them, e.g.
 * navigation.navigate('Mais', { screen: 'Budgets' })), so they never change
 * with the language. Visible labels come from t('navigation.*').
 */
export const TAB_ROUTES = {
  home: 'Início',
  transactions: 'Transações',
  add: 'Adicionar',
  budget: 'Orçamento',
  more: 'Mais',
};

/** Screens in the More stack that sit behind a launch flag. */
export const FLAGGED_ROUTES = {
  Goals: 'goals',
  Investments: 'investments',
  Closing: 'closing',
  Insights: 'insights',
};

/** Is this More-stack route available in this build? */
// Callers pass isFeatureEnabled from '@fintrack/shared/config' (kept out of
// this module so it stays a pure, unit-testable function).
export function isRouteEnabled(routeName, isFeatureEnabled) {
  const flag = FLAGGED_ROUTES[routeName];
  return flag ? isFeatureEnabled(flag) : true;
}

/**
 * Sections of the More menu. Items pointing at a hidden screen are dropped,
 * so nothing links to a route that is not registered.
 * Icons/colors are plain keys here so this stays testable without React.
 */
export function buildMoreSections(t, isFeatureEnabled) {
  const sections = [
    {
      key: 'tools',
      title: t('navigation.more.sections.tools'),
      items: [
        { key: 'closing', label: t('navigation.more.closing'), icon: 'calendar', color: '#1F5BFF', screen: 'Closing' },
        { key: 'bills', label: t('navigation.more.bills'), icon: 'bills', color: '#F79009', screen: 'Bills' },
        { key: 'budgets', label: t('navigation.more.budgets'), icon: 'target', color: '#12B76A', screen: 'Budgets' },
        { key: 'insights', label: t('navigation.more.insights'), icon: 'chart', color: '#0EA5E9', screen: 'Insights' },
        { key: 'goals', label: t('navigation.more.goals'), icon: 'goal', color: '#A855F7', screen: 'Goals' },
        { key: 'investments', label: t('navigation.more.investments'), icon: 'trending', color: '#059669', screen: 'Investments' },
      ],
    },
    {
      key: 'account',
      title: t('navigation.more.sections.account'),
      items: [
        { key: 'profile', label: t('navigation.more.profile'), icon: 'user', color: '#6366F1', action: 'profile' },
        { key: 'settings', label: t('navigation.more.settings'), icon: 'settings', color: '#5B6475', screen: 'Settings' },
      ],
    },
    {
      key: 'about',
      title: t('navigation.more.sections.about'),
      items: [
        { key: 'help', label: t('navigation.more.help'), icon: 'help', color: '#0EA5E9', screen: 'Help' },
        { key: 'terms', label: t('navigation.more.terms'), icon: 'file', color: '#5B6475', action: 'terms' },
        { key: 'privacy', label: t('navigation.more.privacy'), icon: 'shield', color: '#5B6475', action: 'privacy' },
      ],
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.screen && !isRouteEnabled(item.screen, isFeatureEnabled)) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}
