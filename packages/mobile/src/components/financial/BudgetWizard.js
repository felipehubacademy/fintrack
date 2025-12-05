import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title1, Title2, Headline, Callout, Caption, Subheadline } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SimplePieChart } from './SimplePieChart';
import { useToast } from '../ui/Toast';
import { useAlert } from '../ui/AlertProvider';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Budget distribution functions
const MACRO_GROUPS = {
  needs: {
    key: 'needs',
    label: 'Necessidades',
    basePercentage: 50,
  },
  wants: {
    key: 'wants',
    label: 'Desejos',
    basePercentage: 30,
  },
  investments: {
    key: 'investments',
    label: 'Poupança / Investimentos',
    basePercentage: 20,
  },
};

const INVESTMENT_MACRO_KEY = 'investments';

const normalizeName = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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

function calculateTotalPercentage(distributions) {
  return distributions.reduce((sum, d) => sum + (d.percentage || 0), 0);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateBudgetDistribution(monthlyIncome, investmentPercentage = 20, availableCategories = []) {
  const income = Number.isFinite(monthlyIncome) ? Math.max(monthlyIncome, 0) : 0;
  if (income <= 0) return [];

  const groups = groupCategoriesByMacro(availableCategories);

  const investmentPct = clamp(investmentPercentage, 0, 100);
  const remainingPct = 100 - investmentPct;
  const macroAllocation = {
    investments: investmentPct,
    needs: (remainingPct * MACRO_GROUPS.needs.basePercentage) / (MACRO_GROUPS.needs.basePercentage + MACRO_GROUPS.wants.basePercentage),
    wants: (remainingPct * MACRO_GROUPS.wants.basePercentage) / (MACRO_GROUPS.needs.basePercentage + MACRO_GROUPS.wants.basePercentage),
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
        isPlaceholder: true,
      });
      return;
    }

    // Calcular valor por categoria arredondado para evitar perda de precisão
    const perCategoryAmount = Math.round((macroAmount / macroCategories.length) * 100) / 100;
    // Calcular a soma dos valores arredondados
    const totalRounded = perCategoryAmount * macroCategories.length;
    // Calcular diferença devido ao arredondamento
    const difference = Math.round((macroAmount - totalRounded) * 100) / 100;
    
    macroCategories.forEach((category, index) => {
      // Distribuir a diferença na primeira categoria para garantir soma exata
      const finalAmount = index === 0 
        ? Math.round((perCategoryAmount + difference) * 100) / 100
        : perCategoryAmount;
      
      distributions.push({
        id: category.id,
        categoryId: category.id,
        categoryName: category.name,
        macro_group: macroKey,
        percentage: macroPct / macroCategories.length,
        amount: finalAmount,
        color: category.color || getMacroColor(macroKey),
        isPlaceholder: false,
      });
    });
  });

  return adjustTo100Percent(distributions, income);
}

function validateDistribution(distributions, tolerance = 0.01) {
  const total = calculateTotalPercentage(distributions);
  return Math.abs(total - 100) <= tolerance;
}

function adjustTo100Percent(distributions, monthlyIncome) {
  const totalPercentage = calculateTotalPercentage(distributions);
  const income = Number.isFinite(monthlyIncome) ? monthlyIncome : 0;

  if (Math.abs(totalPercentage - 100) > 0.01 && totalPercentage > 0) {
    const adjustmentFactor = 100 / totalPercentage;
    distributions = distributions.map((dist) => ({
      ...dist,
      percentage: dist.percentage * adjustmentFactor,
    }));
  }

  // Calcular valores arredondados para 2 casas decimais
  const roundedDistributions = distributions.map((dist) => {
    const calculatedAmount = income * ((dist.percentage || 0) / 100);
    // Arredondar para 2 casas decimais
    const roundedAmount = Math.round(calculatedAmount * 100) / 100;
    return {
      ...dist,
      amount: roundedAmount,
    };
  });

  // Calcular a soma total dos valores arredondados (apenas não-placeholder)
  const nonPlaceholderDistributions = roundedDistributions.filter((dist) => !dist.isPlaceholder);
  const totalRounded = nonPlaceholderDistributions.reduce((sum, dist) => sum + dist.amount, 0);
  // Calcular a diferença devido ao arredondamento
  const difference = Math.round((income - totalRounded) * 100) / 100;

  // Se houver diferença, adicionar na primeira categoria não-placeholder para garantir soma exata
  if (Math.abs(difference) > 0.0001 && nonPlaceholderDistributions.length > 0) {
    const firstNonPlaceholderIndex = roundedDistributions.findIndex((dist) => !dist.isPlaceholder);
    if (firstNonPlaceholderIndex >= 0) {
      roundedDistributions[firstNonPlaceholderIndex].amount = Math.round(
        (roundedDistributions[firstNonPlaceholderIndex].amount + difference) * 100
      ) / 100;
    }
  }

  return roundedDistributions;
}

