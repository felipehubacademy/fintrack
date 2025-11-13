import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from './Button';

/**
 * OnboardingOverlay V2 - Versão Simplificada
 * 
 * SIMPLES: Se isOpen for false, retorna null imediatamente
 * Não renderiza NADA se isOpen for false
 */
export default function OnboardingOverlay({ 
  steps = [], 
  isOpen, 
  onComplete, 
  onSkip,
  storageKey,
  allowSkip = true,
  forceShow = false
}) {
  // PRIMEIRO: Se isOpen for false, retorna null IMEDIATAMENTE
  // Isso remove o componente completamente do DOM
  if (!isOpen) {
    return null;
  }

  // Se não tem steps, não renderiza
  if (!steps || steps.length === 0) {
    return null;
  }

  const [currentStep, setCurrentStep] = useState(0);

  // Garantir que currentStep esteja dentro dos limites
  const safeStep = Math.min(Math.max(0, currentStep), steps.length - 1);
  const step = steps[safeStep];
  const StepIcon = step?.icon;

  const handleNext = () => {
    if (safeStep < steps.length - 1) {
      setCurrentStep(safeStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (safeStep > 0) {
      setCurrentStep(safeStep - 1);
    }
  };

  const handleComplete = () => {
    // Salvar no localStorage se necessário
    if (storageKey && !forceShow) {
      localStorage.setItem(`onboarding_${storageKey}`, 'true');
    }
    // Chamar callback
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkipClick = () => {
    if (!allowSkip) return;
    // Salvar no localStorage se necessário
    if (storageKey && !forceShow) {
      localStorage.setItem(`onboarding_${storageKey}`, 'true');
    }
    // Chamar callback
    if (onSkip) {
      onSkip();
    }
  };

  // Se chegou aqui, isOpen é true e temos steps válidos
  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (allowSkip && e.target === e.currentTarget) {
          handleSkipClick();
        }
      }}
    >
      <div 
        className="relative w-full max-w-[90vw] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative border-b border-gray-200 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 pr-8 sm:pr-10">
            {step?.title || ''}
          </h2>
          {allowSkip && (
            <button
              onClick={handleSkipClick}
              className="absolute top-4 sm:top-5 md:top-6 right-4 sm:right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-7 md:py-8 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
          {/* Icon */}
          {StepIcon && (
            <div className="flex justify-center mb-4 sm:mb-5 md:mb-6">
              <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-flight-blue/10 to-flight-blue/5">
                <StepIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-flight-blue" />
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-sm sm:text-base text-gray-600 text-center leading-relaxed mb-4 sm:mb-5 md:mb-6">
            {step?.description || ''}
          </p>

          {/* Tip */}
          {step?.tip && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-800">
                <strong>💡 Dica:</strong> {step.tip}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 bg-gray-50">
          {/* Progress dots */}
          <div className="flex justify-center items-center gap-2 sm:gap-1.5 md:gap-1 mb-4 sm:mb-5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                data-step-active={index === safeStep}
                data-step-completed={index < safeStep}
                className={`
                  onboarding-progress-dot rounded-full transition-all duration-200 cursor-pointer
                  ${index === safeStep
                    ? 'bg-flight-blue'
                    : index < safeStep
                    ? 'bg-flight-blue/40'
                    : 'bg-gray-300/50'
                  }
                  hover:scale-110
                  focus:outline-none
                `}
                aria-label={`Ir para passo ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center gap-3 sm:gap-4">
            <Button
              onClick={handlePrevious}
              variant="ghost"
              disabled={safeStep === 0}
              className="text-xs sm:text-sm"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">Ant.</span>
            </Button>

            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              {safeStep + 1} de {steps.length}
            </span>

            <Button
              onClick={handleNext}
              className="text-xs sm:text-sm"
            >
              {safeStep === steps.length - 1 ? (
                <>
                  <span className="hidden sm:inline">Concluir</span>
                  <span className="sm:hidden">OK</span>
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Próximo</span>
                  <span className="sm:hidden">Próx.</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
