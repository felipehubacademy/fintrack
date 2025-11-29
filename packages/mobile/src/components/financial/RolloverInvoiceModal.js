import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Headline, Callout, Caption } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency } from '@fintrack/shared/utils';

/**
 * RolloverInvoiceModal - Modal para mover saldo restante para próxima fatura
 */
export default function RolloverInvoiceModal({
  visible,
  onClose,
  onConfirm,
  invoice,
  card,
  remainingAmount
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Animações
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  if (!visible || !invoice || !card) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <AlertTriangle size={24} color={colors.error.main} />
              </View>
              <Headline weight="semiBold" style={{ flex: 1 }}>
                Lançar saldo restante
              </Headline>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              disabled={isConfirming}
              style={styles.closeButton}
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Caption color="secondary" style={styles.description}>
              O saldo restante desta fatura será lançado como uma despesa na próxima fatura.
            </Caption>

            {/* Valor */}
            <Card style={styles.amountCard}>
              <View style={styles.amountRow}>
                <Caption weight="medium" color="secondary">Valor a transferir:</Caption>
                <Headline weight="bold" style={{ color: colors.error.main }}>
                  {formatCurrency(remainingAmount)}
                </Headline>
              </View>
            </Card>

            {/* Disclaimers */}
            <View style={styles.disclaimers}>
              <View style={styles.disclaimerItem}>
                <Text style={styles.bullet}>•</Text>
                <Caption color="secondary" style={styles.disclaimerText}>
                  A despesa aparecerá na próxima fatura com a descrição <Callout weight="semiBold">"Saldo anterior"</Callout>.
                </Caption>
              </View>
              <View style={styles.disclaimerItem}>
                <Text style={styles.bullet}>•</Text>
                <Caption color="secondary" style={styles.disclaimerText}>
                  Eventuais <Callout weight="semiBold">encargos e juros</Callout> calculados pelo banco precisarão ser lançados manualmente.
                </Caption>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              variant="outline"
              onPress={onClose}
              disabled={isConfirming}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleConfirm}
              disabled={isConfirming}
              style={styles.confirmButton}
            >
              {isConfirming ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator size="small" color={colors.neutral[0]} />
                  <Callout weight="semiBold" style={{ color: colors.neutral[0], marginLeft: spacing[1] }}>
                    Lançando...
                  </Callout>
                </View>
              ) : (
                'Confirmar'
              )}
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[3],
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '100%',
    maxWidth: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing[2],
  },
  closeButton: {
    padding: spacing[1],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing[3],
  },
  description: {
    marginBottom: spacing[4],
  },
  amountCard: {
    padding: spacing[3],
    backgroundColor: colors.error.bg,
    borderColor: colors.error.main,
    marginBottom: spacing[4],
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disclaimers: {
    gap: spacing[2],
  },
  disclaimerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    color: colors.error.main,
    fontWeight: 'bold',
    marginRight: spacing[1],
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.error.main,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

