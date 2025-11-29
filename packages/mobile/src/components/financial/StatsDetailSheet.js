import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Headline, Callout, Caption } from '../ui/Text';
import { formatCurrency } from '@fintrack/shared/utils';

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

const { height } = Dimensions.get('window');

/**
 * StatsDetailSheet - Bottom Sheet para detalhes dos StatCards
 */
export function StatsDetailSheet({ visible, onClose, title, data = [], type = 'default' }) {
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  if (!visible) return null;

  const renderContent = () => (
    <>
      {/* Handle (barra superior) */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Title2 weight="semiBold">{title}</Title2>
        <TouchableOpacity 
          onPress={onClose} 
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          accessibilityHint="Fechar detalhes"
        >
          <X size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        {...(Platform.OS === 'android' ? { 
          nestedScrollEnabled: true,
        } : {})}
        scrollEnabled={true}
      >
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Caption color="secondary">Nenhum dado disponível</Caption>
          </View>
        ) : (
          <View style={styles.list}>
            {data.map((item, index) => (
              <View key={index}>
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    {item.color && (
                      <View 
                        style={[styles.colorDot, { backgroundColor: item.color }]} 
                      />
                    )}
                    <View style={styles.itemInfo}>
                      <Callout weight="medium">{item.label}</Callout>
                      {item.subtitle && (
                        <Caption color="secondary" style={styles.subtitle}>
                          {item.subtitle}
                        </Caption>
                      )}
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Callout weight="semiBold">
                      {formatCurrency(item.value)}
                    </Callout>
                    {item.percentage !== undefined && (
                      <Caption color="secondary" style={styles.percentage}>
                        {item.percentage}%
                      </Caption>
                    )}
                  </View>
                </View>
                
                {/* Breakdown (Crédito, À Vista, etc) */}
                {item.breakdown && item.breakdown.length > 0 && (
                  <View style={styles.breakdown}>
                    {item.breakdown.map((breakdownItem, breakdownIndex) => (
                      <View key={breakdownIndex} style={styles.breakdownItem}>
                        <Caption color="secondary" style={styles.breakdownLabel}>
                          └─ {breakdownItem.label}
                        </Caption>
                        <Caption color="secondary">
                          {formatCurrency(breakdownItem.value)}
                        </Caption>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {Platform.OS === 'android' ? (
          <View style={[styles.sheet, { marginBottom: safeBottom }]}>
            {renderContent()}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            {renderContent()}
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // OVERLAY ESCURO COM FADE
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.85,
    ...(Platform.OS === 'android' && {
      elevation: 8,
    }),
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  closeButton: {
    padding: spacing[1],
  },

  content: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
  },
  contentContainer: {
    // paddingBottom será aplicado dinamicamente com safe area
  },

  emptyState: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },

  list: {
    gap: spacing[2],
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
  },

  colorDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },

  itemInfo: {
    flex: 1,
  },

  subtitle: {
    marginTop: spacing[0.5],
  },

  itemRight: {
    alignItems: 'flex-end',
    marginLeft: spacing[2],
  },

  percentage: {
    marginTop: spacing[0.5],
  },

  breakdown: {
    marginTop: spacing[1],
    marginLeft: spacing[4],
    paddingLeft: spacing[2],
    borderLeftWidth: 2,
    borderLeftColor: colors.border.light,
  },

  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
  },

  breakdownLabel: {
    flex: 1,
  },
});
