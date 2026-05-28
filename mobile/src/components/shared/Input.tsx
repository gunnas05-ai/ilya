import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, radius } from '../../theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  containerStyle?: any;
}

export function Input({
  label,
  error,
  success,
  disabled,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Determine border color based on states
  let borderColor = colors.border;
  if (isFocused) {
    borderColor = colors.primary;
  } else if (error) {
    borderColor = colors.danger;
  } else if (success) {
    borderColor = colors.success;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Top Label */}
      <Text
        style={[
          typography.label,
          { color: error ? colors.danger : isFocused ? colors.primary : colors.textSecondary },
          styles.label,
        ]}
      >
        {label}
      </Text>

      {/* Input Field */}
      <TextInput
        onFocus={handleFocus}
        onBlur={handleBlur}
        editable={!disabled}
        placeholderTextColor={colors.textTertiary}
        style={[
          typography.body,
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: borderColor,
            color: disabled ? colors.disabled : colors.text,
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
        {...props}
      />

      {/* Sub-text Error Helper */}
      {error && (
        <Text style={[typography.small, { color: colors.danger, marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
});
