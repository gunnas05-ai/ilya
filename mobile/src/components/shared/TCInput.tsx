import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, radius } from '../../theme';

interface TCInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  editable?: boolean;
  placeholder?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  containerStyle?: any;
}

const TC_LENGTH = 11;

function stripNonDigits(text: string): string {
  return text.replace(/\D/g, '');
}

function validateTC(tc: string): string | null {
  if (!tc) return 'T.C. Kimlik Numarası zorunludur.';

  if (!/^\d+$/.test(tc)) return 'T.C. Kimlik Numarası sadece rakamlardan oluşmalıdır.';

  if (tc.length !== TC_LENGTH) return 'T.C. Kimlik Numarası 11 haneli olmalıdır.';

  if (tc[0] === '0') return 'T.C. Kimlik Numarası sıfır ile başlayamaz.';

  if (/^(\d)\1{10}$/.test(tc)) return 'Geçersiz T.C. Kimlik Numarası. Lütfen kontrol ediniz.';

  const digits = tc.split('').map(Number);

  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }

  const tenthCheck = ((oddSum * 7) - evenSum) % 10;
  if (tenthCheck !== digits[9]) {
    return 'Geçersiz T.C. Kimlik Numarası. Lütfen kontrol ediniz.';
  }

  let sumFirst10 = 0;
  for (let i = 0; i < 10; i++) {
    sumFirst10 += digits[i];
  }

  const eleventhCheck = sumFirst10 % 10;
  if (eleventhCheck !== digits[10]) {
    return 'Geçersiz T.C. Kimlik Numarası. Lütfen kontrol ediniz.';
  }

  return null;
}

export function isValidTC(tc: string): boolean {
  return validateTC(stripNonDigits(tc)) === null;
}

export function TCInput({
  value,
  onChangeText,
  error: externalError,
  editable = true,
  placeholder,
  onFocus,
  onBlur,
  containerStyle,
}: TCInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const cleaned = stripNonDigits(value || '');
  const isValid = !cleaned || validateTC(cleaned) === null;
  const isComplete = cleaned.length === TC_LENGTH;

  const handleChangeText = useCallback(
    (text: string) => {
      const digits = stripNonDigits(text).slice(0, TC_LENGTH);
      onChangeText(digits);
    },
    [onChangeText],
  );

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      setTouched(true);
      onBlur?.(e);
    },
    [onBlur],
  );

  const internalError = touched && cleaned.length > 0 ? validateTC(cleaned) : null;
  const displayError = externalError || internalError;

  const borderColor = displayError
    ? colors.danger
    : isComplete && isValid && touched
      ? colors.success
      : isFocused
        ? colors.primary
        : colors.border;

  const showSuccessIcon = isComplete && isValid && touched && !displayError;

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[
          typography.body,
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            color: editable ? colors.text : colors.disabled,
            opacity: editable ? 1 : 0.6,
          },
        ]}
        value={cleaned}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || 'T.C. Kimlik No Giriniz'}
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        editable={editable}
        maxLength={TC_LENGTH}
        caretHidden={false}
      />
      <View style={styles.rightAccessory}>
        {showSuccessIcon && (
          <Text style={[styles.successIcon, { color: colors.success }]}>✓</Text>
        )}
      </View>
      {displayError ? (
        <Text style={[typography.small, { color: colors.danger, marginTop: spacing.xs }]}>
          {displayError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    letterSpacing: 1,
  },
  rightAccessory: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  successIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
});
