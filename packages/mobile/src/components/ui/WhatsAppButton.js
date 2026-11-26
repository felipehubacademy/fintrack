import React from 'react';
import { TouchableOpacity, StyleSheet, Linking, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { zulChatLink } from '@fintrack/shared/config';
import { Text } from './Text';
import { WHATSAPP_GREEN, WHATSAPP_TEXT } from '../../theme/colors';
import { useI18n } from '../../contexts/I18nContext';
import { HapticFeedback } from '../../utils/haptics';

/** Opens a WhatsApp chat with Zul, with `text` pre-filled. */
export function openZulChat(text) {
  return Linking.openURL(zulChatLink(text)).catch(() => {});
}

/**
 * "Log it on WhatsApp" button. The only place the WhatsApp green is used.
 *
 * <WhatsAppButton text={t('dashboard.whatsapp.example')} />
 * size: 'lg' (home, full width) | 'md' (empty states)
 */
export function WhatsAppButton({ text, label, size = 'md', style }) {
  const { t } = useI18n();
  const title = label || t('dashboard.whatsapp.button');
  const prefill = text ?? t('dashboard.whatsapp.example');

  return (
    <TouchableOpacity
      style={[styles.base, size === 'lg' ? styles.lg : styles.md, style]}
      onPress={() => {
        HapticFeedback.light();
        openZulChat(prefill);
      }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={t('dashboard.whatsapp.hint')}
    >
      <View style={styles.content}>
        <MessageCircle size={size === 'lg' ? 22 : 18} color={WHATSAPP_TEXT} />
        <Text style={[styles.label, size === 'lg' && styles.labelLg]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default WhatsAppButton;

const styles = StyleSheet.create({
  base: {
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  lg: { paddingVertical: 16, paddingHorizontal: 24, alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: WHATSAPP_TEXT, fontSize: 15, fontWeight: '700' },
  labelLg: { fontSize: 17 },
});
