import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Callout } from './Text';
import { TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    backgroundColor: colors.success.main,
    iconColor: colors.neutral[0],
  },
  error: {
    icon: XCircle,
    backgroundColor: colors.error.main,
    iconColor: colors.neutral[0],
  },
  warning: {
    icon: AlertCircle,
    backgroundColor: colors.warning.main,
    iconColor: colors.neutral[0],
  },
  info: {
    icon: Info,
    backgroundColor: colors.info.main,
    iconColor: colors.neutral[0],
  },
};

/**
 * Toast - Componente de notificação toast
 * 
 * Uso:
 * const { showToast } = useToast();
 * showToast('Mensagem de sucesso', 'success');
 */
export function Toast({ visible, message, type = 'info', duration = 3000, onHide }) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrada
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  if (!visible || !message) return null;

  const toastConfig = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = toastConfig.icon;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: toastConfig.backgroundColor,
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.content}>
          <Icon size={20} color={toastConfig.iconColor} />
          <Text variant="callout" weight="medium" style={styles.message}>
            {message}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={hideToast} 
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Fechar notificação"
        >
          <X size={16} color={toastConfig.iconColor} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing[2],
    right: spacing[2],
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    minHeight: 56,
    width: width - spacing[2] * 2,
    ...shadows.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing[2],
  },
  message: {
    color: colors.neutral[0],
    marginLeft: spacing[2],
    flex: 1,
  },
  closeButton: {
    padding: spacing[0.5],
  },
});

/**
 * Hook para gerenciar Toast
 */
let toastRef = null;

export function useToast() {
  const showToast = (message, type = 'info', duration = 3000) => {
    if (toastRef) {
      toastRef.show(message, type, duration);
    }
  };

  return { showToast };
}

/**
 * ToastProvider - Provider para gerenciar toast globalmente
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = React.useState({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
  });

  React.useEffect(() => {
    toastRef = {
      show: (message, type, duration) => {
        setToast({ visible: true, message, type, duration });
      },
      hide: () => {
        setToast((prev) => ({ ...prev, visible: false }));
      },
    };

    return () => {
      toastRef = null;
    };
  }, []);

  return (
    <>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

