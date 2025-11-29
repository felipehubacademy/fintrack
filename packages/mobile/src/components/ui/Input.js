import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from './Text';

/**
 * Input Component - Apple-style text input
 * 
 * Features:
 * - Clean minimal design
 * - Optional label
 * - Password visibility toggle
 * - Error states
 * - Icons support
 */
export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  style,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const renderRightIcon = () => {
    if (secureTextEntry) {
      return (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          style={styles.iconButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
          accessibilityHint="Alternar visibilidade da senha"
        >
          {isPasswordVisible ? (
            <EyeOff size={20} color={colors.text.tertiary} />
          ) : (
            <Eye size={20} color={colors.text.tertiary} />
          )}
        </TouchableOpacity>
      );
    }

    if (rightIcon) {
      return (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Ação adicional"
          accessibilityHint="Executar ação adicional"
        >
          {rightIcon}
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="callout" color="secondary" style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithLeftIcon,
            (secureTextEntry || rightIcon) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled }}
          accessibilityRole="text"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {renderRightIcon()}
      </View>

      {error && (
        <Text variant="caption1" style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  label: {
    marginBottom: spacing[1],
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: spacing[1.5],
    height: 52,
  },

  inputContainerFocused: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.background.secondary,
  },

  inputContainerError: {
    borderColor: colors.error.main,
  },

  inputContainerDisabled: {
    opacity: 0.5,
    backgroundColor: colors.neutral[100],
  },

  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    color: colors.text.primary,
    paddingVertical: 0, // Remove default padding
  },

  inputWithLeftIcon: {
    marginLeft: spacing[1],
  },

  inputWithRightIcon: {
    marginRight: spacing[1],
  },

  iconLeft: {
    marginRight: spacing[1],
  },

  iconButton: {
    padding: spacing[0.5],
    marginLeft: spacing[1],
  },

  errorText: {
    color: colors.error.main,
    marginTop: spacing[0.5],
    marginLeft: spacing[0.5],
  },
});
