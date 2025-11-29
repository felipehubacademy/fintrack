import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { AlertTriangle, X, Info } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Callout } from './Text';
import { Button } from './Button';
import { HapticFeedback } from '../../utils/haptics';

const { width } = Dimensions.get('window');

/**
 * ConfirmationModal - Modal de confirmação genérico
 * 
 * Uso:
 * <ConfirmationModal
 *   visible={visible}
 *   onClose={onClose}
 *   onConfirm={handleConfirm}
 *   title="Confirmar ação"
 *   message="Tem certeza que deseja continuar?"
 *   confirmText="Confirmar"
 *   cancelText="Cancelar"
 *   type="warning" // warning, danger, info
 * />
 */
export default function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // warning, danger, info
  loading = false,
}) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={32} color={colors.error.main} />;
      case 'info':
        return <Info size={32} color={colors.info.main} />;
      case 'warning':
      default:
        return <AlertTriangle size={32} color={colors.warning.main} />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return { backgroundColor: colors.error.main };
      case 'info':
        return { backgroundColor: colors.info.main };
      case 'warning':
      default:
        return { backgroundColor: colors.warning.main };
    }
  };

  const handleConfirm = () => {
    if (type === 'danger') {
      HapticFeedback.warning();
    } else {
      HapticFeedback.medium();
    }
    onConfirm();
  };

  const handleClose = () => {
    HapticFeedback.light();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>{getIcon()}</View>
              <Title2 weight="semiBold" style={styles.title}>
                {title}
              </Title2>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton} 
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              accessibilityState={{ disabled: loading }}
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Callout color="secondary" style={styles.message}>
              {message}
            </Callout>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title={cancelText}
              variant="outline"
              onPress={handleClose}
              disabled={loading}
              style={styles.footerButton}
            />
            <Button
              title={confirmText}
              onPress={handleConfirm}
              disabled={loading}
              loading={loading}
              style={[styles.footerButton, getConfirmButtonStyle()]}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
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
    maxWidth: 400,
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
    marginRight: spacing[2],
  },
  iconContainer: {
    marginRight: spacing[2],
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    padding: spacing[3],
  },
  message: {
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    padding: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    flex: 1,
  },
});

