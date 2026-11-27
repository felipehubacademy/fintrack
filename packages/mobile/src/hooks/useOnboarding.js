import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export function useOnboarding(user, organization) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalSteps = 2; // language/currency, then open Zul

  // Fetch progress from database
  const fetchProgress = useCallback(async () => {
    if (!user || !organization) {
      setLoading(false);
      return;
    }

    try {
      // Buscar o registro mais recente (order by started_at desc, limit 1)
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading onboarding progress:', error);
        setLoading(false);
        return;
      }

      // Se encontrou registros, usar o primeiro (mais recente)
      if (data && data.length > 0) {
        const latestProgress = data[0];
        
        // Se não tem onboarding_type, detectar e atualizar
        if (!latestProgress.onboarding_type) {
          let type = 'admin'; // default
          
          if (organization?.type === 'solo') {
            type = 'solo';
          } else if (organization?.admin_id === user.id) {
            type = 'admin';
          } else {
            type = 'invited';
          }
          
          // Atualizar com o tipo correto
          await supabase
            .from('onboarding_progress')
            .update({ onboarding_type: type })
            .eq('id', latestProgress.id);
          
          latestProgress.onboarding_type = type;
        }
        
        setProgress(latestProgress);
        setCurrentStep(latestProgress.current_step || 0);
      } else {
        // Criar registro inicial se não existir
        // Detectar tipo de onboarding pela organização
        let type = 'admin'; // default
        
        if (organization?.type === 'solo') {
          type = 'solo';
        } else if (organization?.admin_id === user.id) {
          type = 'admin';
        } else {
          type = 'invited';
        }
        
        await createInitialProgress(type);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [user, organization]);

  // Create initial progress record (upsert para evitar duplicatas)
  const createInitialProgress = async (type = 'admin') => {
    if (!user || !organization) return;

    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          organization_id: organization.id,
          onboarding_type: type, // solo, admin, invited
          current_step: 0,
          completed_steps: [],
          is_completed: false,
          step_data: {},
          started_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,organization_id',
          ignoreDuplicates: false // Atualiza se já existir
        })
        .select()
        .single();

      if (error) throw error;

      setProgress(data);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error creating initial progress:', error);
      // Se mesmo com upsert der erro, apenas log (não bloqueia)
    }
  };

  // Save progress to database (upsert para robustez)
  const saveProgress = useCallback(async (updates) => {
    if (!user || !organization || saving) return;

    setSaving(true);
    try {
      // Se já tem progress com ID, fazer UPDATE
      if (progress?.id) {
        const { error } = await supabase
          .from('onboarding_progress')
          .update(updates)
          .eq('id', progress.id);

        if (error) throw error;
      } else {
        // Se não tem progress ainda, fazer UPSERT
        const { data, error } = await supabase
          .from('onboarding_progress')
          .upsert({
            user_id: user.id,
            organization_id: organization.id,
            ...updates
          }, {
            onConflict: 'user_id,organization_id'
          })
          .select()
          .single();

        if (error) throw error;
        setProgress(data);
      }

      setProgress(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSaving(false);
    }
  }, [progress, saving, user, organization]);

  // Navigate between steps
  const goToStep = useCallback((step) => {
    if (step < 0 || step >= totalSteps) return;
    
    setCurrentStep(step);
    saveProgress({ current_step: step });
  }, [totalSteps, saveProgress]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  // Mark step as completed
  const completeStep = useCallback(async (stepData = {}) => {
    if (!progress) return;

    const newCompletedSteps = [...(progress.completed_steps || [])];
    if (!newCompletedSteps.includes(currentStep)) {
      newCompletedSteps.push(currentStep);
    }

    // Sanitize stepData to remove circular references and non-serializable data
    const sanitizeData = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      try {
        // Test if it's JSON serializable
        JSON.stringify(obj);
        return obj;
      } catch (e) {
        // If not, create a clean copy with only primitive values
        const clean = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              clean[key] = value;
            } else if (Array.isArray(value)) {
              clean[key] = value.filter(v => 
                v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
              );
            } else if (typeof value === 'object' && value.constructor === Object) {
              clean[key] = sanitizeData(value);
            }
          }
        }
        return clean;
      }
    };

    const sanitizedStepData = sanitizeData(stepData);

    const updates = {
      completed_steps: newCompletedSteps,
      step_data: {
        ...progress.step_data,
        ...sanitizedStepData
      }
    };

    await saveProgress(updates);
  }, [progress, currentStep, saveProgress]);

  // Skip onboarding (não marca como completo, apenas pula)
  const skipOnboarding = useCallback(async () => {
    if (!progress) return;

    await saveProgress({
      skipped: true,
      // NÃO marcar como is_completed = true
      // O usuário ainda precisará configurar depois
    });
  }, [progress, saveProgress]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    console.log('Completing onboarding', { progress });
    
    if (!progress) {
      console.error('Onboarding progress not found');
      return;
    }

    try {
      await saveProgress({
        is_completed: true,
        completed_at: new Date().toISOString()
      });
      console.log('Onboarding completed');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [progress, saveProgress]);

  // Check if onboarding is completed
  const isCompleted = progress?.is_completed || false;
  const isSkipped = progress?.skipped || false;
  const completedStepsCount = progress?.completed_steps?.length || 0;
  const progressPercentage = (completedStepsCount / totalSteps) * 100;

  // Load progress on mount
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    currentStep,
    totalSteps,
    isCompleted,
    isSkipped,
    loading,
    saving,
    completedStepsCount,
    progressPercentage,
    goToStep,
    nextStep,
    previousStep,
    completeStep,
    skipOnboarding,
    completeOnboarding,
    refetch: fetchProgress
  };
}

