import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Hook para animações de entrada/saída em telas
 * 
 * @param {Object} options
 * @param {boolean} options.fadeIn - Se true, adiciona fade in (default: true)
 * @param {boolean} options.slideIn - Se true, adiciona slide in (default: true)
 * @param {string} options.slideDirection - 'up' | 'down' | 'left' | 'right' (default: 'up')
 * @param {number} options.duration - Duração da animação em ms (default: 300)
 * @param {number} options.delay - Delay antes de iniciar animação em ms (default: 0)
 * @returns {Object} { fadeAnim, slideAnim, animatedStyle }
 */
export function useScreenAnimation({
  fadeIn = true,
  slideIn = true,
  slideDirection = 'up',
  duration = 300,
  delay = 0,
} = {}) {
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

  const animatedStyle = {
    opacity: fadeIn ? fadeAnim : 1,
    transform: getTransform(),
  };

  return {
    fadeAnim,
    slideAnim,
    animatedStyle,
  };
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

