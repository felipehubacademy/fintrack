import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout } from './Text';
import { Button } from './Button';
import { useI18n } from '../../contexts/I18nContext';

const { width } = Dimensions.get('window');

/**
 * AlertModal: simple alert (no confirmation). Pass translated strings.
 *
 * <AlertModal visible onClose={onClose} title={t('...')} message={t('...')} type="warning" />
 */
export default function AlertModal({
  visible,
  onClose,
  title,
  message = '',
  type = 'info', // warning, danger, info, success
  buttons = [],
}) {
  const { t } = useI18n();
  if (!visible) return null;
  const titleText = title || t('dashboard.ui.alertTitle');

  const getIcon = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return <AlertTriangle size={32} color={colors.error.main} />;
      case 'success':
        return <CheckCircle size={32} color={colors.success.main} />;
      case 'info':
      default:
        return <Info size={32} color={colors.info.main} />;
      case 'warning':
        return <AlertTriangle size={32} color={colors.warning.main} />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
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
                {titleText}
              </Title2>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
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
            {buttons && buttons.length > 0 ? (
              buttons.map((button, index) => (
                <Button
                  key={index}
                  title={button.text}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    }
                    onClose();
                  }}
                  variant={index === 0 ? 'primary' : 'outline'}
                  style={[styles.footerButton, buttons.length > 1 && { flex: 1 }]}
                />
              ))
            ) : (
              <Button
                title={t('common.ok')}
                onPress={onClose}
                style={styles.footerButton}
              />
            )}
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
    padding: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    flexDirection: 'row',
    gap: spacing[2],
  },
  footerButton: {
    flex: 1,
  },
});

