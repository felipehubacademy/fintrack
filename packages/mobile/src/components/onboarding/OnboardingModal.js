import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Caption } from '../ui/Text';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useOrganization } from '../../hooks/useOrganization';
import WelcomeStep from './WelcomeStep';
import WhatsAppStep from './WhatsAppStep';
import CategoriesStep from './CategoriesStep';
import InviteStep from './InviteStep';
import CompletionStep from './CompletionStep';

export default function OnboardingModal({ 
  visible, 
  onClose, 
  user, 
  organization 
}) {
  const { isSoloUser } = useOrganization();
  const {
    progress,
    currentStep,
    totalSteps,
    isCompleted,
    loading,
    saving,
    completedStepsCount,
    progressPercentage,
    nextStep,
    previousStep,
    completeStep,
    skipOnboarding,
    completeOnboarding
  } = useOnboarding(user, organization);
  
  // Definir steps dinamicamente baseado no tipo de onboarding
  const steps = useMemo(() => {
    const onboardingType = progress?.onboarding_type || 'admin';
    
    const allSteps = [];
    
    // Welcome sempre
    allSteps.push({ component: WelcomeStep, title: 'Boas-vindas', skippable: false });
    
    // WhatsApp para todos
    allSteps.push({ component: WhatsAppStep, title: 'WhatsApp', skippable: false });
    
    // Categorias sempre
    allSteps.push({ component: CategoriesStep, title: 'Categorias', skippable: true });
    
    // Convidar familiar apenas para admin
    if (onboardingType === 'admin') {
      allSteps.push({ component: InviteStep, title: 'Convites', skippable: true });
    }
    
    // Sempre adicionar conclusão no final
    allSteps.push({ component: CompletionStep, title: 'Conclusão', skippable: false });
    
    return allSteps;
  }, [isSoloUser, progress?.onboarding_type]);

  const [stepData, setStepData] = useState({});
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Close modal if onboarding is completed
  useEffect(() => {
    if (isCompleted && visible) {
      handleClose();
    }
  }, [isCompleted, visible]);

  const handleClose = () => {
    onClose();
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSkipAll = () => {
    setShowSkipConfirm(true);
  };

  const confirmSkipAll = async () => {
    await skipOnboarding();
    setShowSkipConfirm(false);
    handleClose();
  };

  const handleStepComplete = async (data = {}) => {
    setStepData(prev => ({ ...prev, ...data }));
    await completeStep(data);
    // Avançar automaticamente para o próximo step
    nextStep();
  };

  const handleComplete = async () => {
    console.log('🎯 handleComplete chamado');
    await completeOnboarding();
    handleClose();
  };

  const handleDataChange = (data) => {
    setStepData(prev => ({ ...prev, ...data }));
  };

  if (!visible || loading) {
    return null;
  }

  const CurrentStepComponent = steps[currentStep]?.component;
  const stepTitle = steps[currentStep]?.title;
  const isSkippable = steps[currentStep]?.skippable;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>MeuAzulão</Text>
              <Caption style={styles.subtitle}>Configuração Inicial</Caption>
            </View>

            {/* Skip Button */}
            {isSkippable && !isFirstStep && !isLastStep && (
              <TouchableOpacity
                onPress={handleSkipAll}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>Pular</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Step Content */}
        <View style={styles.content}>
          {CurrentStepComponent && (
            <CurrentStepComponent
              user={user}
              organization={organization}
              onboardingType={progress?.onboarding_type || 'admin'}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onComplete={isLastStep ? handleComplete : handleStepComplete}
              onDataChange={handleDataChange}
              stepData={stepData}
            />
          )}
        </View>

        {/* Navigation Footer */}
        <View style={styles.footer}>
          <View style={styles.navigation}>
            {/* Previous Button */}
            {!isFirstStep && !isLastStep && (
              <TouchableOpacity
                onPress={handlePrevious}
                style={styles.navButton}
                disabled={isFirstStep}
              >
                <ChevronLeft size={20} color={colors.brand.primary} />
                <Text style={styles.navButtonText}>Anterior</Text>
              </TouchableOpacity>
            )}

            {/* Step Dots */}
            <View style={styles.dotsContainer}>
              {steps.map((step, index) => (
                <View key={index} style={styles.dotWrapper}>
                  <View
                    style={[
                      styles.dot,
                      index <= currentStep && styles.dotActive,
                    ]}
                  />
                  {index === currentStep && (
                    <Caption style={styles.dotLabel}>{step.title}</Caption>
                  )}
                </View>
              ))}
            </View>

            {/* Next/Complete Button */}
            {!isFirstStep && !isLastStep && (
              <TouchableOpacity
                onPress={isLastStep ? handleComplete : handleNext}
                style={[styles.navButton, styles.navButtonPrimary]}
              >
                <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
                  {isLastStep ? 'Concluir' : 'Próximo'}
                </Text>
                <ChevronRight size={20} color={colors.neutral[0]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Skip Confirmation Modal */}
        {showSkipConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>
                Pular Configuração?
              </Text>
              <Text style={styles.confirmText}>
                Você pode configurar tudo isso depois nas configurações. Tem certeza que deseja pular?
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  onPress={() => setShowSkipConfirm(false)}
                  style={[styles.confirmButton, styles.confirmButtonCancel]}
                >
                  <Text style={styles.confirmButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmSkipAll}
                  style={[styles.confirmButton, styles.confirmButtonConfirm]}
                >
                  <Text style={[styles.confirmButtonText, styles.confirmButtonTextConfirm]}>
                    Sim, Pular
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? spacing[6] : spacing[4],
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing[0.5],
    color: colors.text.secondary,
  },
  skipButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  skipText: {
    color: colors.text.secondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  navButtonPrimary: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  navButtonText: {
    marginHorizontal: spacing[1],
    color: colors.brand.primary,
    fontWeight: '500',
  },
  navButtonTextPrimary: {
    color: colors.neutral[0],
  },
  dotsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  dotWrapper: {
    alignItems: 'center',
    marginHorizontal: spacing[1],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.light,
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLabel: {
    marginTop: spacing[1],
    fontSize: 10,
    color: colors.text.secondary,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmModal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    padding: spacing[6],
    width: '85%',
    maxWidth: 400,
    ...shadows.lg,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  confirmText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: colors.background.secondary,
  },
  confirmButtonConfirm: {
    backgroundColor: colors.brand.primary,
  },
  confirmButtonText: {
    fontWeight: '500',
    color: colors.text.primary,
  },
  confirmButtonTextConfirm: {
    color: colors.neutral[0],
  },
});

