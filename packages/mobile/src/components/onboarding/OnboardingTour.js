import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Button } from '../ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * OnboardingTour - Sistema de tour guiado para mobile
 * 
 * Guia o usuário passo a passo destacando elementos específicos
 */
export default function OnboardingTour({
  steps = [],
  visible = false,
  onComplete = () => {},
  onSkip = () => {},
  storageKey = 'default',
  allowSkip = true,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetLayout, setTargetLayout] = useState(null);

  useEffect(() => {
    if (visible) {
      checkIfCompleted();
    }
  }, [visible, storageKey]);

  useEffect(() => {
    if (isVisible && steps.length > 0) {
      // Medir o elemento alvo se existir
      measureTarget();
    }
  }, [isVisible, currentStep]);

  const checkIfCompleted = async () => {
    try {
      if (storageKey) {
        const completed = await AsyncStorage.getItem(`onboarding_tour_${storageKey}`);
        if (completed === 'true') {
          return;
        }
      }
      setIsVisible(true);
    } catch (error) {
      console.error('Erro ao verificar tour:', error);
      setIsVisible(true);
    }
  };

  const measureTarget = () => {
    const step = steps[currentStep];
    if (step?.targetRef?.current) {
      step.targetRef.current.measure((x, y, width, height, pageX, pageY) => {
        setTargetLayout({ x: pageX, y: pageY, width, height });
      });
    } else {
      setTargetLayout(null);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      if (storageKey) {
        await AsyncStorage.setItem(`onboarding_tour_${storageKey}`, 'true');
      }
      setIsVisible(false);
      onComplete();
    } catch (error) {
      console.error('Erro ao salvar tour:', error);
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = async () => {
    if (!allowSkip) return;
    
    try {
      if (storageKey) {
        await AsyncStorage.setItem(`onboarding_tour_${storageKey}`, 'skipped');
      }
      setIsVisible(false);
      onSkip();
    } catch (error) {
      console.error('Erro ao pular tour:', error);
      setIsVisible(false);
      onSkip();
    }
  };

  if (!isVisible || !steps || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const safeStep = Math.min(Math.max(0, currentStep), steps.length - 1);

  // Calcular posição do card baseado na posição do elemento alvo
  const getCardPosition = () => {
    if (!targetLayout) {
      // Se não tem elemento alvo, centralizar
      return {
        top: SCREEN_HEIGHT * 0.3,
        left: spacing[4],
        right: spacing[4],
      };
    }

    const { y, height } = targetLayout;
    const cardHeight = 300; // Altura estimada do card
    const spacing = 20;

    // Posicionar abaixo do elemento se houver espaço
    if (y + height + spacing + cardHeight < SCREEN_HEIGHT * 0.8) {
      return {
        top: y + height + spacing,
        left: spacing,
        right: spacing,
      };
    }

    // Caso contrário, posicionar acima
    if (y - spacing - cardHeight > SCREEN_HEIGHT * 0.2) {
      return {
        bottom: SCREEN_HEIGHT - y + spacing,
        left: spacing,
        right: spacing,
      };
    }

    // Se não cabe nem acima nem abaixo, centralizar
    return {
      top: SCREEN_HEIGHT * 0.3,
      left: spacing,
      right: spacing,
    };
  };

  const cardPosition = getCardPosition();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={allowSkip ? handleSkip : undefined}
    >
      <View style={styles.container}>
        {/* Overlay escuro */}
        <View style={styles.overlay} />

        {/* Spotlight no elemento alvo (se existir) */}
        {targetLayout && (
          <View
            style={[
              styles.spotlight,
              {
                top: targetLayout.y - 4,
                left: targetLayout.x - 4,
                width: targetLayout.width + 8,
                height: targetLayout.height + 8,
              },
            ]}
          />
        )}

        {/* Card de instrução */}
        <View style={[styles.card, cardPosition]}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {step.icon && (
                  <View style={styles.iconContainer}>
                    {React.createElement(step.icon, {
                      size: 24,
                      color: colors.brand.primary,
                    })}
                  </View>
                )}
                <View style={styles.headerText}>
                  <Title2 style={styles.title}>{step.title}</Title2>
                  <Caption style={styles.stepCounter}>
                    Passo {safeStep + 1} de {steps.length}
                  </Caption>
                </View>
              </View>
              {allowSkip && (
                <TouchableOpacity
                  onPress={handleSkip}
                  style={styles.closeButton}
                >
                  <X size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Conteúdo */}
            <View style={styles.content}>
              <Text style={styles.description}>{step.description}</Text>
              {step.tip && (
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

            {/* Actions */}
            <View style={styles.actions}>
              {allowSkip && (
                <Button
                  title="Pular"
                  variant="ghost"
                  onPress={handleSkip}
                  style={styles.skipButton}
                />
              )}
              <View style={styles.navButtons}>
                {safeStep > 0 && (
                  <Button
                    title="Anterior"
                    variant="outline"
                    onPress={handlePrevious}
                    icon={<ChevronLeft size={18} color={colors.brand.primary} />}
                    iconPosition="left"
                    style={styles.navButton}
                  />
                )}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  spotlight: {
    position: 'absolute',
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.brand.primary,
    backgroundColor: 'transparent',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  card: {
    position: 'absolute',
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    maxHeight: SCREEN_HEIGHT * 0.6,
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
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  headerText: {
    flex: 1,
  },
  title: {
    marginBottom: spacing[0.5],
  },
  stepCounter: {
    color: colors.text.tertiary,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    marginBottom: spacing[4],
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  tipContainer: {
    backgroundColor: colors.brand.bg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.primary,
    borderRadius: radius.md,
    padding: spacing[3],
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    flex: 0,
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing[2],
    flex: 1,
    justifyContent: 'flex-end',
  },
  navButton: {
    flex: 0,
  },
});

