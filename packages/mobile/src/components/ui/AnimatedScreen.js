import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * AnimatedScreen - Wrapper para adicionar animações de entrada/saída em telas
 * 
 * Props:
 * - children: Conteúdo da tela
 * - fadeIn: Se true, adiciona fade in (default: true)
 * - slideIn: Se true, adiciona slide in (default: true)
 * - slideDirection: 'up' | 'down' | 'left' | 'right' (default: 'up')
 * - duration: Duração da animação em ms (default: 300)
 * - delay: Delay antes de iniciar animação em ms (default: 0)
 * - style: Estilos adicionais
 */
export default function AnimatedScreen({
  children,
  fadeIn = true,
  slideIn = true,
  slideDirection = 'up',
  duration = 300,
  delay = 0,
  style,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(getInitialSlideValue(slideDirection))).current;

  useEffect(() => {
    const animations = [];

    if (fadeIn) {
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (slideIn) {
      animations.push(
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, []);

  const getTransform = () => {
    const transforms = [];
    
    if (slideIn) {
      switch (slideDirection) {
        case 'up':
          transforms.push({ translateY: slideAnim });
          break;
        case 'down':
          transforms.push({ translateY: slideAnim });
          break;
        case 'left':
          transforms.push({ translateX: slideAnim });
          break;
        case 'right':
          transforms.push({ translateX: slideAnim });
          break;
      }
    }

    return transforms;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeIn ? fadeAnim : 1,
          transform: getTransform(),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function getInitialSlideValue(direction) {
  switch (direction) {
    case 'up':
      return 20;
    case 'down':
      return -20;
    case 'left':
      return 20;
    case 'right':
      return -20;
    default:
      return 20;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

