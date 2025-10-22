import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import OnboardingProgress from './OnboardingProgress';

export default function OnboardingStep({
  children,
  currentStep,
  totalSteps,
  completedSteps,
  onNext,
  onPrevious,
  onSkip,
  onClose,
  canGoNext = true,
  canGoPrevious = true,
  showSkip = true,
  nextLabel = 'Próximo',
  previousLabel = 'Anterior',
  skipLabel = 'Pular',
  className = ''
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle next step
  const handleNext = () => {
    if (canGoNext && onNext) {
      setIsAnimating(true);
      setTimeout(() => {
        onNext();
        setIsAnimating(false);
      }, 150);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (canGoPrevious && onPrevious) {
      setIsAnimating(true);
      setTimeout(() => {
        onPrevious();
        setIsAnimating(false);
      }, 150);
    }
  };

  // Handle skip
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`
        bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden
        transform transition-all duration-300 ease-out
        ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        ${className}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-flight-blue to-feather-blue rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-deep-sky">MeuAzulão</h2>
              <p className="text-sm text-gray-600">Configuração inicial</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-gray-50">
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className={`
            transition-all duration-300 ease-out
            ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
          `}>
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {canGoPrevious && (
              <button
                onClick={handlePrevious}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{previousLabel}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {showSkip && (
              <button
                onClick={handleSkip}
                className="flex items-center space-x-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                <span>{skipLabel}</span>
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className={`
                flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all
                ${canGoNext
                  ? 'bg-gradient-to-r from-flight-blue to-feather-blue text-white hover:from-deep-sky hover:to-flight-blue shadow-md hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <span>{nextLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
