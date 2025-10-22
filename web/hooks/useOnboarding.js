import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useOnboarding(user, organization) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalSteps = 8; // 0-7

  // Fetch progress from database
  const fetchProgress = useCallback(async () => {
    if (!user || !organization) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar progresso do onboarding:', error);
        return;
      }

      if (data) {
        setProgress(data);
        setCurrentStep(data.current_step || 0);
      } else {
        // Criar registro inicial se não existir
        await createInitialProgress();
      }
    } catch (error) {
      console.error('❌ Erro ao buscar progresso:', error);
    } finally {
      setLoading(false);
    }
  }, [user, organization]);

  // Create initial progress record
  const createInitialProgress = async () => {
    if (!user || !organization) return;

    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          current_step: 0,
          completed_steps: [],
          is_completed: false,
          step_data: {}
        })
        .select()
        .single();

      if (error) throw error;

      setProgress(data);
      setCurrentStep(0);
    } catch (error) {
      console.error('❌ Erro ao criar progresso inicial:', error);
    }
  };

  // Save progress to database
  const saveProgress = useCallback(async (updates) => {
    if (!progress || saving) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .update(updates)
        .eq('id', progress.id);

      if (error) throw error;

      setProgress(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('❌ Erro ao salvar progresso:', error);
    } finally {
      setSaving(false);
    }
  }, [progress, saving]);

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

    const updates = {
      completed_steps: newCompletedSteps,
      step_data: {
        ...progress.step_data,
        ...stepData
      }
    };

    await saveProgress(updates);
  }, [progress, currentStep, saveProgress]);

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    if (!progress) return;

    await saveProgress({
      skipped: true,
      is_completed: true,
      completed_at: new Date().toISOString()
    });
  }, [progress, saveProgress]);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!progress) return;

    await saveProgress({
      is_completed: true,
      completed_at: new Date().toISOString()
    });
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
