import { buildMoreSections, isRouteEnabled, TAB_ROUTES } from '../routes';
import { t } from '@fintrack/shared/i18n';

const screensOf = (sections) => sections.flatMap((s) => s.items.map((i) => i.screen).filter(Boolean));

describe('More menu and flagged routes', () => {
  it('hides Investments and Goals when their flags are off', () => {
    const flags = { investments: false, goals: false, closing: true, insights: true };
    const isOn = (name) => Boolean(flags[name]);
    const screens = screensOf(buildMoreSections(t, isOn));
    expect(screens).not.toContain('Investments');
    expect(screens).not.toContain('Goals');
    expect(screens).toContain('Closing');
    expect(isRouteEnabled('Investments', isOn)).toBe(false);
    expect(isRouteEnabled('Goals', isOn)).toBe(false);
    expect(isRouteEnabled('Settings', isOn)).toBe(true);
  });

  it('shows them when the flags are on', () => {
    const screens = screensOf(buildMoreSections(t, () => true));
    expect(screens).toEqual(expect.arrayContaining(['Investments', 'Goals', 'Closing', 'Insights']));
  });

  it('every linked screen is a registered (enabled) route', () => {
    const isOn = (name) => name !== 'investments';
    for (const screen of screensOf(buildMoreSections(t, isOn))) {
      expect(isRouteEnabled(screen, isOn)).toBe(true);
    }
  });

  it('labels are translated in every language', () => {
    for (const lng of ['en', 'pt', 'es']) {
      const tl = (key) => t(key, { lng });
      for (const section of buildMoreSections(tl, () => true)) {
        expect(section.title).not.toMatch(/^navigation\./);
        for (const item of section.items) expect(item.label).not.toMatch(/^navigation\./);
      }
    }
    expect(t('navigation.tabs.home', { lng: 'es' })).toBe('Inicio');
  });

  it('keeps tab route names stable (other screens navigate by them)', () => {
    expect(TAB_ROUTES).toEqual({
      home: 'Início', transactions: 'Transações', add: 'Adicionar', budget: 'Orçamento', more: 'Mais',
    });
  });
});
