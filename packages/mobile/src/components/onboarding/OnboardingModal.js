import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MessageCircle, Globe } from 'lucide-react-native';
import { zulChatLink } from '@fintrack/shared/config';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Text } from '../ui/Text';
import { LanguageChips, CurrencyPickerModal, currencyLabel } from '../settings/LocalePickers';
import { ONBOARDING_STEPS } from './onboardingState';

const WHATSAPP_GREEN = '#25D366';

/**
 * First-run hello for people who already have an account (created on
 * WhatsApp, plan 3.1). Two short steps, always dismissible:
 *   1. confirm language + currency
 *   2. open the chat with Zul
 * Closing at any point marks it as skipped so it never blocks the app.
 */
export default function OnboardingModal({ visible, onClose, user, organization }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, language, currency, setLanguage, setCurrency, locale } = useI18n();
  const { skipOnboarding, completeOnboarding } = useOnboarding(user, organization);
  const [step, setStep] = useState(0);
  const [showCurrencies, setShowCurrencies] = useState(false);

  const dismiss = () => {
    onClose?.();
    Promise.resolve(skipOnboarding?.()).catch(() => {});
  };

  const finish = () => {
    onClose?.();
    Promise.resolve(completeOnboarding?.()).catch(() => {});
  };

  const openWhatsApp = () => {
    Linking.openURL(zulChatLink(t('onboarding.whatsapp.greeting'))).catch(() => {});
  };

  const total = ONBOARDING_STEPS.length;
  const current = ONBOARDING_STEPS[step];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={dismiss}>
      <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={[styles.stepText, { color: colors.text.secondary }]}>
            {t('onboarding.stepOf', { step: step + 1, total })}
          </Text>
          <TouchableOpacity
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.close')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {current === 'locale' ? (
            <>
              <View style={[styles.icon, { backgroundColor: `${colors.brand.primary}14` }]}>
                <Globe size={32} color={colors.brand.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text.primary }]}>{t('onboarding.locale.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{t('onboarding.locale.subtitle')}</Text>

              <Text style={[styles.label, { color: colors.text.secondary }]}>{t('onboarding.locale.languageLabel')}</Text>
              <LanguageChips value={language} onChange={setLanguage} />

              <Text style={[styles.label, { color: colors.text.secondary }]}>{t('onboarding.locale.currencyLabel')}</Text>
              <TouchableOpacity
                style={[styles.select, { borderColor: colors.border.light, backgroundColor: colors.background.secondary }]}
                onPress={() => setShowCurrencies(true)}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.text.primary, fontSize: 16 }}>{currencyLabel(t, currency, locale)}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.icon, { backgroundColor: `${WHATSAPP_GREEN}1F` }]}>
                <MessageCircle size={32} color={WHATSAPP_GREEN} />
              </View>
              <Text style={[styles.title, { color: colors.text.primary }]}>{t('onboarding.whatsapp.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{t('onboarding.whatsapp.subtitle')}</Text>
              <Text style={[styles.example, { color: colors.text.primary }]}>{t('onboarding.whatsapp.example')}</Text>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {current === 'locale' ? (
            <TouchableOpacity
              style={[styles.primary, { backgroundColor: colors.brand.primary }]}
              onPress={() => setStep(1)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>{t('onboarding.locale.continue')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primary, { backgroundColor: WHATSAPP_GREEN }]}
                onPress={openWhatsApp}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>{t('onboarding.whatsapp.open')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={finish} accessibilityRole="button">
                <Text style={[styles.secondaryText, { color: colors.brand.primary }]}>{t('onboarding.whatsapp.done')}</Text>
              </TouchableOpacity>
            </>
          )}
          {current === 'locale' ? (
            <TouchableOpacity style={styles.secondary} onPress={dismiss} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.text.secondary }]}>{t('onboarding.notNow')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <CurrencyPickerModal
        visible={showCurrencies}
        value={currency}
        onSelect={setCurrency}
        onClose={() => setShowCurrencies(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  stepText: { fontSize: 13, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 24 },
  icon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  example: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  select: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  footer: { gap: 8 },
  primary: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600' },
});
