import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import tourService from '../services/tourService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useTour() {
  const router = useRouter();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourSteps, setTourSteps] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedTours, setCompletedTours] = useState(new Set());
  const [currentTourType, setCurrentTourType] = useState(null);
  const [userId, setUserId] = useState(null);

  // Obter userId do Supabase
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          console.log('useEffect checkCompletedTours - userId:', user.id);
          checkCompletedTours(user.id);
        } else {
          console.log('Usuário não autenticado');
        }
      } catch (error) {
        console.error('Erro ao obter usuário:', error);
      }
    };
    getUser();
  }, []);

  const checkCompletedTours = async (userId) => {
    try {
      console.log('🔍 Verificando tours completados para usuário:', userId);
      const tours = await tourService.getCompletedTours(userId);
      console.log('📊 Tours retornados do banco:', tours);
      console.log('📊 Tipo do objeto tours:', typeof tours);
      console.log('📊 Chaves do objeto tours:', Object.keys(tours));
      
      // tours agora é um objeto JSONB, não array
      const tourTypes = new Set(Object.keys(tours).filter(key => tours[key] === true));
      console.log('✅ Tours completados processados:', [...tourTypes]);
      console.log('✅ Dashboard está completado?', tourTypes.has('dashboard'));
      setCompletedTours(tourTypes);
    } catch (error) {
      console.error('❌ Erro ao verificar tours completados:', error);
    }
  };

  // Iniciar tour
  const startTour = (steps, tourType) => {
    setTourSteps(steps);
    setCurrentStep(0);
    setIsTourActive(true);
    // Armazenar tipo do tour para usar no completeTour
    setCurrentTourType(tourType);
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

  // Pular tour (fechar sem marcar como completado)
  const skipTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
    setTourSteps([]);
    setIsCompleted(false); // Não marca como completado
  };

  // Completar tour
  const completeTour = async () => {
    console.log('Completando tour:', currentTourType, 'para usuário:', userId);
    setIsTourActive(false);
    setCurrentStep(0);
    setTourSteps([]);
    setIsCompleted(true);
    
    // Marcar localmente primeiro
    if (currentTourType) {
      setCompletedTours(prev => {
        const newSet = new Set([...prev, currentTourType]);
        console.log('Tour marcado localmente:', [...newSet]);
        return newSet;
      });
    }
    
    // Aguardar userId estar disponível e salvar no banco
    const saveToDatabase = async () => {
      if (currentTourType && userId) {
        try {
          console.log('💾 Salvando tour no banco:', currentTourType, 'para usuário:', userId);
          const success = await tourService.markTourCompleted(currentTourType, userId);
          console.log('✅ Tour marcado como completado no banco:', success);
          if (success) {
            console.log('🎉 Tour salvo com sucesso no banco de dados!');
          } else {
            console.log('⚠️ Falha ao salvar tour no banco');
          }
        } catch (error) {
          console.error('❌ Erro ao salvar tour completado no banco:', error);
        }
      } else {
        console.log('⏳ Aguardando userId para salvar no banco...', 'currentTourType:', currentTourType, 'userId:', userId);
        // Tentar novamente em 1 segundo
        setTimeout(saveToDatabase, 1000);
      }
    };
    
    // Tentar salvar no banco
    saveToDatabase();
  };

  // Verificar se um tour específico foi completado
  const isTourCompleted = (tourType) => {
    const isCompleted = completedTours.has(tourType);
    console.log('🔍 Verificando se tour está completado:', tourType);
    console.log('📋 Tours completados atuais:', [...completedTours]);
    console.log('✅ Resultado:', isCompleted);
    return isCompleted;
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

  // Obter dados do passo atual (para compatibilidade)
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

  return {
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
}