import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * AnimatedView - Componente para animar views individuais
 * 
 * Props:
 * - children: Conteúdo a ser animado
 * - fadeIn: Se true, adiciona fade in (default: true)
 * - scaleIn: Se true, adiciona scale in (default: false)
 * - delay: Delay antes de iniciar animação em ms (default: 0)
 * - duration: Duração da animação em ms (default: 300)
 * - style: Estilos adicionais
 */
export default function AnimatedView({
  children,
  fadeIn = true,
  scaleIn = false,
  delay = 0,
  duration = 300,
  style,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(scaleIn ? 0.8 : 1)).current;

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

    if (scaleIn) {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    } else {
      // Se não há animações, garantir que o conteúdo seja visível
      fadeAnim.setValue(1);
    }
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: scaleIn ? [{ scale: scaleAnim }] : [],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

