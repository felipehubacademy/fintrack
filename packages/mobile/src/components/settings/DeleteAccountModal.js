import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { Text } from '../ui/Text';
import { confirmationMatches } from './accountApi';

const ITEM_KEYS = ['login', 'transactions', 'accounts', 'categories', 'receipts', 'chat'];

/**
 * Apple 5.1.1(v): in-app account deletion. Says exactly what is deleted and
 * asks the person to type a word in their language before enabling the button.
 * onConfirm does the work (Settings calls the web API, then signs out).
 */
export function DeleteAccountModal({ visible, onClose, onConfirm, loading = false, errorMessage = null }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const word = t('settings.deleteAccount.confirmWord');
  const isConfirmed = confirmationMatches(typed, word);
  const danger = colors.error?.main || '#F04438';

  useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  if (!visible) return null;

  const close = () => {
    if (loading) return;
    setTyped('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modal, { backgroundColor: colors.background.secondary }]}>
          <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
            <View style={styles.headerLeft}>
              <AlertTriangle size={22} color={danger} />
              <Text style={[styles.title, { color: colors.text.primary }]}>{t('settings.deleteAccount.title')}</Text>
            </View>
            <TouchableOpacity onPress={close} disabled={loading} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.intro, { color: colors.text.primary }]}>{t('settings.deleteAccount.intro')}</Text>

            <View style={[styles.box, { borderColor: danger, backgroundColor: `${danger}10` }]}>
              <Text style={[styles.boxTitle, { color: danger }]}>{t('settings.deleteAccount.whatIsDeleted')}</Text>
              {ITEM_KEYS.map((key) => (
                <View key={key} style={styles.itemRow}>
                  <Text style={[styles.bullet, { color: danger }]}>•</Text>
                  <Text style={[styles.itemText, { color: colors.text.primary }]}>
                    {t(`settings.deleteAccount.items.${key}`)}
                  </Text>
                </View>
              ))}
              <Text style={[styles.note, { color: colors.text.secondary }]}>{t('settings.deleteAccount.sharedNote')}</Text>
              <Text style={[styles.note, { color: colors.text.secondary }]}>{t('settings.deleteAccount.keepNote')}</Text>
            </View>

            <Text style={[styles.label, { color: colors.text.secondary }]}>
              {t('settings.deleteAccount.typeToConfirm', { word })}
            </Text>
            <TextInput
              style={[styles.input, { borderColor: isConfirmed ? danger : colors.border.light, color: colors.text.primary, backgroundColor: colors.background.primary }]}
              value={typed}
              onChangeText={setTyped}
              placeholder={word}
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
              accessibilityLabel={t('settings.deleteAccount.typeToConfirm', { word })}
            />
            {errorMessage ? (
              <Text style={[styles.error, { color: danger }]} accessibilityLiveRegion="polite">{errorMessage}</Text>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
            <TouchableOpacity
              style={[styles.button, { borderWidth: 1, borderColor: colors.border.light }]}
              onPress={close}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{t('settings.deleteAccount.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: danger, opacity: !isConfirmed || loading ? 0.4 : 1 }]}
              onPress={() => { if (isConfirmed && !loading) onConfirm(); }}
              disabled={!isConfirmed || loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isConfirmed || loading }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {loading ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { borderRadius: 16, width: '92%', maxHeight: '88%', overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  content: { padding: 20 },
  intro: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  box: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 20 },
  boxTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  bullet: { fontSize: 14, lineHeight: 20 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600' },
  error: { marginTop: 12, fontSize: 14 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  button: { flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
});
