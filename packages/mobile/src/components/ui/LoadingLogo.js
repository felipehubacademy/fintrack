import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '../../theme';
import { Text } from './Text';
import { logoFlatSvg } from '../../assets/logoFlatSvg';

/**
 * LoadingLogo - Logo animado da app (substitui ActivityIndicator)
 * Simula o comportamento do LoadingLogo do web
 */
export default function LoadingLogo({ size = 'medium', message = '', fullScreen = false }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false, // Precisa ser false para animar height
      })
    ).start();
  }, [fillAnim]);

  const logoSize = size === 'small' ? 60 : size === 'large' ? 120 : 80;

  const Container = fullScreen ? View : React.Fragment;
  const containerProps = fullScreen ? { style: styles.fullScreenContainer } : {};

  // Interpolar a altura da máscara (de 0% para 100%)
  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, logoSize], // Começa vazio (0) e enche até o topo (logoSize)
  });

  // Interpolar a opacidade (começa em 0.3, vai para 1 no meio)
  const fillOpacity = fillAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 1],
  });

  return (
    <Container {...containerProps}>
      <View 
        style={[styles.container, fullScreen && styles.fullScreenContent]}
        accessibilityRole="progressbar"
        accessibilityLabel={message || "Carregando"}
        accessibilityLiveRegion="polite"
      >
        <View
          style={[
            styles.logoContainer,
            {
              width: logoSize,
              height: logoSize,
            },
          ]}
        >
          <View style={[styles.logoWrapper, { width: logoSize, height: logoSize }]}>
            {/* Logo base - Flight Blue desbotado (fixo) */}
            <SvgXml
              xml={logoFlatSvg}
              width={logoSize}
              height={logoSize}
              style={styles.logoBase}
            />
            
            {/* Logo animado - Deep Sky preenchendo de baixo para cima */}
            <Animated.View
              style={[
                styles.logoFillClip,
                {
                  height: fillHeight, // Anima a altura de 0 a logoSize
                  opacity: fillOpacity,
                },
              ]}
            >
              <View style={styles.logoFillInner}>
                <SvgXml
                  xml={logoFlatSvg}
                  width={logoSize}
                  height={logoSize}
                />
              </View>
            </Animated.View>
          </View>
        </View>

        {message && (
          <Animated.View style={{ opacity: fillOpacity }}>
            <Text
              variant="callout"
              color="primary"
              weight="medium"
              align="center"
              style={styles.message}
            >
              {message}
            </Text>
          </Animated.View>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  fullScreenContent: {
    flex: 1,
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
  },

  logoBase: {
    position: 'absolute',
    opacity: 0.3,
  },

  logoFillClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden', // Essencial para o efeito de preenchimento
  },

  logoFillInner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  message: {
    marginTop: 16,
  },
});

