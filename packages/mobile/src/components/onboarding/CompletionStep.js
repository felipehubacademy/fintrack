import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

export default function CompletionStep({ organization, onComplete }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Tudo Pronto!
        </Text>
        <Text style={styles.subtitle}>
          <Text style={styles.organizationName}>{organization?.name}</Text> está configurada
        </Text>
      </View>

      <Button
        title="Concluir"
        onPress={onComplete}
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
  },
  organizationName: {
    fontWeight: 'bold',
    color: colors.brand.primary,
  },
  button: {
    marginTop: spacing[4],
  },
});

