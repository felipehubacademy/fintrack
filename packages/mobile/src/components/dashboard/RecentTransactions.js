import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { TransactionRow } from './TransactionRow';
import { WhatsAppButton } from '../ui/WhatsAppButton';

/** Home: the last few transactions, or what to text Zul when there are none. */
export function RecentTransactions({ transactions = [], onSeeAll, limit = 5 }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const items = transactions.slice(0, limit);
  const example = t('dashboard.whatsapp.example');

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]} accessibilityRole="header">
          {t('dashboard.recent.title')}
        </Text>
        {items.length > 0 && onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.seeAll, { color: colors.brand.primary }]}>{t('dashboard.recent.seeAll')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {t('dashboard.recent.empty', { example })}
            </Text>
            <WhatsAppButton text={example} />
          </View>
        ) : (
          items.map((tx, i) => (
            <TransactionRow key={`${tx.type}-${tx.id || i}`} tx={tx} isLast={i === items.length - 1} />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 12, overflow: 'hidden' },
  empty: { padding: 24, alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
