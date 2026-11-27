import React from 'react';
import { View, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { currencySymbol } from '@fintrack/shared/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { Text } from '../ui/Text';

/** Language names are shown in their own language (English, Português, Español). */
export function LanguageChips({ value, onChange }) {
  const { colors } = useTheme();
  const { t, languages } = useI18n();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {languages.map((lang) => {
        const selected = lang === value;
        return (
          <TouchableOpacity
            key={lang}
            onPress={() => onChange(lang)}
            style={[
              styles.chip,
              { borderColor: selected ? colors.brand.primary : colors.border.light },
              selected && { backgroundColor: `${colors.brand.primary}14` },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={{ color: selected ? colors.brand.primary : colors.text.primary, fontWeight: selected ? '600' : '400' }}>
              {t(`common.languages.${lang}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function currencyLabel(t, code, locale) {
  const symbol = currencySymbol({ currency: code, locale });
  const name = t(`settings.currencies.${code}`, { defaultValue: code });
  return symbol && symbol !== code ? `${name} (${symbol})` : `${name} (${code})`;
}

/** Full-screen list of supported currencies. */
export function CurrencyPickerModal({ visible, value, onSelect, onClose }) {
  const { colors } = useTheme();
  const { t, currencies, locale } = useI18n();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background.secondary }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>
              {t('settings.currency.pickerTitle')}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.text.secondary }]}>{t('settings.currency.hint')}</Text>
          <ScrollView>
            {currencies.map((code) => {
              const selected = code === value;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.option, { borderBottomColor: colors.border.light }]}
                  onPress={() => { onSelect(code); onClose(); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionCode, { color: colors.text.secondary }]}>{code}</Text>
                  <Text style={[styles.optionLabel, { color: colors.text.primary }]}>
                    {currencyLabel(t, code, locale)}
                  </Text>
                  {selected ? <Check size={20} color={colors.brand.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Small modal with the three languages (used by Settings). */
export function LanguagePickerModal({ visible, value, onSelect, onClose }) {
  const { colors } = useTheme();
  const { t, languages } = useI18n();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.sheetShort, { backgroundColor: colors.background.secondary }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>
              {t('settings.language.pickerTitle')}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          {languages.map((lang) => {
            const selected = lang === value;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.option, { borderBottomColor: colors.border.light }]}
                onPress={() => { onSelect(lang); onClose(); }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.optionLabel, { color: colors.text.primary }]}>
                  {t(`common.languages.${lang}`)}
                </Text>
                {selected ? <Check size={20} color={colors.brand.primary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sheetShort: { maxHeight: '50%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  optionCode: { width: 44, fontSize: 13, fontWeight: '600' },
  optionLabel: { flex: 1, fontSize: 16 },
});
