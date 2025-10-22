import { Check } from 'lucide-react';

export default function OnboardingProgress({ 
  currentStep, 
  totalSteps, 
  completedSteps = [], 
  className = '' 
}) {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">
          Passo {currentStep + 1} de {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(progressPercentage)}% concluído
        </span>
      </div>

      {/* Progress Bar Background */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-flight-blue to-feather-blue h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isPast = index < currentStep;

          return (
            <div key={index} className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-flight-blue text-white ring-4 ring-flight-blue/20' 
                    : isPast
                    ? 'bg-gray-300 text-gray-600'
                    : 'bg-gray-200 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Step Label (only show for first few steps) */}
              {index < 3 && (
                <span className="text-xs text-gray-500 mt-1 text-center max-w-16">
                  {index === 0 ? 'Boas-vindas' :
                   index === 1 ? 'Responsáveis' :
                   index === 2 ? 'Categorias' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
