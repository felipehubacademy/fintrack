import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import MacroPieChart from './MacroPieChart';
import { calculateBudgetDistribution, adjustTo100Percent, validateDistribution } from '../../lib/budgetSuggestions';
import { supabase } from '../../lib/supabaseClient';
import { useNotificationContext } from '../../contexts/NotificationContext';

const STEPS = {
  WELCOME: 0,
  INCOME: 1,
  INVESTMENT: 2,
  PREVIEW: 3,
  CONFIRM: 4
};

const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Poupança / Investimentos'
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
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setCurrentStep(STEPS.WELCOME);
    setMonthlyIncome('');
    setInvestmentPercentage(20);
    setDistributions([]);
    setShowAnimation(true);
  }, [isOpen]);

  useEffect(() => {
    if (currentStep < STEPS.INVESTMENT) return;
    const income = parseCurrency(monthlyIncome);
    if (!income || !budgetCategories.length) return;

    const baseDistribution = calculateBudgetDistribution(income, investmentPercentage, budgetCategories);
    setDistributions(baseDistribution);
  }, [monthlyIncome, investmentPercentage, budgetCategories, currentStep]);

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
    setShowAnimation(false);
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.PREVIEW));
      setShowAnimation(true);
    }, 150);
  };

  const handleGoToConfirm = () => {
    setShowAnimation(false);
    setTimeout(() => {
      setCurrentStep(STEPS.CONFIRM);
      setShowAnimation(true);
    }, 150);
  };

  const handlePrevious = () => {
    if (currentStep === STEPS.WELCOME) return;
    setShowAnimation(false);
    setTimeout(() => {
      setCurrentStep((prev) => Math.max(prev - 1, STEPS.WELCOME));
      setShowAnimation(true);
    }, 150);
  };

  const handleIncomeChange = (event) => {
    const raw = event.target.value;
    const cleaned = raw.replace(/[^\d,.-]/g, '');
    setMonthlyIncome(cleaned);
  };

  const handleIncomeBlur = () => {
    const income = parseCurrency(monthlyIncome);
    if (!income) {
      setMonthlyIncome('');
      return;
    }
    setMonthlyIncome(formatCurrency(income));
  };

  const handleDistributionChange = (index, percentage) => {
    const income = parseCurrency(monthlyIncome);
    if (!income) return;

    const updated = distributions.map((dist, idx) =>
      idx === index
        ? {
            ...dist,
            percentage: Math.max(0, Number(percentage) || 0)
          }
        : dist
    );
    setDistributions(adjustTo100Percent(updated, income));
  };

  const handleResetDistribution = () => {
    const income = parseCurrency(monthlyIncome);
    if (!income) return;
    setDistributions(calculateBudgetDistribution(income, investmentPercentage, budgetCategories));
  };

  const handleAutoAdjust = () => {
    const income = parseCurrency(monthlyIncome);
    if (!income) return;
    setDistributions(adjustTo100Percent(distributions, income));
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
      if (payload.length) {
        const { error } = await supabase.from('budgets').insert(payload);
        if (error) throw error;
      }
      success('Planejamento salvo com sucesso!');
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar planejamento:', error);
      showError('Erro ao salvar planejamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const income = parseCurrency(monthlyIncome);
  const totalPercentage = distributions.reduce((sum, dist) => sum + (dist.percentage || 0), 0);
  const isValidDistribution = validateDistribution(distributions);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl xl:max-w-6xl 2xl:max-w-6xl max-h-[95vh] border border-gray-200 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {currentStep > STEPS.WELCOME && (
              <Button variant="ghost" size="icon" onClick={handlePrevious} className="text-gray-700 hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">
                Passo {currentStep + 1} de 4
              </p>
              <div className="h-1 bg-gray-200 rounded-full mt-2 w-56">
                <div
                  className="h-1 bg-flight-blue rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
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

            {investmentSummarySection}

            <div className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-6xl px-4 sm:px-6">
              <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 md:px-8 md:py-5 lg:px-10 lg:py-6 shadow-sm">
                <p className="text-blue-900 text-xs md:text-sm lg:text-base leading-relaxed text-center">
                  <strong>Por quê 20%?</strong> Esta é uma meta recomendada pelos especialistas em finanças pessoais do MeuAzulão
                  para garantir uma poupança saudável e crescimento patrimonial a longo prazo.
                </p>
              </div>
            </div>

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
                    onChange={(e) => setInvestmentPercentage(parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={investmentPercentage}
                    onChange={(e) => setInvestmentPercentage(parseInt(e.target.value) || 0)}
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
                <Button type="button" onClick={handleNext} className="px-8 py-3 text-lg">
                  Revisar distribuição
                </Button>
              </div>
            </div>
          </div>
        );

      case STEPS.PREVIEW:
        return (
          <div className={`${baseClasses} space-y-6 lg:space-y-8`}>
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Ajuste os valores conforme sua necessidade
              </h2>
              <p className="text-gray-600">
                Edite os percentuais das subcategorias. Use os botões abaixo para restaurar a sugestão ou ajustar automaticamente.
              </p>
            </div>

            {investmentSummarySection}

            <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-5 py-3 bg-gray-50 text-sm font-semibold text-gray-700">
                <span>Categoria</span>
                <span className="text-center">Percentual</span>
                <span className="text-right">Valor (R$)</span>
              </div>
              <div className="divide-y divide-gray-200 max-h-[380px] overflow-y-auto">
                {distributions.map((dist, index) => (
                  <div key={dist.categoryId || index} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-5 py-4 items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: dist.color || '#6B7280' }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{dist.categoryName}</p>
                        <p className="text-xs text-gray-500">{MACRO_LABELS[dist.macro_group]}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={dist.percentage.toFixed(1)}
                        onChange={(e) => handleDistributionChange(index, e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center"
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    <div className="text-right text-sm font-semibold text-gray-900">
                      R$ {dist.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className={`inline-block px-4 py-2 rounded-lg ${isValidDistribution ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                <span className="font-semibold">Total: {totalPercentage.toFixed(1)}%</span>
                {!isValidDistribution && <p className="text-sm mt-1">A soma deve ser exatamente 100%</p>}
              </div>
              <div className="text-sm text-gray-600">
                Renda informada: R$ {formatCurrency(parseCurrency(monthlyIncome))} · Total distribuído: R$ {distributions.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="outline" type="button" onClick={handleResetDistribution} className="border-flight-blue/40 text-flight-blue hover:bg-flight-blue/10 px-6 py-3 min-h-[48px]">
                Restaurar sugestão
              </Button>
              {!isValidDistribution && (
                <Button variant="outline" type="button" onClick={handleAutoAdjust} className="border-blue-300 text-blue-700 hover:bg-blue-50 px-6 py-3 min-h-[48px]">
                  Ajustar automaticamente
                </Button>
              )}
              <Button onClick={handleGoToConfirm} disabled={!isValidDistribution} type="button" className="bg-flight-blue hover:bg-flight-blue/90 text-white px-8 py-6 text-lg min-h-[56px] disabled:opacity-50">
                Confirmar
              </Button>
            </div>
          </div>
        );

      case STEPS.CONFIRM:
        return (
          <div className={`${baseClasses} space-y-6 text-center`}>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Tudo certo com seu planejamento!
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Revisei a distribuição de necessidades, desejos e investimentos. Se estiver tudo certo, salve para aplicarmos este planejamento no mês selecionado.
            </p>

            <div className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
              {aggregatedSummary.map((item) => (
                <Card key={item.key} className="border border-gray-200 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <Badge className="text-xs font-semibold bg-white border border-gray-200 text-gray-700">
                      {item.label}
                    </Badge>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.percentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(STEPS.PREVIEW)} className="px-8 py-3 text-lg">
                Ajustar novamente
              </Button>
              <Button onClick={handleSave} disabled={saving} className="px-8 py-3 text-lg">
                {saving ? 'Salvando...' : 'Salvar planejamento'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }
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

