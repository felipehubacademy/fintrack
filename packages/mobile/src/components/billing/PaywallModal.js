import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Gift } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useBilling } from '../../hooks/useBilling';
import { useToast } from '../ui/Toast';
import { Text } from '../ui/Text';
import { paywallPrices } from '../../services/billing';
import { legalUrl } from '../settings/accountApi';

// Apple requires working links to the terms (EULA) and privacy policy.
export const LEGAL_BASE_URL = 'https://www.meuazulao.com.br';
const BENEFITS = ['perDay', 'whatsapp', 'shared'];

/**
 * Paywall (plan: day 7 offer, annual highlighted; day 8 win-back first).
 * Purchases only through the store; no external purchase links here.
 */
export function PaywallModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, formatMoney, currency, language } = useI18n();
  const { showToast } = useToast();
  const billing = useBilling();
  const [plan, setPlan] = useState('annual');

  useEffect(() => {
    if (visible) setPlan('annual');
  }, [visible]);

  if (!visible) return null;

  const expired = billing.status === 'expired';
  const prices = paywallPrices({ packages: billing.packages, currency, formatMoney });
  const winbackPkg = billing.winbackOffer;
  const canBuy = billing.purchasesAvailable && Boolean(billing.packages?.monthly || billing.packages?.annual);
  const busy = billing.purchasing || billing.restoring;
  const brand = colors.brand.primary;

  const buy = async (pkg, opts) => {
    if (!pkg || busy) return;
    const result = await billing.purchase(pkg, opts);
    if (result.ok) {
      showToast(t('billing.paywall.success'), 'success');
      onClose();
    } else if (!result.cancelled && result.error) {
      showToast(t('billing.paywall.error'), 'error');
    }
  };

  const restore = async () => {
    if (busy) return;
    const result = await billing.restore();
    if (result.ok && result.restored) {
      showToast(t('billing.paywall.restored'), 'success');
      onClose();
    } else if (result.ok) {
      showToast(t('billing.paywall.nothingToRestore'), 'info');
    } else {
      showToast(t('billing.paywall.error'), 'error');
    }
  };

  const openLegal = (kind) => {
    Linking.openURL(legalUrl(kind, language, LEGAL_BASE_URL))
      .catch(() => showToast(t('billing.paywall.openLinkError'), 'error'));
  };

  const selectedPkg = plan === 'annual' ? billing.packages?.annual : billing.packages?.monthly;
  const disclosureKey = Platform.OS === 'android' ? 'android' : 'ios';

  const PlanCard = ({ id, title, price, sub, badge }) => {
    const selected = plan === id;
    return (
      <TouchableOpacity
        style={[
          styles.plan,
          { borderColor: selected ? brand : colors.border.light, backgroundColor: selected ? colors.brand.bg : colors.background.secondary },
        ]}
        onPress={() => setPlan(id)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={[title, price, sub, badge].filter(Boolean).join(', ')}
      >
        <View style={[styles.radio, { borderColor: selected ? brand : colors.border.main }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: brand }]} /> : null}
        </View>
        <View style={styles.flex}>
          <View style={styles.planTitleRow}>
            <Text style={[styles.planTitle, { color: colors.text.primary }]}>{title}</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: colors.success.main }]}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.planPrice, { color: colors.text.primary }]}>{price}</Text>
          {sub ? <Text style={[styles.planSub, { color: colors.text.secondary }]}>{sub}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background.primary, paddingBottom: insets.bottom }]}>
        <View style={styles.closeRow}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('billing.paywall.close')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text.primary }]} accessibilityRole="header">
            {t(expired ? 'billing.paywall.titleExpired' : 'billing.paywall.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {t(expired ? 'billing.paywall.subtitleExpired' : 'billing.paywall.subtitle')}
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((key) => (
              <View key={key} style={styles.benefitRow}>
                <View style={[styles.check, { backgroundColor: colors.brand.bg }]}>
                  <Check size={14} color={brand} strokeWidth={3} />
                </View>
                <Text style={[styles.benefitText, { color: colors.text.primary }]}>{t(`billing.paywall.benefits.${key}`)}</Text>
              </View>
            ))}
          </View>

          {winbackPkg && prices.winback ? (
            <View style={[styles.offer, { borderColor: brand, backgroundColor: colors.brand.bg }]}>
              <View style={styles.offerBadgeRow}>
                <Gift size={16} color={brand} />
                <Text style={[styles.offerBadge, { color: brand }]}>{t('billing.paywall.winback.badge')}</Text>
              </View>
              <Text style={[styles.offerTitle, { color: colors.text.primary }]}>
                {t('billing.paywall.winback.title', { price: prices.winback })}
              </Text>
              <Text style={[styles.planSub, { color: colors.text.secondary }]}>
                {t('billing.paywall.winback.body', { monthly: prices.monthly })}
              </Text>
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: brand, opacity: !billing.purchasesAvailable || busy ? 0.5 : 1 }]}
                onPress={() => buy(winbackPkg, { winback: true })}
                disabled={!billing.purchasesAvailable || busy}
                accessibilityRole="button"
              >
                {billing.purchasing ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={styles.ctaText}>{t('billing.paywall.winback.cta')}</Text>
                )}
              </TouchableOpacity>
              <Text style={[styles.offerNote, { color: colors.text.secondary }]}>
                {t('billing.paywall.disclosure.winback', { winbackPrice: prices.winback, monthlyPrice: prices.monthly })}
              </Text>
            </View>
          ) : null}

          {winbackPkg && prices.winback ? (
            <Text style={[styles.orPlans, { color: colors.text.secondary }]}>{t('billing.paywall.winback.orPlans')}</Text>
          ) : null}

          <PlanCard
            id="annual"
            title={t('billing.paywall.annual')}
            price={t('billing.paywall.perYear', { price: prices.annual })}
            sub={prices.annualPerMonth ? t('billing.paywall.annualPerMonth', { price: prices.annualPerMonth }) : null}
            badge={prices.savingsPercent > 0 ? t('billing.paywall.save', { percent: prices.savingsPercent }) : null}
          />
          <PlanCard
            id="monthly"
            title={t('billing.paywall.monthly')}
            price={t('billing.paywall.perMonth', { price: prices.monthly })}
          />

          {!canBuy ? (
            <Text style={[styles.unavailable, { color: colors.text.secondary }]}>{t('billing.paywall.unavailable')}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.cta, { backgroundColor: brand, opacity: !canBuy || !selectedPkg || busy ? 0.5 : 1 }]}
            onPress={() => buy(selectedPkg)}
            disabled={!canBuy || !selectedPkg || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canBuy || !selectedPkg || busy }}
          >
            {billing.purchasing ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={styles.ctaText}>{t('billing.paywall.subscribe')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restore}
            onPress={restore}
            disabled={busy || !billing.purchasesAvailable}
            accessibilityRole="button"
          >
            <Text style={[styles.restoreText, { color: billing.purchasesAvailable ? brand : colors.text.tertiary }]}>
              {billing.restoring ? t('billing.paywall.restoring') : t('billing.paywall.restore')}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclosure, { color: colors.text.secondary }]}>
            {t(`billing.paywall.disclosure.${disclosureKey}`, { monthlyPrice: prices.monthly, annualPrice: prices.annual })}
          </Text>
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => openLegal('terms')} accessibilityRole="link">
              <Text style={[styles.legalLink, { color: brand }]}>{t('billing.paywall.terms')}</Text>
            </TouchableOpacity>
            <Text style={[styles.legalDot, { color: colors.text.tertiary }]}>·</Text>
            <TouchableOpacity onPress={() => openLegal('privacy')} accessibilityRole="link">
              <Text style={[styles.legalLink, { color: brand }]}>{t('billing.paywall.privacy')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default PaywallModal;

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  flex: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 17, marginTop: 8, lineHeight: 24 },
  benefits: { marginTop: 20, marginBottom: 20, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 15, lineHeight: 20 },
  offer: { borderWidth: 2, borderRadius: 12, padding: 16, marginBottom: 12 },
  offerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  offerBadge: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  offerTitle: { fontSize: 22, fontWeight: '800' },
  offerNote: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  orPlans: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginVertical: 8 },
  plan: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle: { fontSize: 15, fontWeight: '700' },
  planPrice: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  planSub: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  unavailable: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  cta: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  restore: { alignSelf: 'center', paddingVertical: 14 },
  restoreText: { fontSize: 15, fontWeight: '600' },
  disclosure: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 },
  legalLink: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  legalDot: { fontSize: 13 },
});
