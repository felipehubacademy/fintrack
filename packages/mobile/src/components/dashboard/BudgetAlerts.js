import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native';
import { spacing, radius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Headline, Callout, Caption } from '../ui/Text';
import { Card, CardContent } from '../ui/Card';
import { ProgressRing } from '../ui/ProgressRing';
import { formatCurrency } from '@fintrack/shared/utils';

export function BudgetAlerts({
  categories = [],
  allCategories = [],
  expanded = false,
  onToggleExpanded,
  onPress,
}) {
  const { colors } = useTheme();

  if (categories.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <AlertTriangle size={18} color={colors.warning.main} />
          <Headline weight="semiBold" style={{ marginLeft: spacing[1] }}>
            Atenção no Orçamento
          </Headline>
        </View>
      </View>

      <Card>
        <CardContent>
          {categories.map((category, index) => {
            const isExceeded = category.percentage >= 100;
            const statusColor = isExceeded ? colors.error.main : colors.warning.main;
            const progress = Math.min(category.percentage / 100, 1);

            return (
              <TouchableOpacity
                key={category.id || index}
                onPress={onPress}
                style={[
                  styles.item,
                  index < categories.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.light,
                  },
                ]}
                activeOpacity={0.7}
              >
                <ProgressRing
                  progress={progress}
                  size={44}
                  strokeWidth={4}
                  color={statusColor}
                  trackColor={colors.border.light}
                  label={`${category.percentage}%`}
                />

                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Callout weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
                      {category.category_name}
                    </Callout>
                  </View>
                  <View style={styles.itemValues}>
                    <Caption color="secondary">
                      {formatCurrency(category.spent)} / {formatCurrency(category.limit)}
                    </Caption>
                  </View>
                  {category.remaining < 0 && (
                    <Caption style={{ color: colors.error.main, marginTop: 2 }}>
                      Excedido em {formatCurrency(Math.abs(category.remaining))}
                    </Caption>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {allCategories.length > 3 && (
            <TouchableOpacity
              style={[styles.expandButton, { borderTopColor: colors.border.light }]}
              onPress={onToggleExpanded}
              activeOpacity={0.7}
            >
              <Caption weight="semiBold" style={{ color: colors.brand.primary }}>
                {expanded ? 'Ver menos' : `Ver todas (${allCategories.length})`}
              </Caption>
              {expanded
                ? <ChevronUp size={16} color={colors.brand.primary} />
                : <ChevronDown size={16} color={colors.brand.primary} />
              }
            </TouchableOpacity>
          )}
        </CardContent>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[1],
    gap: spacing[1],
    borderTopWidth: 1,
  },
});
