import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, PlayCircle } from 'lucide-react';
import { Button } from './Button';

/**
 * Sistema Unificado de Onboarding
 * Combina modal overlay (visão geral) + tour interativo (guia passo-a-passo)
 * 
 * Fluxo:
 * 1. Modal Overlay (obrigatório) - Visão geral da página
 * 2. Tour Interativo (opcional) - Guia detalhado com highlights
 */
export default function UnifiedOnboarding({
  // Configuração do Modal Overlay
  overlaySteps = [],
  overlayTitle = 'Bem-vindo!',
  
  // Configuração do Tour Interativo
  tourSteps = [],
  
  // Controle de exibição
  isOpen = false,
  onComplete = () => {},
  onSkip = () => {},
  
  // Chave para localStorage
  storageKey = 'default',
  
  // Permite pular o onboarding?
  allowSkip = false
}) {
  const [currentMode, setCurrentMode] = useState('overlay'); // 'overlay' ou 'tour'
  const [currentStep, setCurrentStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowOnboarding(true);
      setCurrentMode('overlay');
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    const steps = currentMode === 'overlay' ? overlaySteps : tourSteps;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Último passo do overlay -> oferecer tour
      if (currentMode === 'overlay' && tourSteps.length > 0) {
        // Perguntar se quer fazer o tour
        return;
      }
      
      // Finalizar
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartTour = () => {
    setCurrentMode('tour');
    setCurrentStep(0);
  };

  const handleSkipTour = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // Salvar no localStorage
    localStorage.setItem(`onboarding_${storageKey}`, 'completed');
    setShowOnboarding(false);
    onComplete();
  };

  const handleSkip = () => {
    if (!allowSkip) return;
    
    // Salvar skip no sessionStorage (não mostrar nesta sessão)
    sessionStorage.setItem(`onboarding_skipped_${storageKey}`, 'true');
    setShowOnboarding(false);
    onSkip();
  };

  if (!showOnboarding) return null;

  const steps = currentMode === 'overlay' ? overlaySteps : tourSteps;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Renderizar Overlay Mode
  if (currentMode === 'overlay') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="relative border-b border-gray-200 px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-900 pr-8">
              {overlayTitle}
            </h2>
            {allowSkip && (
              <button
                onClick={handleSkip}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Icon */}
            {currentStepData.icon && (
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-gradient-to-br from-flight-blue/10 to-flight-blue/5">
                  <currentStepData.icon className="h-12 w-12 text-flight-blue" />
                </div>
              </div>
            )}

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
              {currentStepData.title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 text-center leading-relaxed mb-6">
              {currentStepData.description}
            </p>

            {/* Tip (se houver) */}
            {currentStepData.tip && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>💡 Dica:</strong> {currentStepData.tip}
                </p>
              </div>
            )}

            {/* Última etapa - Oferecer tour */}
            {isLastStep && tourSteps.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
                <div className="flex items-start space-x-3">
                  <PlayCircle className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-indigo-900 mb-2">
                      Quer um tour guiado?
                    </h4>
                    <p className="text-sm text-indigo-700 mb-4">
                      Posso te mostrar cada funcionalidade em detalhes com um tour interativo passo-a-passo.
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleStartTour}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Iniciar Tour
                      </Button>
                      <Button
                        onClick={handleSkipTour}
                        variant="outline"
                      >
                        Pular Tour
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-8 py-6">
            {/* Progress dots */}
            <div className="flex justify-center items-center space-x-3 mb-6">
              {overlaySteps.map((_, index) => (
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

            {/* Navigation buttons */}
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrev}
                variant="ghost"
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-gray-500">
                {currentStep + 1} de {overlaySteps.length}
              </span>

              <Button
                onClick={isLastStep && tourSteps.length === 0 ? handleComplete : handleNext}
              >
                {isLastStep && tourSteps.length === 0 ? (
                  <>
                    Concluir
                    <Check className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar Tour Mode (interativo com highlights)
  if (currentMode === 'tour') {
    return (
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Overlay escuro com recorte para o elemento destacado */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />

        {/* Card do tour (posicionado dinamicamente) */}
        <div className="absolute bottom-8 right-8 w-96 bg-white rounded-2xl shadow-2xl pointer-events-auto animate-slide-up">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentStepData.title}
              </h3>
              <button
                onClick={handleSkipTour}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-gray-600 leading-relaxed mb-4">
              {currentStepData.description}
            </p>

            {currentStepData.tip && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>💡 Dica:</strong> {currentStepData.tip}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            {/* Progress */}
            <div className="flex justify-center space-x-2 mb-4">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`
                    h-1.5 rounded-full transition-all duration-300
                    ${index === currentStep ? 'w-8 bg-flight-blue' : 'w-1.5 bg-gray-300'}
                  `}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrev}
                variant="ghost"
                size="sm"
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-xs text-gray-500">
                {currentStep + 1}/{tourSteps.length}
              </span>

              <Button
                onClick={isLastStep ? handleComplete : handleNext}
                size="sm"
              >
                {isLastStep ? 'Concluir' : 'Próximo'}
                {isLastStep ? (
                  <Check className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

