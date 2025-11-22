import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import tourService from '../services/tourService';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const router = useRouter();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourSteps, setTourSteps] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedTours, setCompletedTours] = useState(new Set());
  const [currentTourType, setCurrentTourType] = useState(null);
  const [userId, setUserId] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  // Obter userId do Supabase
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Buscar organization_id do usuário
          const { data: userData } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          if (userData?.organization_id) {
            setOrganizationId(userData.organization_id);
            checkCompletedTours(user.id, userData.organization_id);
          }
        }
      } catch (error) {
        console.error('Erro ao obter usuário:', error);
      }
    };
    getUser();
  }, []);

  const checkCompletedTours = async (userId, orgId) => {
    try {
      const tours = await tourService.getCompletedTours(userId, orgId);
      const tourTypes = new Set(Object.keys(tours).filter(key => tours[key] === true));
      setCompletedTours(tourTypes);
    } catch (error) {
      console.error('❌ Erro ao verificar tours completados:', error);
    }
  };

  // Iniciar tour
  const startTour = (steps, tourType) => {
    console.log('🎯 Iniciando tour:', tourType, 'com', steps.length, 'steps');
    setTourSteps(steps);
    setCurrentStep(0);
    setIsTourActive(true);
    setCurrentTourType(tourType);
    setIsCompleted(false);
  };

  // Próximo passo
  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  // Passo anterior
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Pular tour - NÃO marca como completado no banco, mas marca na sessão atual
  const skipTour = () => {
    console.log('⏭️ Pulando tour:', currentTourType, '- Marcando como fechado na sessão atual');
    setIsTourActive(false);
    setCurrentStep(0);
    setTourSteps([]);
    setIsCompleted(false);
    
    // Marcar como fechado no sessionStorage para esta sessão (independente por página)
    if (currentTourType && typeof window !== 'undefined') {
      try {
        const skippedTours = JSON.parse(sessionStorage.getItem('skipped_tours') || '{}');
        skippedTours[currentTourType] = true;
        sessionStorage.setItem('skipped_tours', JSON.stringify(skippedTours));
        console.log('💾 Tour fechado salvo na sessão:', currentTourType);
      } catch (error) {
        console.error('Erro ao salvar tour fechado na sessão:', error);
      }
    }
    
    // NÃO adiciona ao completedTours - permite que apareça na próxima sessão (login)
    // NÃO salva no banco - permite que apareça na próxima vez
  };

  // Completar tour
  const completeTour = async () => {
    console.log('✅ Completando tour:', currentTourType);
    setIsTourActive(false);
    setCurrentStep(0);
    setTourSteps([]);
    setIsCompleted(true);
    
    if (currentTourType) {
      setCompletedTours(prev => {
        const newSet = new Set([...prev, currentTourType]);
        return newSet;
      });
    }
    
    // Salvar no banco
    if (currentTourType && userId) {
      try {
        await tourService.markTourCompleted(currentTourType, userId, organizationId);
      } catch (error) {
        console.error('❌ Erro ao salvar tour completado:', error);
      }
    }
  };

  // Verificar se um tour específico foi completado
  const isTourCompleted = (tourType) => {
    return completedTours.has(tourType);
  };

  // Reiniciar tour
  const restartTour = async (tourType) => {
    if (userId) {
      try {
        await tourService.resetTours(userId);
        setCompletedTours(new Set());
        setIsCompleted(false);
      } catch (error) {
        console.error('Erro ao resetar tours:', error);
      }
    }
  };

  // Obter passo atual
  const getCurrentStep = () => {
    return tourSteps[currentStep] || null;
  };

  // Obter dados do passo atual
  const getCurrentStepData = () => {
    return tourSteps[currentStep] || null;
  };

  // Verificar se é o último passo
  const isLastStep = () => {
    return currentStep === tourSteps.length - 1;
  };

  // Verificar se é o primeiro passo
  const isFirstStep = () => {
    return currentStep === 0;
  };

  const value = {
    isTourActive,
    currentStep,
    tourSteps,
    isCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
    getCurrentStep,
    getCurrentStepData,
    isLastStep,
    isFirstStep,
    isTourCompleted,
    totalSteps: tourSteps.length
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour deve ser usado dentro de TourProvider');
  }
  return context;
}

