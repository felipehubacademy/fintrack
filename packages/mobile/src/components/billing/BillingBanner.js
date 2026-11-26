import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { useBilling } from '../../hooks/useBilling';
import { Text } from '../ui/Text';
import { bannerKind } from './planStatus';

export function BillingBanner({ style }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const billing = useBilling();
  const kind = bannerKind(billing, isFeatureEnabled('paywall'));
  if (!kind || billing.loading) return null;

  const expired = kind === 'expired';
  const tint = expired ? colors.warning.main : colors.brand.primary;
  const message = expired
    ? t('billing.banner.expired')
    : t('billing.banner.trialEnding', { count: billing.daysLeft });

  return (
    <View style={[styles.banner, { backgroundColor: expired ? colors.warning.bg : colors.brand.bg }, style]}>
      <Clock size={18} color={tint} />
      <Text style={[styles.text, { color: colors.text.primary }]}>{message}</Text>
      <TouchableOpacity onPress={billing.showPaywall} accessibilityRole="button" hitSlop={8}>
        <Text style={[styles.cta, { color: colors.brand.primary }]}>
          {expired ? t('billing.banner.ctaExpired') : t('billing.banner.cta')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default BillingBanner;

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 16 },
  text: { flex: 1, fontSize: 14, lineHeight: 19 },
  cta: { fontSize: 14, fontWeight: '700' },
});
