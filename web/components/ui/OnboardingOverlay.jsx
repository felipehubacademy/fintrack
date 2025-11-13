import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from './Button';

/**
 * OnboardingOverlay - Sistema de onboarding visual e interativo
 * 
 * Guia o usuário passo a passo com destaque visual nos elementos
 */
export default function OnboardingOverlay({ 
  steps = [], 
  isOpen, 
  onComplete, 
  onSkip,
  storageKey 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Verificar se já foi completado
      if (storageKey) {
        const completed = localStorage.getItem(`onboarding_${storageKey}`);
        if (completed) {
          return;
        }
      }
      setIsVisible(true);
    }
  }, [isOpen, storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (storageKey) {
      localStorage.setItem(`onboarding_${storageKey}`, 'true');
    }
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkipAll = () => {
    if (storageKey) {
      localStorage.setItem(`onboarding_${storageKey}`, 'true');
    }
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300" />

      {/* Spotlight no elemento alvo */}
      {step.target && (
        <div
          className="fixed z-[101] pointer-events-none"
          style={{
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            ...step.spotlightStyle
          }}
        />
      )}

      {/* Card de instrução */}
      <div
        className={`
          fixed z-[102]
          bg-white rounded-xl shadow-2xl
          max-w-md w-full
          p-6
          transform transition-all duration-300
          ${step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
          ${step.position === 'top' ? 'top-24 left-1/2 -translate-x-1/2' : ''}
          ${step.position === 'bottom' ? 'bottom-24 left-1/2 -translate-x-1/2' : ''}
        `}
        style={step.cardStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {step.icon && (
              <div className="p-2 bg-flight-blue/10 rounded-lg">
                <step.icon className="h-5 w-5 text-flight-blue" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkipAll}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">
            {step.description}
          </p>
          {step.tip && (
            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-flight-blue rounded">
              <p className="text-sm text-gray-700">
                💡 <strong>Dica:</strong> {step.tip}
              </p>
            </div>
          )}
        </div>

        {/* Progress dots - Proporcionais e elegantes */}
        <div className="flex justify-center items-center space-x-3 mb-6">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`
                rounded-full transition-all duration-300
                ${index === currentStep 
                  ? 'w-3 h-3 bg-flight-blue ring-4 ring-flight-blue/20' 
                  : index < currentStep
                  ? 'w-2 h-2 bg-flight-blue/60'
                  : 'w-2 h-2 bg-gray-300'
                }
                hover:scale-110
              `}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleSkipAll}
            className="text-gray-500"
          >
            Pular tutorial
          </Button>
          
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

