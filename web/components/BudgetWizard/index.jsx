import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import MacroPieChart from './MacroPieChart';
import { calculateBudgetDistribution, adjustTo100Percent, validateDistribution } from '../../lib/budgetSuggestions';
import { supabase } from '../../lib/supabaseClient';
import { useNotificationContext } from '../../contexts/NotificationContext';

const STEPS = {
  WELCOME: 0,
  INCOME: 1,
  INVESTMENT: 2,
  SUCCESS: 3
};

const PROGRESS_STEPS = [STEPS.WELCOME, STEPS.INCOME, STEPS.INVESTMENT];
const PROGRESS_TOTAL = PROGRESS_STEPS.length;

const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Investimentos'
};

const MACRO_COLORS = {
  needs: '#2563EB',
  wants: '#8B5CF6',
  investments: '#10B981'
};

export default function BudgetWizard({
  isOpen,
  onClose,
  organization,
  budgetCategories = [],
  selectedMonth,
  onComplete,
  isSoloUser = true
}) {
  const { success, showError, warning } = useNotificationContext();

  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [investmentPercentage, setInvestmentPercentage] = useState(20);
  const [distributions, setDistributions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingPreviousPlan, setLoadingPreviousPlan] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [autoRecalculate, setAutoRecalculate] = useState(true);

  const transitionToStep = (step) => {
    setShowAnimation(false);
    setTimeout(() => {
      setCurrentStep(step);
      setShowAnimation(true);
    }, 150);
  };

  useEffect(() => {
    if (!isOpen) return;

    setCurrentStep(STEPS.WELCOME);
    setMonthlyIncome('');
    setInvestmentPercentage(20);
    setDistributions([]);
    setShowAnimation(true);
    setAutoRecalculate(true);
  }, [isOpen]);

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
      percentage: 0
    }));

    distributions.forEach((dist) => {
      const target = summary.find((item) => item.key === dist.macro_group);
      if (target) {
        target.amount += dist.amount || 0;
        target.percentage += dist.percentage || 0;
      }
    });

    return summary.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
      percentage: Number(item.percentage || 0),
      color: MACRO_COLORS[item.key],
      income
    }));
  }, [distributions, monthlyIncome]);

  const handleNext = () => {
    if (currentStep >= STEPS.INVESTMENT) return;
    const nextStep = Math.min(currentStep + 1, STEPS.INVESTMENT);
    transitionToStep(nextStep);
  };

  const handlePrevious = () => {
    if (currentStep === STEPS.WELCOME) return;
    const previousStep = Math.max(currentStep - 1, STEPS.WELCOME);
    transitionToStep(previousStep);
  };

  const handleIncomeChange = (event) => {
    const raw = event.target.value;
    const cleaned = raw.replace(/[^\d,.-]/g, '');
    setMonthlyIncome(cleaned);
    setAutoRecalculate(true);
  };

  const handleIncomeBlur = () => {
    const income = parseCurrency(monthlyIncome);
    if (!income) {
      setMonthlyIncome('');
      return;
    }
    setMonthlyIncome(formatCurrency(income));
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

  const handleCopyPreviousPlan = async () => {
    if (loadingPreviousPlan) return;

    setLoadingPreviousPlan(true);
    try {
      const result = await loadPreviousBudgets({
        organizationId: organization?.id,
        selectedMonth,
        budgetCategories
      });

      if (!result.success) {
        warning(result.message);
        return;
      }

      const { totalAmount, distributions: previousDistributions } = result;
      const adjustedDistributions = adjustTo100Percent(previousDistributions, totalAmount);
      const investmentFromPlan = adjustedDistributions
        .filter((dist) => dist.macro_group === 'investments')
        .reduce((sum, dist) => sum + (dist.percentage || 0), 0);

      setAutoRecalculate(false);
      setMonthlyIncome(formatCurrency(totalAmount));
      setInvestmentPercentage(Math.round(investmentFromPlan));
      setDistributions(adjustedDistributions);
      transitionToStep(STEPS.INCOME);
      handleNext();
      success('Planejamento do mês anterior carregado! Revise e confirme.');
    } catch (error) {
      console.error('Erro ao copiar planejamento anterior:', error);
      showError('Não foi possível copiar o planejamento anterior.');
    } finally {
      setLoadingPreviousPlan(false);
    }
  };

  const handleSave = async () => {
    if (!organization?.id) {
      showError('Organização não encontrada');
      return;
    }
    const income = parseCurrency(monthlyIncome);
    if (!income) {
      warning('Informe a renda mensal antes de salvar');
      return;
    }

    const finalDistributions = adjustTo100Percent(distributions, income);
    if (!validateDistribution(finalDistributions)) {
      warning('A distribuição precisa somar 100%');
      return;
    }

    const monthYear = formatMonthYear(selectedMonth);
    if (!monthYear) {
      warning('Selecione um mês válido');
      return;
    }

    const payload = finalDistributions
      .filter((dist) => dist.categoryId && !dist.isPlaceholder)
      .map((dist) => ({
        organization_id: organization.id,
        category_id: dist.categoryId,
        limit_amount: dist.amount,
        month_year: monthYear
      }));

    setSaving(true);
    try {
      await supabase.from('budgets').delete().eq('organization_id', organization.id).eq('month_year', monthYear);
      if (finalDistributions.length) {
        const payload = finalDistributions
          .filter((dist) => dist.categoryId && !dist.isPlaceholder)
          .map((dist) => ({
            organization_id: organization.id,
            category_id: dist.categoryId,
            limit_amount: dist.amount,
            month_year: monthYear
          }));
        const { error } = await supabase.from('budgets').insert(payload);
        if (error) throw error;
      }
      success('Planejamento salvo com sucesso!');
      transitionToStep(STEPS.SUCCESS);
    } catch (error) {
      console.error('Erro ao salvar planejamento:', error);
      showError('Erro ao salvar planejamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    onComplete?.();
    onClose();
  };

  if (!isOpen) return null;

  const income = parseCurrency(monthlyIncome);
  const totalPercentage = distributions.reduce((sum, dist) => sum + (dist.percentage || 0), 0);
  const isValidDistribution = validateDistribution(distributions);
  const totalIncomeValue = income || 0;
  const progressIndex = PROGRESS_STEPS.indexOf(currentStep);
  const showProgress = progressIndex !== -1;
  const progressPercent = showProgress ? ((progressIndex + 1) / PROGRESS_TOTAL) * 100 : 100;

  const investmentSummarySection = (
    <div className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-6xl px-4 sm:px-6">
      <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 md:px-8 md:py-5 lg:px-10 lg:py-6 shadow-sm">
        <p className="text-blue-900 text-xs md:text-sm lg:text-base leading-relaxed text-center">
          <strong>Por quê 20%?</strong> Esta é uma meta recomendada pelos especialistas em finanças pessoais do MeuAzulão
          para garantir uma poupança saudável e crescimento patrimonial a longo prazo.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[96rem] max-h-[95vh] border border-gray-200 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          {showProgress ? (
            <>
              <div className="flex items-center space-x-3">
                {progressIndex > 0 && (
                  <Button variant="ghost" size="icon" onClick={handlePrevious} className="text-gray-700 hover:bg-gray-100">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Passo {progressIndex + 1} de {PROGRESS_TOTAL}
                  </p>
                  <div className="h-1 bg-gray-200 rounded-full mt-2 w-56">
                    <div
                      className="h-1 bg-flight-blue rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );

  function renderStep() {
    const baseClasses = `transition-all duration-300 ${showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;

    switch (currentStep) {
      case STEPS.WELCOME:
        return (
          <div className={`${baseClasses} text-center space-y-6`}>
            <div className="flex justify-center">
              <div className="bg-flight-blue/10 text-flight-blue rounded-full px-4 py-2 text-sm font-medium flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Planejamento inteligente {isSoloUser ? 'pessoal' : 'da família'}</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Vamos iniciar seu planejamento mensal?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Responda algumas perguntas rápidas e nós sugeriremos o melhor plano de orçamento, com base nas melhores práticas de educação financeira.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={handleNext} className="px-8 py-3 text-lg">
                Vamos lá
              </Button>
              <Button variant="outline" onClick={onClose} className="px-8 py-3 text-lg">
                Mais tarde
              </Button>
              <Button
                variant="ghost"
                onClick={handleCopyPreviousPlan}
                disabled={loadingPreviousPlan}
                className="px-8 py-3 text-lg"
              >
                {loadingPreviousPlan ? 'Carregando...' : 'Copiar planejamento anterior'}
              </Button>
            </div>
          </div>
        );

      case STEPS.INCOME:
        return (
          <div className={`${baseClasses} space-y-6`}>
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isSoloUser ? 'Qual a entrada programada para o mês?' : 'Qual a entrada familiar programada para o mês?'}
              </h2>
              <p className="text-gray-600 text-lg">
                {isSoloUser ? '(Salário, recebimentos etc.)' : '(Salários, recebimentos etc.)'}
              </p>
            </div>
            <div className="max-w-sm mx-auto">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">R$</span>
                <input
                  type="text"
                  value={monthlyIncome}
                  onChange={handleIncomeChange}
                  onBlur={handleIncomeBlur}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue text-center"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleNext} disabled={!income} className="px-8 py-3 text-lg">
                Continuar
              </Button>
            </div>
          </div>
        );

      case STEPS.INVESTMENT:
        return (
          <div className={`${baseClasses} space-y-8`}>
            <div className="text-center w-full px-4 sm:px-6 lg:px-12 xl:px-20">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 xl:mb-8">
                Que tal manter a meta de economizar 20% da sua renda mensal e investir esse saldo?
              </h2>
            </div>

            {totalIncomeValue > 0 && investmentSummarySection}

            <div className="max-w-[720px] mx-auto space-y-6 px-4 sm:px-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Ajuste o percentual que deseja investir mensalmente
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={investmentPercentage}
                    onChange={(e) => handleInvestmentChange(parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={investmentPercentage}
                    onChange={(e) => handleInvestmentChange(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Distribuição Macro</h3>
                  <MacroPieChart summary={aggregatedSummary} />
                </div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Resumo</h3>
                  <ul className="space-y-2">
                    {aggregatedSummary.map((item) => (
                      <li key={item.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {item.percentage.toFixed(1)}% · R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!isValidDistribution || saving}
                  className="px-8 py-3 text-lg"
                >
                  {saving ? 'Salvando...' : 'Confirmar planejamento'}
                </Button>
              </div>
            </div>
          </div>
        );

      case STEPS.SUCCESS:
        return (
          <div className={`${baseClasses} flex flex-col items-center justify-center text-center space-y-8 py-12 px-6`}>
            <div className="flex items-center justify-center space-x-3 bg-green-50 border border-green-200 rounded-full px-5 py-2 shadow-sm">
              <Sparkles className="h-5 w-5 text-green-600" />
              <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Planejamento concluído</span>
            </div>
            <div className="bg-white border border-green-200 rounded-3xl px-10 py-10 shadow-lg space-y-5 max-w-3xl">
              <h2 className="text-4xl font-bold text-green-700">Parabéns!</h2>
              <p className="text-lg text-green-800 leading-relaxed">
                Seu planejamento mensal está definido. Vamos monitorar automaticamente seus gastos e avisar quando as metas estiverem próximas do limite. Ajustes finos podem ser feitos em <strong>Pendências e Alertas</strong>.
              </p>
            </div>
            <Button onClick={handleFinish} className="px-8 py-3 text-lg">
              Ver planejamento
            </Button>
          </div>
        );


      default:
        return null;
    }
  }
}

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
            amount
          }
        : null;
    })
    .filter(Boolean);

  if (!entries.length) {
    return {
      success: false,
      message: 'As categorias do mês anterior não correspondem às categorias disponíveis atualmente.'
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
    isPlaceholder: false
  }));

  return {
    success: true,
    totalAmount,
    distributions,
    previousMonthLabel: previousMonth
  };
}

function parseCurrency(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthYear(selectedMonth) {
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
}

