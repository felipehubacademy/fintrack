import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { Text, Title2, Callout } from './Text';
import { Button } from './Button';
import Logo from './Logo';

/**
 * EmptyState - Componente para estados vazios melhorado
 * 
 * Props:
 * - emoji: Emoji para exibir (string)
 * - icon: Componente de ícone (React element)
 * - logo: Se true, exibe o logo da app ao invés de emoji/icon
 * - title: Título principal
 * - subtitle: Subtítulo/descrição
 * - description: Alias para subtitle
 * - actionLabel: Label do botão de ação
 * - actionTitle: Alias para actionLabel
 * - onAction: Callback quando botão é pressionado
 * - style: Estilos adicionais
 */
export default function EmptyState({
  emoji,
  icon,
  logo = false,
  title = 'Nenhum item',
  subtitle = 'Não há itens para exibir',
  description,
  actionLabel,
  actionTitle,
  onAction,
  style,
}) {
  const displayTitle = title;
  const displayDescription = description || subtitle;
  const displayActionLabel = actionLabel || actionTitle;

  return (
    <View 
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={`${displayTitle}. ${displayDescription}`}
    >
      {logo && (
        <View style={styles.logoContainer}>
          <Logo size="medium" />
        </View>
      )}
      {!logo && emoji && (
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
      )}
      {!logo && icon && <View style={styles.iconContainer}>{icon}</View>}
      
      <Title2 weight="semiBold" align="center" style={styles.title}>
        {displayTitle}
      </Title2>
      
      <Callout color="secondary" align="center" style={styles.description}>
        {displayDescription}
      </Callout>
      
      {displayActionLabel && onAction && (
        <Button
          title={displayActionLabel}
          variant="primary"
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    minHeight: 200,
  },
  emojiContainer: {
    marginBottom: spacing[3],
    paddingTop: spacing[2],
  },
  emoji: {
    fontSize: 64,
    lineHeight: 80,
  },
  logoContainer: {
    marginBottom: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: spacing[1],
    maxWidth: 300,
  },
  description: {
    marginBottom: spacing[4],
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing[1],
    minWidth: 160,
  },
});

