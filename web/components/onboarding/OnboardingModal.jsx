import { useState, useEffect } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import OnboardingStep from './OnboardingStep';
import WelcomeStep from './WelcomeStep';
import ResponsiblesStep from './ResponsiblesStep';
import CategoriesStep from './CategoriesStep';
import WhatsAppStep from './WhatsAppStep';
import InviteStep from './InviteStep';
import FirstExpenseStep from './FirstExpenseStep';
import DashboardTourStep from './DashboardTourStep';
import CompletionStep from './CompletionStep';

const steps = [
  { component: WelcomeStep, title: 'Boas-vindas', skippable: false },
  { component: WhatsAppStep, title: 'WhatsApp', skippable: false }, // Movido para step 1 - crítico!
  { component: ResponsiblesStep, title: 'Responsáveis', skippable: true },
  { component: CategoriesStep, title: 'Categorias', skippable: true },
  { component: InviteStep, title: 'Convites', skippable: true },
  { component: FirstExpenseStep, title: 'Primeira Despesa', skippable: true },
  { component: DashboardTourStep, title: 'Tour', skippable: true },
  { component: CompletionStep, title: 'Conclusão', skippable: false }
];

export default function OnboardingModal({ 
  isOpen, 
  onClose, 
  user, 
  organization 
}) {
  const {
    progress,
    currentStep,
    totalSteps,
    isCompleted,
    loading,
    saving,
    completedStepsCount,
    progressPercentage,
    nextStep,
    previousStep,
    completeStep,
    skipOnboarding,
    completeOnboarding
  } = useOnboarding(user, organization);

  const [stepData, setStepData] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Close modal if onboarding is completed
  useEffect(() => {
    if (isCompleted && isOpen) {
      handleClose();
    }
  }, [isCompleted, isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSkipAll = () => {
    setShowSkipConfirm(true);
  };

  const confirmSkipAll = () => {
    skipOnboarding();
    setShowSkipConfirm(false);
  };

  const handleStepComplete = (data = {}) => {
    setStepData(prev => ({ ...prev, ...data }));
    completeStep(data);
  };

  const handleComplete = () => {
    completeOnboarding();
  };

  const handleDataChange = (data) => {
    setStepData(prev => ({ ...prev, ...data }));
  };

  if (!isOpen || loading) {
    return null;
  }

  const CurrentStepComponent = steps[currentStep]?.component;
  const stepTitle = steps[currentStep]?.title;
  const isSkippable = steps[currentStep]?.skippable;

  return (
    <div className={`
      fixed inset-0 z-[100] transition-all duration-300
      ${isClosing ? 'opacity-0' : 'opacity-100'}
    `}>
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-xl" />
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Modal Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-6 border-b border-white/10">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/images/logo_flat.svg" 
                alt="MeuAzulão" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-white font-bold text-lg">MeuAzulão</h1>
                <p className="text-white/60 text-xs">Configuração Inicial</p>
              </div>
            </div>

            {/* Skip Button */}
            {isSkippable && currentStep > 0 && currentStep < totalSteps - 1 && (
              <button
                onClick={handleSkipAll}
                className="flex items-center space-x-2 px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                <span className="text-sm font-medium">Pular Configuração</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-shrink-0 px-6 py-4 bg-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/80 text-sm font-medium">
                Passo {currentStep + 1} de {totalSteps}
              </div>
              <div className="text-white/60 text-xs">
                {Math.round(progressPercentage)}% completo
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
            {/* Step Dots */}
            <div className="flex justify-between mt-3">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${index <= currentStep ? 'bg-blue-400 scale-125' : 'bg-white/20'}
                  `} />
                  <span className={`
                    text-[10px] mt-1 transition-colors duration-300
                    ${index === currentStep ? 'text-white font-medium' : 'text-white/40'}
                  `}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {CurrentStepComponent && (
              <OnboardingStep stepIndex={currentStep} currentStepIndex={currentStep}>
                <CurrentStepComponent
                  user={user}
                  organization={organization}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  onComplete={handleStepComplete}
                  onDataChange={handleDataChange}
                  stepData={stepData}
                />
              </OnboardingStep>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex-shrink-0 px-6 py-6 bg-white/5 border-t border-white/10">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-medium">Anterior</span>
            </button>

            {/* Step Counter */}
            <div className="text-white/60 text-sm font-mono">
              {currentStep + 1} / {totalSteps}
            </div>

            {/* Next/Complete Button */}
            <button
              onClick={currentStep === totalSteps - 1 ? handleComplete : handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>{currentStep === totalSteps - 1 ? 'Concluir' : 'Próximo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Pular Configuração?
            </h3>
            <p className="text-gray-600 mb-6">
              Você pode configurar tudo isso depois nas configurações. Tem certeza que deseja pular?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSkipAll}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all"
              >
                Sim, Pular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
