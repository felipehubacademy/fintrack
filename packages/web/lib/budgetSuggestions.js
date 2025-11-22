const MACRO_GROUPS = {
  needs: {
    key: 'needs',
    label: 'Necessidades',
    basePercentage: 50
  },
  wants: {
    key: 'wants',
    label: 'Desejos',
    basePercentage: 30
  },
  investments: {
    key: 'investments',
    label: 'Poupança / Investimentos',
    basePercentage: 20
  }
};

const INVESTMENT_MACRO_KEY = 'investments';

const normalizeName = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function calculateBudgetDistribution(
  monthlyIncome,
  investmentPercentage = 20,
  availableCategories = []
) {
  const income = Number.isFinite(monthlyIncome) ? Math.max(monthlyIncome, 0) : 0;
  if (income <= 0) return [];

  const groups = groupCategoriesByMacro(availableCategories);

  const investmentPct = clamp(investmentPercentage, 0, 100);
  const remainingPct = 100 - investmentPct;
  const macroAllocation = {
    investments: investmentPct,
    needs: (remainingPct * MACRO_GROUPS.needs.basePercentage) / (MACRO_GROUPS.needs.basePercentage + MACRO_GROUPS.wants.basePercentage),
    wants: (remainingPct * MACRO_GROUPS.wants.basePercentage) / (MACRO_GROUPS.needs.basePercentage + MACRO_GROUPS.wants.basePercentage)
  };

  const distributions = [];

  Object.keys(MACRO_GROUPS).forEach((macroKey) => {
    const macroPct = macroAllocation[macroKey];
    const macroAmount = income * (macroPct / 100);
    const macroCategories = groups[macroKey];

    if (macroCategories.length === 0) {
      distributions.push({
        id: `${macroKey}-placeholder`,
        categoryId: null,
        categoryName: `${MACRO_GROUPS[macroKey].label}`,
        macro_group: macroKey,
        percentage: macroPct,
        amount: macroAmount,
        color: getMacroColor(macroKey),
        isPlaceholder: true
      });
      return;
    }

    const perCategoryAmount = macroAmount / macroCategories.length;
    macroCategories.forEach((category) => {
      distributions.push({
        id: category.id,
        categoryId: category.id,
        categoryName: category.name,
        macro_group: macroKey,
        percentage: macroPct / macroCategories.length,
        amount: perCategoryAmount,
        color: category.color || getMacroColor(macroKey),
        isPlaceholder: false
      });
    });
  });

  return adjustTo100Percent(distributions, income);
}

function groupCategoriesByMacro(categories = []) {
  return categories.reduce(
    (acc, category) => {
      const macro = category.macro_group || inferMacroFromName(category.name);
      if (!acc[macro]) acc[macro] = [];
      acc[macro].push(category);
      return acc;
    },
    { needs: [], wants: [], investments: [] }
  );
}

function inferMacroFromName(name = '') {
  const normalized = normalizeName(name);

  if (normalized.match(/invest|poup|reserva|fundo|tesouro|acao|cripto/)) {
    return INVESTMENT_MACRO_KEY;
  }

  if (normalized.match(/lazer|educa|viag|assin|rest|roupa|hobby|diver/)) {
    return 'wants';
  }

  return 'needs';
}

function getMacroColor(macro) {
  switch (macro) {
    case 'investments':
      return '#10B981';
    case 'wants':
      return '#8B5CF6';
    default:
      return '#2563EB';
  }
}

export function calculateTotalPercentage(distributions) {
  return distributions.reduce((sum, d) => sum + (d.percentage || 0), 0);
}

export function validateDistribution(distributions, tolerance = 0.01) {
  const total = calculateTotalPercentage(distributions);
  return Math.abs(total - 100) <= tolerance;
}

export function adjustTo100Percent(distributions, monthlyIncome) {
  const totalPercentage = calculateTotalPercentage(distributions);
  const income = Number.isFinite(monthlyIncome) ? monthlyIncome : 0;

  if (Math.abs(totalPercentage - 100) > 0.01 && totalPercentage > 0) {
    const adjustmentFactor = 100 / totalPercentage;
    distributions = distributions.map((dist) => ({
      ...dist,
      percentage: dist.percentage * adjustmentFactor
    }));
  }

  return distributions.map((dist) => ({
    ...dist,
    amount: income * ((dist.percentage || 0) / 100)
  }));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
 