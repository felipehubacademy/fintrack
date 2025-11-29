import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Button } from '../ui/Button';

/**
 * OnboardingOverlay - Sistema de overlay de onboarding com progresso
 * 
 * Mostra informações gerais sobre uma página sem destacar elementos específicos
 */
export default function OnboardingOverlay({
  steps = [],
  visible = false,
  onComplete = () => {},
  onSkip = () => {},
  storageKey = 'default',
  allowSkip = true,
  forceShow = false,
}) {
  // Se não está visível, não renderiza nada
  if (!visible) {
    return null;
  }

  // Se não tem steps, não renderiza
  if (!steps || steps.length === 0) {
    return null;
  }

  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      checkIfCompleted();
    } else {
      setIsVisible(false);
    }
  }, [visible, storageKey]);

  const checkIfCompleted = async () => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    try {
      if (storageKey) {
        const completed = await AsyncStorage.getItem(`onboarding_overlay_${storageKey}`);
        if (completed === 'true') {
          return;
        }
      }
      setIsVisible(true);
    } catch (error) {
      console.error('Erro ao verificar overlay:', error);
      setIsVisible(true);
    }
  };

  const handleNext = () => {
    const safeStep = Math.min(Math.max(0, currentStep), steps.length - 1);
    if (safeStep < steps.length - 1) {
      setCurrentStep(safeStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    const safeStep = Math.min(Math.max(0, currentStep), steps.length - 1);
    if (safeStep > 0) {
      setCurrentStep(safeStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      if (storageKey && !forceShow) {
        await AsyncStorage.setItem(`onboarding_overlay_${storageKey}`, 'true');
      }
      setIsVisible(false);
      onComplete();
    } catch (error) {
      console.error('Erro ao salvar overlay:', error);
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = async () => {
    if (!allowSkip) return;

    try {
      if (storageKey && !forceShow) {
        await AsyncStorage.setItem(`onboarding_overlay_${storageKey}`, 'skipped');
      }
      setIsVisible(false);
      onSkip();
    } catch (error) {
      console.error('Erro ao pular overlay:', error);
      setIsVisible(false);
      onSkip();
    }
  };

  if (!isVisible) {
    return null;
  }

  const safeStep = Math.min(Math.max(0, currentStep), steps.length - 1);
  const step = steps[safeStep];
  const isLastStep = safeStep === steps.length - 1;
  const StepIcon = step?.icon;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={allowSkip ? handleSkip : undefined}
    >
      <View style={styles.container}>
        {/* Overlay escuro */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={allowSkip ? handleSkip : undefined}
        />

        {/* Card de conteúdo */}
        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {StepIcon && (
                  <View style={styles.iconContainer}>
                    {React.createElement(StepIcon, {
                      size: 32,
                      color: colors.brand.primary,
                    })}
                  </View>
                )}
                <View style={styles.headerText}>
                  <Title2 style={styles.title}>{step?.title || ''}</Title2>
                </View>
              </View>
              {allowSkip && (
                <TouchableOpacity
                  onPress={handleSkip}
                  style={styles.closeButton}
                >
                  <X size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Conteúdo */}
            <View style={styles.content}>
              <Text style={styles.description}>
                {step?.description || ''}
              </Text>

              {step?.tip && (
                <View style={styles.tipContainer}>
                  <Text style={styles.tipText}>
                    💡 <Text style={styles.tipBold}>Dica:</Text> {step.tip}
                  </Text>
                </View>
              )}
            </View>

            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {steps.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentStep(index)}
                  style={[
                    styles.dot,
                    index === safeStep && styles.dotActive,
                    index < safeStep && styles.dotCompleted,
                  ]}
                />
              ))}
            </View>

            {/* Footer com navegação */}
            <View style={styles.footer}>
              <View style={styles.footerContent}>
                <Caption style={styles.stepCounter}>
                  {safeStep + 1} de {steps.length}
                </Caption>

                <View style={styles.navButtons}>
                  <Button
                    title="Anterior"
                    variant="outline"
                    onPress={handlePrevious}
                    disabled={safeStep === 0}
                    icon={<ChevronLeft size={18} color={colors.brand.primary} />}
                    iconPosition="left"
                    style={styles.navButton}
                  />

                  <Button
                    title={isLastStep ? 'Concluir' : 'Próximo'}
                    onPress={handleNext}
                    icon={
                      isLastStep ? (
                        <Check size={18} color={colors.neutral[0]} />
                      ) : (
                        <ChevronRight size={18} color={colors.neutral[0]} />
                      )
                    }
                    iconPosition="right"
                    style={styles.navButton}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    ...shadows.lg,
  },
  cardContent: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    marginBottom: spacing[4],
    minHeight: 100,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  tipContainer: {
    backgroundColor: colors.brand.bg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.primary,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[2],
  },
  tipText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.light,
  },
  dotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand.primary,
  },
  dotCompleted: {
    backgroundColor: colors.brand.primary,
    opacity: 0.6,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[3],
  },
  footerContent: {
    alignItems: 'center',
  },
  stepCounter: {
    color: colors.text.tertiary,
    marginBottom: spacing[3],
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
  },
});

