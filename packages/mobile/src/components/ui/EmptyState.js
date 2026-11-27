import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { Text, Title2, Callout } from './Text';
import { Button } from './Button';
import Logo from './Logo';
import { WhatsAppButton } from './WhatsAppButton';
import { useI18n } from '../../contexts/I18nContext';

/**
 * EmptyState
 *
 * Launch rule: an empty state never just says "no data". It tells the user
 * what to text Zul and offers a button that opens WhatsApp with that text.
 *
 * Props:
 * - icon / emoji / logo: visual on top
 * - title, description (alias: subtitle): copy (pass translated strings)
 * - zulText: example message for Zul; shows the WhatsApp button pre-filled
 * - whatsappLabel: label for that button (default "Log it on WhatsApp")
 * - actionLabel (alias: actionTitle) + onAction: secondary button (e.g. manual add)
 */
export function EmptyState({
  emoji,
  icon,
  logo = false,
  title,
  subtitle,
  description,
  zulText,
  whatsappLabel,
  actionLabel,
  actionTitle,
  onAction,
  style,
}) {
  const { t } = useI18n();
  const displayTitle = title || t('dashboard.ui.emptyTitle');
  const displayDescription = description || subtitle || (title ? '' : t('dashboard.ui.emptyBody'));
  const displayActionLabel = actionLabel || actionTitle;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={displayDescription ? `${displayTitle}. ${displayDescription}` : displayTitle}
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

      {!!displayDescription && (
        <Callout color="secondary" align="center" style={styles.description}>
          {displayDescription}
        </Callout>
      )}

      {!!zulText && (
        <WhatsAppButton text={zulText} label={whatsappLabel} style={styles.whatsapp} />
      )}

      {displayActionLabel && onAction && (
        <Button
          title={displayActionLabel}
          variant={zulText ? 'ghost' : 'primary'}
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

export default EmptyState;

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
    marginBottom: spacing[3],
    maxWidth: 300,
    lineHeight: 20,
  },
  whatsapp: {
    marginTop: spacing[0.5],
  },
  button: {
    marginTop: spacing[1.5],
    minWidth: 160,
  },
});
