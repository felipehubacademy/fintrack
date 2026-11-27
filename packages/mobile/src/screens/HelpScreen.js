import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Search, ChevronDown, ChevronUp } from 'lucide-react-native';
import { spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { Headline, Callout, Caption } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useOrganization } from '../hooks/useOrganization';

// Order of the questions; text lives in settings.helpCenter.faq.<key>.
const FAQ_KEYS = ['what', 'log', 'installments', 'edit', 'couple', 'bank', 'price', 'delete'];

export default function HelpScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useOrganization();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  const faqs = useMemo(() => FAQ_KEYS.map((key) => ({
    key,
    q: t(`settings.helpCenter.faq.${key}.q`),
    a: t(`settings.helpCenter.faq.${key}.a`),
  })), [t]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? faqs.filter((f) => f.q.toLowerCase().includes(needle) || f.a.toLowerCase().includes(needle))
    : faqs;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScreenHeader user={user} title={t('settings.helpCenter.title')} showBackButton />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Headline weight="bold" style={{ marginBottom: spacing[0.5] }}>{t('settings.helpCenter.heading')}</Headline>
        <Caption color="secondary" style={{ marginBottom: spacing[2] }}>{t('settings.helpCenter.subtitle')}</Caption>

        <View style={[styles.search, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder={t('settings.helpCenter.search')}
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={t('settings.helpCenter.search')}
          />
        </View>

        {visible.map((faq) => (
          <Card key={faq.key} style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => setOpen(open === faq.key ? null : faq.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: open === faq.key }}
            >
              <Callout weight="semiBold" style={{ flex: 1, paddingRight: spacing[2] }}>{faq.q}</Callout>
              {open === faq.key
                ? <ChevronUp size={20} color={colors.brand.primary} />
                : <ChevronDown size={20} color={colors.text.tertiary} />}
            </TouchableOpacity>
            {open === faq.key && (
              <View style={styles.faqAnswer}>
                <Callout color="secondary" style={{ lineHeight: 22 }}>{faq.a}</Callout>
              </View>
            )}
          </Card>
        ))}

        {visible.length === 0 && (
          <Card style={styles.emptyCard}>
            <Callout color="secondary" align="center" style={{ marginBottom: spacing[2] }}>
              {t('settings.helpCenter.noResults', { query })}
            </Callout>
            <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button">
              <Callout style={{ color: colors.brand.primary }} align="center" weight="semiBold">
                {t('settings.helpCenter.clearSearch')}
              </Callout>
            </TouchableOpacity>
          </Card>
        )}

        <Card style={styles.ctaCard}>
          <Headline weight="bold" align="center" style={{ marginBottom: spacing[1] }}>{t('settings.helpCenter.ctaTitle')}</Headline>
          <Callout color="secondary" align="center" style={{ marginBottom: spacing[2] }}>{t('settings.helpCenter.ctaText')}</Callout>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.brand.primary }]}
            onPress={() => navigation.navigate('Support')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Callout weight="semiBold" style={{ color: '#FFFFFF' }}>{t('settings.helpCenter.ctaButton')}</Callout>
          </TouchableOpacity>
        </Card>

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[2] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    marginBottom: spacing[2],
  },
  searchInput: { flex: 1, fontSize: 16 },
  faqCard: { marginBottom: spacing[1.5], padding: 0, overflow: 'hidden', borderRadius: 12 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing[2] },
  faqAnswer: { paddingHorizontal: spacing[2], paddingBottom: spacing[2] },
  emptyCard: { alignItems: 'center', padding: spacing[3], marginBottom: spacing[2] },
  ctaCard: { alignItems: 'center', padding: spacing[3], marginTop: spacing[2], borderRadius: 12 },
  ctaButton: { paddingHorizontal: spacing[4], paddingVertical: spacing[1.5], borderRadius: 999, width: '100%', alignItems: 'center' },
});
