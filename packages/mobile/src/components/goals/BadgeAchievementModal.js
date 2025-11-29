import React, { useEffect, useRef } from 'react';
import { Modal, View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Award, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Headline, Caption } from '../ui/Text';
import { Card } from '../ui/Card';
import { BADGE_DEFINITIONS } from './GoalBadges';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BadgeAchievementModal({ 
  visible, 
  badgeId, 
  onClose 
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnimations = useRef([]).current;

  const badge = badgeId ? BADGE_DEFINITIONS[badgeId] : null;

  useEffect(() => {
    if (visible && badge) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
      fadeAnim.setValue(0);

      // Start animations
      Animated.parallel([
        // Scale in animation
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Rotate animation
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation loop
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      // Create confetti particles
      createConfetti();

      return () => {
        pulseLoop.stop();
      };
    }
  }, [visible, badge]);

  const createConfetti = () => {
    const confettiCount = 50;
    const colors_arr = [colors.brand.primary, colors.success.main, colors.warning.main, colors.error.main];
    
    for (let i = 0; i < confettiCount; i++) {
      const anim = new Animated.Value(0);
      confettiAnimations.push(anim);

      const angle = Math.random() * 360;
      const distance = SCREEN_WIDTH * (0.5 + Math.random() * 0.5);
      const duration = 2000 + Math.random() * 1000;

      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }
  };

  if (!visible || !badge) {
    return null;
  }

  const Icon = badge.icon;
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = Animated.multiply(scaleAnim, pulseAnim);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Confetti particles */}
        {confettiAnimations.map((anim, index) => {
          const angle = (360 / confettiAnimations.length) * index;
          const distance = SCREEN_WIDTH * 0.6;
          const x = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_WIDTH / 2, SCREEN_WIDTH / 2 + Math.cos((angle * Math.PI) / 180) * distance],
          });
          const y = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_HEIGHT / 2, SCREEN_HEIGHT / 2 + Math.sin((angle * Math.PI) / 180) * distance],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 1, 0],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  left: x,
                  top: y,
                  opacity,
                  backgroundColor: [colors.brand.primary, colors.success.main, colors.warning.main, colors.error.main][index % 4],
                },
              ]}
            />
          );
        })}

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale }],
            },
          ]}
        >
          <Card style={styles.card}>
            {/* Badge Icon */}
            <Animated.View
              style={[
                styles.badgeContainer,
                {
                  transform: [{ rotate }, { scale: pulseAnim }],
                },
              ]}
            >
              <View style={[styles.badgeCircle, { backgroundColor: badge.color }]}>
                <Icon size={64} color={colors.neutral[0]} />
              </View>
            </Animated.View>

            {/* Title */}
            <Headline style={styles.title}>Parabéns!</Headline>
            <Title2 style={styles.badgeName}>{badge.name}</Title2>
            <Caption style={styles.badgeDescription}>{badge.description}</Caption>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButtonContainer}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <View style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Continuar</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  card: {
    width: '90%',
    maxWidth: 400,
    padding: spacing[6],
    alignItems: 'center',
    ...shadows.xl,
  },
  badgeContainer: {
    marginBottom: spacing[4],
  },
  badgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  badgeName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  closeButtonContainer: {
    width: '100%',
  },
  closeButton: {
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.neutral[0],
    fontSize: 16,
    fontWeight: '600',
  },
});