const { width, height } = Dimensions.get('window');

const STEPS = {
  WELCOME: 0,
  INCOME: 1,
  INVESTMENT: 2,
  SUBCATEGORIES: 3,
  SUCCESS: 4,
};

const PROGRESS_STEPS = [STEPS.WELCOME, STEPS.INCOME, STEPS.INVESTMENT, STEPS.SUBCATEGORIES];
const PROGRESS_TOTAL = PROGRESS_STEPS.length;

const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Investimentos',
};

const MACRO_COLORS = {
  needs: '#2563EB',
  wants: '#8B5CF6',
  investments: '#10B981',
};

// Funções de formatação de moeda
const parseCurrency = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatCurrencyInput = (value) => {
  if (!value && value !== 0) return '';
  const numValue = typeof value === 'string' ? parseCurrency(value) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyInput = (formattedValue) => {
  if (!formattedValue) return 0;
  const cleaned = formattedValue.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const formatMonthYear = (selectedMonth) => {
  if (!selectedMonth) return null;
  if (/^\d{4}-\d{2}$/.test(selectedMonth)) {
    return `${selectedMonth}-01`;
  }
  try {
    const date = new Date(selectedMonth);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  } catch (error) {
    return null;
  }
};

async function loadPreviousBudgets({ organizationId, selectedMonth, budgetCategories }) {
  if (!organizationId || !selectedMonth) {
    return { success: false, message: 'Organização ou mês inválido.' };
  }

  const currentMonth = formatMonthYear(selectedMonth);
  if (!currentMonth) {
    return { success: false, message: 'Mês selecionado inválido.' };
  }

  const baseDate = new Date(currentMonth);
  baseDate.setMonth(baseDate.getMonth() - 1);
  const previousMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('month_year', previousMonth);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return { success: false, message: 'Nenhum planejamento encontrado para o mês anterior.' };
  }

  const expenseCategories = budgetCategories.filter(
    (category) => category.type === 'expense' || category.type === 'both'
  );
  const categoriesMap = new Map(expenseCategories.map((category) => [category.id, category]));

  const entries = data
    .map((budget) => {
      const category = categoriesMap.get(budget.category_id);
      if (!category) return null;

      const amount = Number(budget.limit_amount || 0);
      return amount > 0
        ? {
            category,
            amount,
          }
        : null;
    })
    .filter(Boolean);

  if (!entries.length) {
    return {
      success: false,
      message: 'As categorias do mês anterior não correspondem às categorias disponíveis atualmente.',
    };
  }

  const totalAmount = entries.reduce((sum, item) => sum + item.amount, 0);
  if (!totalAmount) {
    return { success: false, message: 'O planejamento anterior não possui valores válidos.' };
  }

  const distributions = entries.map(({ category, amount }) => ({
    id: category.id,
    categoryId: category.id,
    categoryName: category.name,
    macro_group: category.macro_group,
    amount,
    percentage: (amount / totalAmount) * 100,
    color: category.color,
    isPlaceholder: false,
  }));

  return {
    success: true,
    totalAmount,
    distributions,
    previousMonthLabel: previousMonth,
  };
}

export function BudgetWizard({
  visible,
  onClose,
  organization,
  budgetCategories = [],
  selectedMonth,
  onComplete,
  isSoloUser = true,
}) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { alert } = useAlert();
  const confettiParticles = useRef([]);

  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [investmentPercentage, setInvestmentPercentage] = useState(20);
  const [distributions, setDistributions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingPreviousPlan, setLoadingPreviousPlan] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [autoRecalculate, setAutoRecalculate] = useState(true);
  const [expandedMacros, setExpandedMacros] = useState(['needs', 'wants', 'investments']);
  const [fixedMacroTotals, setFixedMacroTotals] = useState({});

  const transitionToStep = (step) => {
    setShowAnimation(false);
    setTimeout(() => {
      setCurrentStep(step);
      setShowAnimation(true);
    }, 150);
  };

  useEffect(() => {
    if (!visible) return;

    setCurrentStep(STEPS.WELCOME);
    setMonthlyIncome('');
    setInvestmentPercentage(20);
    setDistributions([]);
    setShowAnimation(true);
    setAutoRecalculate(true);
    setExpandedMacros([]);
    setFixedMacroTotals({});
  }, [visible]);

  useEffect(() => {
    if (currentStep < STEPS.INVESTMENT) return;
    if (!autoRecalculate) return;

    const income = parseCurrency(monthlyIncome);
    const expenseCategories = budgetCategories.filter(
      (category) => category.type === 'expense' || category.type === 'both'
    );
    if (!income || !expenseCategories.length) return;

    const baseDistribution = calculateBudgetDistribution(income, investmentPercentage, expenseCategories);
    setDistributions(baseDistribution);
  }, [monthlyIncome, investmentPercentage, budgetCategories, currentStep, autoRecalculate]);

  const aggregatedSummary = useMemo(() => {
    const income = parseCurrency(monthlyIncome);
    const summary = Object.keys(MACRO_LABELS).map((macro) => ({
      key: macro,
      label: MACRO_LABELS[macro],
      amount: 0,
      percentage: 0,
    }));

    distributions.forEach((dist) => {
      const target = summary.find((item) => item.key === dist.macro_group);
      if (target) {
        const amount = typeof dist.amount === 'string' ? parseCurrencyInput(dist.amount) : Number(dist.amount) || 0;
        target.amount += amount;
        target.percentage += dist.percentage || 0;
      }
    });

    return summary.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
      percentage: Number(item.percentage || 0),
      color: MACRO_COLORS[item.key],
      income,
    }));
  }, [distributions, monthlyIncome]);

  const handleNext = () => {
    if (currentStep >= STEPS.SUBCATEGORIES) return;
    const nextStep = Math.min(currentStep + 1, STEPS.SUBCATEGORIES);

    // Se está avançando para SUBCATEGORIES, salvar os totais FIXOS dos macros
    if (nextStep === STEPS.SUBCATEGORIES) {
      const totals = {};
      aggregatedSummary.forEach((macro) => {
        totals[macro.key] = macro.amount;
      });
      setFixedMacroTotals(totals);
    }

    transitionToStep(nextStep);
  };

  const handlePrevious = () => {
    if (currentStep === STEPS.WELCOME) return;
    const previousStep = Math.max(currentStep - 1, STEPS.WELCOME);
    transitionToStep(previousStep);
  };

  const handleIncomeChange = (text) => {
    // Remover tudo exceto números e vírgula
    let cleaned = text.replace(/[^\d,]/g, '');
    
    // Garantir apenas uma vírgula
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      // Manter apenas a primeira vírgula e limitar a 2 casas decimais
      const beforeComma = cleaned.substring(0, commaIndex);
      const afterComma = cleaned.substring(commaIndex + 1).replace(/,/g, '').substring(0, 2);
      cleaned = beforeComma + (afterComma ? ',' + afterComma : '');
    }
    
    setMonthlyIncome(cleaned);
    setAutoRecalculate(true);
  };

  const handleIncomeBlur = () => {
    const income = parseCurrency(monthlyIncome);
    if (!income) {
      setMonthlyIncome('');
      return;
    }
    setMonthlyIncome(formatCurrencyInput(income));
  };

  const handleInvestmentChange = (value) => {
    const clamped = Math.min(Math.max(value, 0), 80);
    setAutoRecalculate(true);
    setInvestmentPercentage(clamped);
  };

  const handleReopenPlan = () => {
    setAutoRecalculate(true);
    transitionToStep(STEPS.INCOME);
  };

  const toggleMacroExpansion = (macroKey) => {
    setExpandedMacros((prev) =>
      prev.includes(macroKey) ? prev.filter((k) => k !== macroKey) : [...prev, macroKey]
    );
  };

  const handleSubcategoryChange = (categoryId, newAmount, macroKey) => {
    if (newAmount === '' || newAmount === null || newAmount === undefined) {
      setDistributions((prev) =>
        prev.map((dist) => (dist.categoryId === categoryId ? { ...dist, amount: '' } : dist))
      );
      return;
    }

    const cleaned = newAmount.replace(/[^\d,]/g, '');
    setDistributions((prev) =>
      prev.map((dist) => (dist.categoryId === categoryId ? { ...dist, amount: cleaned } : dist))
    );
  };

  const handleSubcategoryBlur = (categoryId, macroKey) => {
    const macroTotal = fixedMacroTotals[macroKey] || 0;

    setDistributions((prev) => {
      const currentDist = prev.find((d) => d.categoryId === categoryId);
      if (!currentDist) return prev;

      let amount = typeof currentDist.amount === 'string' ? parseCurrencyInput(currentDist.amount) : Number(currentDist.amount) || 0;
      if (!Number.isFinite(amount)) amount = 0;
      if (amount < 0) amount = 0;

      const otherCategoriesTotal = prev
        .filter((d) => d.macro_group === macroKey && d.categoryId !== categoryId)
        .reduce((sum, d) => {
          const val = typeof d.amount === 'string' ? parseCurrencyInput(d.amount) : Number(d.amount) || 0;
          return sum + val;
        }, 0);

      const available = Math.max(0, macroTotal - otherCategoriesTotal);
      const finalAmount = Math.min(amount, available);

      return prev.map((dist) => (dist.categoryId === categoryId ? { ...dist, amount: finalAmount } : dist));
    });
  };

  const handleDistributeEvenly = (macroKey) => {
    const income = parseCurrency(monthlyIncome);
    const macroCategories = distributions.filter((d) => d.macro_group === macroKey);
    const macroTotal = fixedMacroTotals[macroKey] || 0;

    if (macroCategories.length === 0 || macroTotal === 0) return;

    // Calcular valor por categoria arredondado para evitar perda de precisão
    const amountPerCategory = Math.round((macroTotal / macroCategories.length) * 100) / 100;
    // Calcular a soma dos valores arredondados
    const totalRounded = amountPerCategory * macroCategories.length;
    // Calcular diferença devido ao arredondamento
    const difference = Math.round((macroTotal - totalRounded) * 100) / 100;

    setDistributions((prev) =>
      prev.map((dist, index) => {
        if (dist.macro_group !== macroKey) return dist;
        
        // Encontrar o índice dentro do macro
        const macroIndex = prev
          .filter((d) => d.macro_group === macroKey)
          .findIndex((d) => d.categoryId === dist.categoryId);
        
        // Distribuir a diferença na primeira categoria para garantir soma exata
        const finalAmount = macroIndex === 0
          ? Math.round((amountPerCategory + difference) * 100) / 100
          : amountPerCategory;
        
        return {
          ...dist,
          amount: finalAmount,
          percentage: (finalAmount / income) * 100,
        };
      })
    );
  };

  const handleCopyPreviousPlan = async () => {
    if (loadingPreviousPlan) return;

    setLoadingPreviousPlan(true);
    try {
      const result = await loadPreviousBudgets({
        organizationId: organization?.id,
        selectedMonth,
        budgetCategories,
      });

      if (!result.success) {
        alert({
          title: 'Atenção',
          message: result.message,
          type: 'warning',
        });
        return;
      }

      const { totalAmount, distributions: previousDistributions } = result;
      const adjustedDistributions = adjustTo100Percent(previousDistributions, totalAmount);
      const investmentFromPlan = adjustedDistributions
        .filter((dist) => dist.macro_group === 'investments')
        .reduce((sum, dist) => sum + (dist.percentage || 0), 0);

      setAutoRecalculate(false);
      setMonthlyIncome(formatCurrencyInput(totalAmount));
      setInvestmentPercentage(Math.round(investmentFromPlan));
      setDistributions(adjustedDistributions);
      transitionToStep(STEPS.INCOME);
      handleNext();
      showToast('Planejamento do mês anterior carregado! Revise e confirme.', 'success');
    } catch (error) {
      console.error('Erro ao copiar planejamento anterior:', error);
      showToast('Não foi possível copiar o planejamento anterior.', 'error');
    } finally {
      setLoadingPreviousPlan(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id) {
      showToast('Organização não encontrada', 'error');
      return;
    }
    const income = parseCurrency(monthlyIncome);
    if (!income) {
      showToast('Informe a renda mensal antes de salvar', 'warning');
      return;
    }

    const finalDistributions = adjustTo100Percent(distributions, income);

    if (!validateDistribution(finalDistributions)) {
      showToast('A distribuição precisa somar 100%', 'warning');
      return;
    }

    const monthYear = formatMonthYear(selectedMonth);
    if (!monthYear) {
      showToast('Selecione um mês válido', 'warning');
      return;
    }

    const payload = finalDistributions
      .filter((dist) => {
        if (!dist.categoryId || dist.isPlaceholder) return false;
        const amount = typeof dist.amount === 'string' ? parseCurrencyInput(dist.amount) : Number(dist.amount) || 0;
        return amount > 0;
      })
      .map((dist) => {
        const amount = typeof dist.amount === 'string' ? parseCurrencyInput(dist.amount) : Number(dist.amount) || 0;
        return {
          organization_id: organization.id,
          category_id: dist.categoryId,
          limit_amount: amount,
          month_year: monthYear,
        };
      });

    if (payload.length === 0) {
      showToast('Nenhuma categoria com valor para salvar!', 'error');
      return;
    }

    setSaving(true);
    try {
      // Deletar budgets antigos
      await supabase.from('budgets').delete().eq('organization_id', organization.id).eq('month_year', monthYear);

      // Inserir novos budgets
      const { data: newBudgets, error } = await supabase.from('budgets').insert(payload).select();
      if (error) throw error;

      // IMPORTANTE: Recalcular current_spent de cada budget
      if (newBudgets && newBudgets.length > 0) {
        for (const budget of newBudgets) {
          await supabase.rpc('recalculate_budget_spent', { p_budget_id: budget.id });
        }
      }

      showToast('Planejamento salvo com sucesso!', 'success');
      transitionToStep(STEPS.SUCCESS);
      // Criar confetes quando entrar no step de sucesso
      setTimeout(() => createConfetti(), 100);
    } catch (error) {
      console.error('Erro ao salvar planejamento:', error);
      showToast('Erro ao salvar planejamento: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const createConfetti = () => {
    // Limpar confetes anteriores
    confettiParticles.current.forEach((particle) => {
      if (particle.anim) {
        particle.anim.stop();
      }
    });
    confettiParticles.current = [];

    const confettiCount = 100;
    const confettiColors = [colors.brand.primary, colors.success.main, colors.warning.main, colors.error.main, '#5FFFA7', '#FFD93D', '#A8E6CF'];

    for (let i = 0; i < confettiCount; i++) {
      const anim = new Animated.Value(0);
      const rotateAnim = new Animated.Value(0);
      const opacityAnim = new Animated.Value(1);

      const angle = Math.random() * 360;
      const distance = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * (0.6 + Math.random() * 0.4);
      const duration = 2000 + Math.random() * 2000;
      const size = 8 + Math.random() * 8;
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const isCircle = Math.random() > 0.5;

      const radians = (angle * Math.PI) / 180;
      const endX = Math.cos(radians) * distance;
      const endY = Math.sin(radians) * distance;

      const particle = {
        anim,
        rotateAnim,
        opacityAnim,
        angle,
        endX,
        endY,
        size,
        color,
        isCircle,
        duration,
      };

      confettiParticles.current.push(particle);

      // Animar posição
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();

      // Animar rotação
      Animated.timing(rotateAnim, {
        toValue: Math.random() * 1080,
        duration,
        useNativeDriver: true,
      }).start();

      // Animar opacidade (fade out)
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: duration * 0.8,
        delay: duration * 0.2,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleFinish = async () => {
    if (onComplete) {
      await onComplete();
    }
    onClose();
  };

  if (!visible) return null;

  const income = parseCurrency(monthlyIncome);
  const isValidDistribution = validateDistribution(distributions);
  const progressIndex = PROGRESS_STEPS.indexOf(currentStep);
  const showProgress = progressIndex !== -1;
  const progressPercent = showProgress ? ((progressIndex + 1) / PROGRESS_TOTAL) * 100 : 100;

  const renderStep = () => {
    const baseClasses = showAnimation ? styles.stepVisible : styles.stepHidden;

    switch (currentStep) {
      case STEPS.WELCOME:
        return (
          <View style={[styles.stepContainer, baseClasses]}>
            <View style={styles.welcomeContainer}>
              <View style={styles.badge}>
                <Sparkles size={16} color={colors.brand.primary} />
                <Text style={styles.badgeText}>
                  Planejamento inteligente {isSoloUser ? 'pessoal' : 'da família'}
                </Text>
              </View>
              <Title1 style={styles.welcomeTitle}>Vamos iniciar seu planejamento mensal?</Title1>
              <Text style={styles.welcomeDescription}>
                Responda algumas perguntas rápidas e nós sugeriremos o melhor plano de orçamento, com base nas melhores práticas de educação financeira.
              </Text>
              <View style={styles.welcomeButtons}>
                <Button title="Vamos lá" onPress={handleNext} style={styles.welcomeButton} />
                <Button title="Mais tarde" variant="outline" onPress={onClose} style={styles.welcomeButton} />
                <Button
                  title={loadingPreviousPlan ? 'Carregando...' : 'Copiar planejamento anterior'}
                  variant="ghost"
                  onPress={handleCopyPreviousPlan}
                  disabled={loadingPreviousPlan}
                  style={styles.welcomeButton}
                />
              </View>
            </View>
          </View>
        );

      case STEPS.INCOME:
        return (
          <View style={[styles.stepContainer, baseClasses]}>
            <ScrollView 
              style={styles.scrollContent} 
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Title2 style={styles.stepTitle}>
                {isSoloUser ? 'Qual a entrada programada para o mês?' : 'Qual a entrada familiar programada para o mês?'}
              </Title2>
              <Text style={styles.stepDescription}>
                {isSoloUser ? '(Salário, recebimentos etc.)' : '(Salários, recebimentos etc.)'}
              </Text>
              <View style={styles.incomeInputContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={styles.incomeInput}
                  value={monthlyIncome}
                  onChangeText={handleIncomeChange}
                  onBlur={handleIncomeBlur}
                  placeholder="0,00"
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              <View style={styles.incomeButtonContainer}>
                <Button title="Continuar" onPress={handleNext} disabled={!income} style={styles.stepButton} />
              </View>
            </ScrollView>
          </View>
        );

      case STEPS.INVESTMENT:
        const pieChartData = aggregatedSummary.map((item) => ({
          label: item.label,
          value: item.amount,
        }));

        return (
          <View style={[styles.stepContainer, baseClasses]}>
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Title2 style={styles.stepTitle}>
                Que tal manter a meta de economizar 20% da sua renda mensal e investir esse saldo?
              </Title2>

              {income > 0 && (
                <View style={styles.investmentInfoBox}>
                  <Text style={styles.investmentInfoText}>
                    <Text weight="bold">Por quê 20%?</Text> Esta é uma meta recomendada pelos especialistas em finanças pessoais do MeuAzulão para garantir uma poupança saudável e crescimento patrimonial a longo prazo.
                  </Text>
                </View>
              )}

              <View style={styles.investmentControls}>
                <Text style={styles.investmentLabel}>Ajuste o percentual que deseja investir mensalmente</Text>
                
                <View style={styles.sliderWrapper}>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => {
                      const newValue = Math.max(0, investmentPercentage - 5);
                      handleInvestmentChange(newValue);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sliderButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.sliderContainer}>
                    <TextInput
                      style={styles.percentageInput}
                      value={String(investmentPercentage)}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        handleInvestmentChange(Math.min(80, Math.max(0, num)));
                      }}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                    <Text style={styles.percentageLabel}>%</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => {
                      const newValue = Math.min(80, investmentPercentage + 5);
                      handleInvestmentChange(newValue);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sliderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${(investmentPercentage / 80) * 100}%` }]} />
                </View>
              </View>

              <View style={styles.chartContainer}>
                <SimplePieChart data={pieChartData} />
              </View>

              <View style={styles.summaryContainer}>
                {aggregatedSummary.map((item) => (
                  <View key={item.key} style={styles.summaryItem}>
                    <View style={[styles.summaryDot, { backgroundColor: item.color }]} />
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                    <Text style={styles.summaryValue}>
                      {item.percentage.toFixed(1)}% · {formatCurrency(item.amount)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.investmentButtonContainer}>
                <Button
                  title="Ajustar subcategorias"
                  onPress={handleNext}
                  disabled={!isValidDistribution}
                  style={styles.stepButton}
                />
              </View>
            </ScrollView>
          </View>
        );

      case STEPS.SUBCATEGORIES:
        return (
          <View style={[styles.stepContainer, baseClasses]}>
            <ScrollView 
              style={styles.scrollContent} 
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Title2 style={styles.stepTitle}>Ajuste os valores para cada categoria</Title2>
              <Text style={styles.stepDescription}>Distribua o valor de cada macro entre as subcategorias</Text>

              {Object.keys(MACRO_LABELS).map((macroKey) => {
                const macroTotal = fixedMacroTotals[macroKey] || 0;
                const macroCategories = distributions.filter((d) => d.macro_group === macroKey);
                const isExpanded = expandedMacros.includes(macroKey);
                const macroSpent = macroCategories.reduce((sum, cat) => {
                  const amount = typeof cat.amount === 'string' ? parseCurrencyInput(cat.amount) : Number(cat.amount) || 0;
                  return sum + amount;
                }, 0);
                const macroDiff = macroTotal - macroSpent;
                const isBalanced = Math.abs(macroDiff) < 0.01;

                return (
                  <View key={macroKey} style={styles.macroCard}>
                    <TouchableOpacity
                      style={styles.macroHeader}
                      onPress={() => toggleMacroExpansion(macroKey)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.macroHeaderTop}>
                        <View style={styles.macroHeaderLeft}>
                          <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS[macroKey] }]} />
                          <Text style={styles.macroLabel}>{MACRO_LABELS[macroKey]}</Text>
                          <Text style={styles.macroAmount}>{formatCurrency(macroTotal)}</Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={20} color={colors.text.secondary} />
                        ) : (
                          <ChevronDown size={20} color={colors.text.secondary} />
                        )}
                      </View>
                      {!isBalanced && (
                        <View style={styles.macroHeaderBottom}>
                          <Text style={styles.macroAdjust}>
                            Ajustar: {formatCurrency(Math.abs(macroDiff))}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.macroContent}>
                        <View style={styles.macroContentHeader}>
                          <Text style={styles.macroCategoryCount}>
                            {macroCategories.length} {macroCategories.length === 1 ? 'categoria' : 'categorias'}
                          </Text>
                          <Button
                            title="Distribuir igualmente"
                            variant="ghost"
                            size="sm"
                            onPress={() => handleDistributeEvenly(macroKey)}
                          />
                        </View>

                        {macroCategories.map((category) => {
                          const amount = typeof category.amount === 'string' ? parseCurrencyInput(category.amount) : Number(category.amount) || 0;
                          const percentage = macroTotal > 0 ? (amount / macroTotal) * 100 : 0;

                          return (
                            <View key={category.categoryId} style={styles.categoryInputCard}>
                              <View style={styles.categoryInputHeader}>
                                <Text style={styles.categoryName}>{category.categoryName}</Text>
                                <Text style={styles.categoryPercentage}>{percentage.toFixed(0)}%</Text>
                              </View>
                              <View style={styles.categoryInputWrapper}>
                                <Text style={styles.categoryInputCurrency}>R$</Text>
                                <TextInput
                                  style={styles.categoryInput}
                                  value={typeof category.amount === 'number' ? formatCurrencyInput(category.amount) : category.amount || ''}
                                  onChangeText={(text) => handleSubcategoryChange(category.categoryId, text, macroKey)}
                                  onBlur={() => handleSubcategoryBlur(category.categoryId, macroKey)}
                                  placeholder="0,00"
                                  keyboardType="numeric"
                                />
                              </View>
                            </View>
                          );
                        })}

                        {!isBalanced && (
                          <View style={styles.balanceWarning}>
                            <Text style={styles.balanceWarningText}>
                              ⚠️ A soma das subcategorias deve totalizar {formatCurrency(macroTotal)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={styles.subcategoriesFooter}>
                <Button
                  title={saving ? 'Salvando...' : 'Salvar'}
                  onPress={handleSave}
                  disabled={saving}
                  style={styles.footerButton}
                />
              </View>
            </ScrollView>
          </View>
        );

      case STEPS.SUCCESS:
        return (
          <View style={[styles.stepContainer, baseClasses, styles.successContainer]}>
            {/* Confetti particles */}
            {confettiParticles.current.map((particle, index) => {
              const translateX = particle.anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, particle.endX],
              });
              const translateY = particle.anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, particle.endY],
              });
              const rotate = particle.rotateAnim.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              });

              return (
                <Animated.View
                  key={`confetti-${index}`}
                  style={[
                    styles.confetti,
                    {
                      width: particle.size,
                      height: particle.size,
                      borderRadius: particle.isCircle ? particle.size / 2 : 0,
                      backgroundColor: particle.color,
                      opacity: particle.opacityAnim,
                      transform: [
                        { translateX },
                        { translateY },
                        { rotate },
                      ],
                    },
                  ]}
                />
              );
            })}
            <View style={styles.successBadge}>
              <Sparkles size={20} color={colors.brand.primary} />
              <Text style={styles.successBadgeText}>Planejamento concluído</Text>
            </View>
            <Title1 style={styles.successTitle}>Parabéns!</Title1>
            <Text style={styles.successDescription}>
              Seu planejamento mensal está definido! Vamos monitorar automaticamente seus gastos e avisar quando as metas estiverem próximas do limite. Você pode ajustar os valores a qualquer momento na página de Orçamentos.
            </Text>
            <Button title="Ver planejamento" onPress={handleFinish} style={styles.stepButton} />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          {showProgress && (
            <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing[3]) }]}>
              <View style={styles.headerLeft}>
                {progressIndex > 0 && (
                  <TouchableOpacity onPress={handlePrevious} style={styles.backButton}>
                    <ChevronLeft size={24} color={colors.text.secondary} />
                  </TouchableOpacity>
                )}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    Passo {progressIndex + 1} de {PROGRESS_TOTAL}
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>{renderStep()}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: spacing[1],
    marginRight: spacing[2],
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
    minHeight: 400,
  },
  stepContainer: {
    flex: 1,
    padding: spacing[3],
  },
  stepVisible: {
    opacity: 1,
  },
  stepHidden: {
    opacity: 0,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: spacing[4],
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.bg,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    marginBottom: spacing[4],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.brand.primary,
    marginLeft: spacing[1],
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  welcomeDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    paddingHorizontal: spacing[2],
  },
  welcomeButtons: {
    width: '100%',
    gap: spacing[2],
  },
  welcomeButton: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'left',
    lineHeight: 28,
  },
  stepDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'left',
    marginBottom: spacing[4],
    lineHeight: 22,
  },
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    marginBottom: spacing[6],
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing[2],
  },
  incomeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'left',
    color: colors.text.primary,
    padding: 0,
  },
  stepButton: {
    width: '100%',
    maxWidth: 300,
  },
  incomeButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  investmentButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  investmentInfoBox: {
    backgroundColor: colors.brand.bg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  investmentInfoText: {
    fontSize: 14,
    color: colors.brand.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  investmentControls: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[2],
  },
  investmentLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
    lineHeight: 22,
  },
  sliderWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    minWidth: 120,
  },
  percentageInput: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 50,
    padding: 0,
  },
  percentageLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.secondary,
    marginLeft: spacing[1],
  },
  sliderTrack: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
  },
  sliderButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  sliderButtonText: {
    color: colors.background.primary,
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  chartContainer: {
    marginBottom: spacing[4],
  },
  summaryContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[2],
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  macroCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  macroHeader: {
    padding: spacing[3],
  },
  macroHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  macroHeaderBottom: {
    marginTop: spacing[1.5],
    paddingTop: spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  macroHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing[2],
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[2],
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing[2],
    flex: 1,
  },
  macroAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  macroAdjust: {
    fontSize: 13,
    color: colors.warning.main,
    fontWeight: '500',
  },
  macroContent: {
    padding: spacing[3],
    backgroundColor: colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  macroContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  macroCategoryCount: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  categoryInputCard: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
  },
  categoryPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radius.sm,
  },
  categoryInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    backgroundColor: colors.background.secondary,
  },
  categoryInputCurrency: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginRight: spacing[1],
  },
  categoryInput: {
    flex: 1,
    padding: spacing[2],
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    backgroundColor: 'transparent',
  },
  balanceWarning: {
    backgroundColor: colors.warning.bg,
    borderWidth: 1,
    borderColor: colors.warning.main,
    borderRadius: radius.md,
    padding: spacing[2],
    marginTop: spacing[2],
  },
  balanceWarningText: {
    fontSize: 12,
    color: colors.warning.main,
    textAlign: 'center',
  },
  subcategoriesFooter: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    flex: 1,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[6],
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2,
    top: SCREEN_HEIGHT / 2,
    pointerEvents: 'none',
    zIndex: 9999,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.bg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    marginBottom: spacing[4],
  },
  successBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
    marginLeft: spacing[1],
    textTransform: 'uppercase',
  },
  successTitle: {
    color: colors.brand.primary,
    marginBottom: spacing[3],
  },
  successDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
    paddingHorizontal: spacing[2],
  },
});

