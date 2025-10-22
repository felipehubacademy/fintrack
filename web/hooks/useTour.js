import { useState, useEffect, useCallback } from 'react';

export function useTour(steps = []) {
  const [activeStep, setActiveStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const totalSteps = steps.length;

  // Start tour
  const start = useCallback(() => {
    setActiveStep(0);
    setIsActive(true);
    setIsVisible(true);
  }, []);

  // End tour
  const end = useCallback(() => {
    setIsActive(false);
    setIsVisible(false);
    setActiveStep(0);
  }, []);

  // Next step
  const next = useCallback(() => {
    if (activeStep < totalSteps - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      end();
    }
  }, [activeStep, totalSteps, end]);

  // Previous step
  const previous = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  }, [activeStep]);

  // Skip tour
  const skip = useCallback(() => {
    end();
  }, [end]);

  // Go to specific step
  const goToStep = useCallback((step) => {
    if (step >= 0 && step < totalSteps) {
      setActiveStep(step);
    }
  }, [totalSteps]);

  // Get current step data
  const getCurrentStep = useCallback(() => {
    return steps[activeStep] || null;
  }, [steps, activeStep]);

  // Check if tour is at first step
  const isFirstStep = activeStep === 0;

  // Check if tour is at last step
  const isLastStep = activeStep === totalSteps - 1;

  // Progress percentage
  const progressPercentage = totalSteps > 0 ? ((activeStep + 1) / totalSteps) * 100 : 0;

  // Auto-hide tour when not active
  useEffect(() => {
    if (!isActive) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Wait for fade out animation

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return {
    activeStep,
    isActive,
    isVisible,
    totalSteps,
    isFirstStep,
    isLastStep,
    progressPercentage,
    start,
    end,
    next,
    previous,
    skip,
    goToStep,
    getCurrentStep
  };
}
