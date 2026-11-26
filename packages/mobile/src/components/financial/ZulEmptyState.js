import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { zulChatLink } from '@fintrack/shared/config';
import { useI18n } from '../../contexts/I18nContext';
import { spacing } from '../../theme';
import { Text, Callout } from '../ui/Text';

const WHATSAPP_GREEN = '#25D366';

/**
 * Empty state that teaches what to text Zul, with a button that opens
 * WhatsApp with the example pre-filled.
 *
 * Props: icon (element), message (string), example (text pre-filled in WhatsApp).
 */
export function ZulEmptyState({ icon, message, example, style }) {
  const { t } = useI18n();

  const openWhatsApp = () => {
    Linking.openURL(zulChatLink(example)).catch(() => {});
  };

  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Callout color="secondary" align="center" style={styles.message}>
        {message}
      </Callout>
      <TouchableOpacity
        style={styles.button}
        onPress={openWhatsApp}
        accessibilityRole="button"
        accessibilityLabel={t('finances.empty.whatsappA11y')}
      >
        <MessageCircle size={18} color="#FFFFFF" />
        <Text weight="semiBold" style={styles.buttonText}>
          {t('finances.empty.whatsappButton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
  },
  icon: {
    marginBottom: spacing[2],
  },
  message: {
    marginBottom: spacing[2],
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 999,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
  },
  buttonText: {
    color: '#FFFFFF',
  },
});

export default ZulEmptyState;
