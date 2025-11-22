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
  SUBCATEGORIES: 3,
  SUCCESS: 4
};

const PROGRESS_STEPS = [STEPS.WELCOME, STEPS.INCOME, STEPS.INVESTMENT, STEPS.SUBCATEGORIES];
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
      income
    }));
  }, [distributions, monthlyIncome]);

  const handleNext = () => {
    if (currentStep >= STEPS.SUBCATEGORIES) return;
    const nextStep = Math.min(currentStep + 1, STEPS.SUBCATEGORIES);
    
    // Se está avançando para SUBCATEGORIES, salvar os totais FIXOS dos macros
    if (nextStep === STEPS.SUBCATEGORIES) {
      const totals = {};
      aggregatedSummary.forEach(macro => {
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

  const toggleMacroExpansion = (macroKey) => {
    setExpandedMacros(prev => 
      prev.includes(macroKey) 
        ? prev.filter(k => k !== macroKey)
        : [...prev, macroKey]
    );
  };

  const handleSubcategoryChange = (categoryId, newAmount, macroKey) => {
    // Permitir digitação livre
    if (newAmount === '' || newAmount === null || newAmount === undefined) {
      setDistributions(prev => prev.map(dist => 
        dist.categoryId === categoryId 
          ? { ...dist, amount: '' }
          : dist
      ));
      return;
    }
    
    // Limpar formatação, manter apenas dígitos e vírgula
    const cleaned = newAmount.replace(/[^\d,]/g, '');
    setDistributions(prev => prev.map(dist => 
      dist.categoryId === categoryId 
        ? { ...dist, amount: cleaned }
        : dist
    ));
  };

  const handleSubcategoryBlur = (categoryId, macroKey) => {
    // Ao perder foco, validar e limitar ao disponível
    const macroTotal = fixedMacroTotals[macroKey] || 0;
    
    setDistributions(prev => {
      // Encontrar a categoria atual
      const currentDist = prev.find(d => d.categoryId === categoryId);
      if (!currentDist) return prev;
      
      // Converter o valor para número
      let amount = typeof currentDist.amount === 'string' ? parseCurrencyInput(currentDist.amount) : Number(currentDist.amount) || 0;
      if (!Number.isFinite(amount)) amount = 0;
      if (amount < 0) amount = 0;
      
      // Calcular quanto as OUTRAS categorias estão usando
      const otherCategoriesTotal = prev
        .filter(d => d.macro_group === macroKey && d.categoryId !== categoryId)
        .reduce((sum, d) => {
          const val = typeof d.amount === 'string' ? parseCurrencyInput(d.amount) : Number(d.amount) || 0;
          return sum + val;
        }, 0);
      
      // Quanto está disponível para ESTA categoria
      const available = Math.max(0, macroTotal - otherCategoriesTotal);
      
      // Limitar ao disponível
      const finalAmount = Math.min(amount, available);
      
      return prev.map(dist => 
        dist.categoryId === categoryId 
          ? { ...dist, amount: finalAmount }
          : dist
      );
    });
  };

  const handleDistributeEvenly = (macroKey) => {
    const income = parseCurrency(monthlyIncome);
    const macroCategories = distributions.filter(d => d.macro_group === macroKey);
    const macroTotal = fixedMacroTotals[macroKey] || 0;
    
    if (macroCategories.length === 0 || macroTotal === 0) return;
    
    const amountPerCategory = macroTotal / macroCategories.length;
    
    setDistributions(prev => prev.map(dist => 
      dist.macro_group === macroKey 
        ? { ...dist, amount: amountPerCategory, percentage: (amountPerCategory / income) * 100 }
        : dist
    ));
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
          month_year: monthYear
        };
      });

    if (payload.length === 0) {
      showError('Nenhuma categoria com valor para salvar! Verifique se todas as categorias têm valores.');
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
      
      success('Planejamento salvo com sucesso!');
      transitionToStep(STEPS.SUCCESS);
    } catch (error) {
      console.error('Erro ao salvar planejamento:', error);
      showError('Erro ao salvar planejamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (onComplete) {
      await onComplete();
    }
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full h-full max-w-none max-h-none flex flex-col border-0 rounded-none shadow-xl">
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
          <div className={`${baseClasses} flex h-full flex-col items-center justify-center px-6 py-12 space-y-10 text-center`}>
            <div className="flex items-center justify-center space-x-2 bg-flight-blue/10 text-flight-blue rounded-full px-4 py-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Planejamento inteligente {isSoloUser ? 'pessoal' : 'da família'}</span>
            </div>
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900">
                Vamos iniciar seu planejamento mensal?
              </h2>
              <p className="text-lg text-gray-600">
                Responda algumas perguntas rápidas e nós sugeriremos o melhor plano de orçamento, com base nas melhores práticas de educação financeira.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
          <div className={`${baseClasses} flex h-full flex-col items-center justify-center px-6 py-12 space-y-10`}>
            <div className="space-y-3 text-center max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isSoloUser ? 'Qual a entrada programada para o mês?' : 'Qual a entrada familiar programada para o mês?'}
              </h2>
              <p className="text-gray-600 text-lg">
                {isSoloUser ? '(Salário, recebimentos etc.)' : '(Salários, recebimentos etc.)'}
              </p>
            </div>
            <div className="max-w-sm w-full">
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
                  onClick={handleNext}
                  disabled={!isValidDistribution}
                  className="px-8 py-3 text-lg"
                >
                  Ajustar subcategorias
                </Button>
              </div>
            </div>
          </div>
        );

      case STEPS.SUBCATEGORIES:
        return (
          <div className={`${baseClasses} space-y-6`}>
            <div className="text-center w-full px-4 sm:px-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Ajuste os valores para cada categoria
              </h2>
              <p className="text-gray-600">
                Distribua o valor de cada macro entre as subcategorias
              </p>
            </div>

            <div className="max-w-[900px] mx-auto space-y-4 px-4 sm:px-6">
              {Object.keys(MACRO_LABELS).map((macroKey) => {
                const macroTotal = fixedMacroTotals[macroKey] || 0;
                const macroCategories = distributions.filter(d => d.macro_group === macroKey);
                const isExpanded = expandedMacros.includes(macroKey);
                const macroSpent = macroCategories.reduce((sum, cat) => {
                  const amount = typeof cat.amount === 'string' ? parseCurrencyInput(cat.amount) : Number(cat.amount) || 0;
                  return sum + amount;
                }, 0);
                const macroDiff = macroTotal - macroSpent;
                const isBalanced = Math.abs(macroDiff) < 0.01;

                return (
                  <div key={macroKey} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleMacroExpansion(macroKey)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: MACRO_COLORS[macroKey] }}
                        />
                        <span className="font-semibold text-gray-900">
                          {MACRO_LABELS[macroKey]}
                        </span>
                        <span className="text-gray-600">
                          · R$ {macroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {!isBalanced && (
                          <span className="text-xs text-orange-600 font-medium">
                            Ajustar: R$ {Math.abs(macroDiff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <ChevronLeft 
                          className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-[-90deg]' : ''}`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">
                            {macroCategories.length} {macroCategories.length === 1 ? 'categoria' : 'categorias'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDistributeEvenly(macroKey)}
                            className="text-xs"
                          >
                            Distribuir igualmente
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {macroCategories.map((category) => {
                            const amount = typeof category.amount === 'string' ? parseCurrencyInput(category.amount) : Number(category.amount) || 0;
                            const percentage = macroTotal > 0 
                              ? (amount / macroTotal) * 100 
                              : 0;

                            return (
                              <div key={category.categoryId} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {category.categoryName}
                                  </span>
                                  <span className="text-xs text-gray-600 ml-2">
                                    {percentage.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={typeof category.amount === 'number' ? formatCurrencyInput(category.amount) : (category.amount || '')}
                                    onChange={(e) => handleSubcategoryChange(category.categoryId, e.target.value, macroKey)}
                                    onBlur={() => handleSubcategoryBlur(category.categoryId, macroKey)}
                                    className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-1 focus:ring-flight-blue"
                                    placeholder="0,00"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={macroTotal}
                                    step="1"
                                    value={amount}
                                    onChange={(e) => handleSubcategoryChange(category.categoryId, e.target.value, macroKey)}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!isBalanced && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
                            ⚠️ A soma das subcategorias deve totalizar R$ {macroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-center pt-6 space-x-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
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
          <div className="flex h-full flex-col items-center justify-center text-center space-y-8 py-12 px-6">
            <div className="flex items-center justify-center space-x-3 bg-blue-50 border border-flight-blue/40 rounded-full px-5 py-2 shadow-sm">
              <Sparkles className="h-5 w-5 text-flight-blue" />
              <span className="text-sm font-semibold text-flight-blue uppercase tracking-wider">Planejamento concluído</span>
            </div>
            <div className="bg-white border border-flight-blue/30 rounded-3xl px-10 py-10 shadow-lg space-y-5 max-w-3xl">
              <h2 className="text-4xl font-bold text-flight-blue">Parabéns!</h2>
              <p className="text-lg text-flight-blue/80 leading-relaxed">
                Seu planejamento mensal está definido! Vamos monitorar automaticamente seus gastos e avisar quando as metas estiverem próximas do limite. Você pode ajustar os valores a qualquer momento clicando em <strong>"Editar macro"</strong> na página de Orçamentos.
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

// Formata valor para input (1000.5 -> "1.000,50")
function formatCurrencyInput(value) {
  if (!value && value !== 0) return '';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Converte input formatado para número ("1.000,50" -> 1000.5)
function parseCurrencyInput(formattedValue) {
  if (!formattedValue) return 0;
  const cleaned = formattedValue.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
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

