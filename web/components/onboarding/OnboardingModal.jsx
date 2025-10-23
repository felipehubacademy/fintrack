import { useState, useEffect } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import Image from 'next/image';
import WelcomeStep from './WelcomeStep';
import CategoriesStep from './CategoriesStep';
import FirstCardStep from './FirstCardStep';
import WhatsAppStep from './WhatsAppStep';
import InviteStep from './InviteStep';
import CompletionStep from './CompletionStep';

const steps = [
  { component: WelcomeStep, title: 'Boas-vindas', skippable: false },
  { component: WhatsAppStep, title: 'WhatsApp', skippable: false },
  { component: CategoriesStep, title: 'Categorias', skippable: true },
  { component: FirstCardStep, title: 'Cartão', skippable: true },
  { component: InviteStep, title: 'Convites', skippable: true },
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

  const handleStepComplete = async (data = {}) => {
    setStepData(prev => ({ ...prev, ...data }));
    await completeStep(data);
    // Avançar automaticamente para o próximo step
    nextStep();
  };

  const handleComplete = async () => {
    console.log('🎯 handleComplete chamado');
    await completeOnboarding();
    
    // Redirecionar para o dashboard após 500ms
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
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
      {/* Background Overlay - Seguindo o padrão da aplicação */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50" />
      
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />

      {/* Modal Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-2 bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Logo e Título */}
            <div className="flex items-center -ml-3">
              <Image
                src="/images/logo_flat.svg"
                alt="MeuAzulão"
                width={96}
                height={96}
                className="h-24 w-24 -my-2"
                priority
              />
              <div className="-ml-3">
                <h1 className="text-gray-900 font-bold text-xl">MeuAzulão</h1>
                <p className="text-gray-500 text-xs">Configuração Inicial</p>
              </div>
            </div>

            {/* Skip Button */}
            {isSkippable && currentStep > 0 && currentStep < (steps?.length || totalSteps) - 1 && (
              <button
                onClick={handleSkipAll}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                <span className="text-sm font-medium">Pular Configuração</span>
              </button>
            )}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-12 pb-8">
          <div className="max-w-4xl mx-auto w-full">
            {CurrentStepComponent && (
              <CurrentStepComponent
                user={user}
                organization={organization}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onComplete={currentStep === steps.length - 1 ? handleComplete : handleStepComplete}
                onDataChange={handleDataChange}
                stepData={stepData}
              />
            )}
          </div>
        </div>

        {/* Navigation with Step Dots - Always visible at bottom */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto flex items-center justify-evenly">
            {/* Previous Button - Invisible on first and last step */}
            <button
              onClick={handlePrevious}
              disabled={(currentStep || 0) === 0}
              className={`
                flex-shrink-0 flex items-center space-x-1 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-all text-sm font-medium
                ${(currentStep || 0) === 0 || (currentStep || 0) === (steps?.length || totalSteps) - 1 ? 'invisible' : 'visible'}
                disabled:opacity-30 disabled:cursor-not-allowed
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Step Dots - Distributed evenly */}
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-300
                  ${index <= (currentStep || 0) ? 'bg-[#207DFF] scale-110 shadow-lg shadow-[#207DFF]/30' : 'bg-gray-300'}
                `} />
                <span className={`
                  text-[10px] mt-1.5 transition-colors duration-300 hidden lg:block whitespace-nowrap
                  ${index === (currentStep || 0) ? 'text-gray-900 font-medium' : 'text-gray-500'}
                `}>
                  {step.title}
                </span>
              </div>
            ))}

            {/* Next/Complete Button - Invisible on first and last step */}
            <button
              onClick={(currentStep || 0) === (steps?.length || totalSteps || 8) - 1 ? handleComplete : handleNext}
              className={`
                flex-shrink-0 flex items-center space-x-1 px-3 py-2 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg
                ${(currentStep || 0) === 0 || (currentStep || 0) === (steps?.length || totalSteps) - 1 ? 'invisible' : 'visible'}
              `}
            >
              <span className="hidden sm:inline">
                {(currentStep || 0) === (steps?.length || totalSteps || 8) - 1 ? 'Concluir' : 'Próximo'}
              </span>
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
                className="flex-1 px-4 py-3 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-semibold transition-all shadow-md"
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
