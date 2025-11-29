import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import Logo from '../ui/Logo';

export default function WelcomeStep({ user, organization, onNext, onboardingType }) {
  // Textos dinâmicos baseados no tipo de onboarding
  const getWelcomeText = () => {
    switch(onboardingType) {
      case 'invited':
        return `Vamos dar o seu toque pessoal a ${organization?.name} em apenas alguns passos`;
      case 'solo':
        return `Vamos configurar a ${organization?.name} em apenas alguns passos`;
      case 'admin':
      default:
        return `Vamos configurar a ${organization?.name} em alguns passos`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Logo size="large" style={styles.logo} />
        <Text style={styles.title}>
          Olá, {user?.name?.split(' ')[0]}!
        </Text>
        <Text style={styles.subtitle}>
          {getWelcomeText()}
        </Text>
      </View>

      <Button
        title="Vamos começar!"
        onPress={onNext}
        icon={<ArrowRight size={24} color={colors.neutral[0]} />}
        iconPosition="right"
        size="lg"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[8],
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logo: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
  },
  button: {
    marginTop: spacing[4],
  },
});

