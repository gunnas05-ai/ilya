import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, radius } from '../../theme';

interface PhoneInputProps {
  value: string;
  onChangeText: (rawDigits: string) => void;
  error?: string;
  editable?: boolean;
  placeholder?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  containerStyle?: any;
}

const MASK_TEMPLATE = '0(5__) ___ __ __';
const MASK_LENGTH = MASK_TEMPLATE.length;
const VALID_REGEX = /^05\d{9}$/;

function extractUserDigits(text: string): string {
  const digits = text.replace(/\D/g, '');
  let user = digits;
  if (user.startsWith('05')) user = user.slice(2);
  else if (user.startsWith('0')) user = user.slice(1);
  else if (user.startsWith('5')) user = user.slice(1);
  return user.slice(0, 9);
}

function formatDisplay(userDigits: string): string {
  let result = '';
  let d = 0;
  for (const ch of MASK_TEMPLATE) {
    if (ch === '_') {
      result += d < userDigits.length ? userDigits[d] : '_';
      d++;
    } else {
      result += ch;
    }
  }
  return result;
}

function toFullNumber(userDigits: string): string {
  return '05' + userDigits;
}

function isValid(userDigits: string): boolean {
  return VALID_REGEX.test(toFullNumber(userDigits));
}

export function getRawPhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidPhone(value: string): boolean {
  return VALID_REGEX.test(getRawPhone(value));
}

export function formatPhone(value: string): string {
  const user = extractUserDigits(value);
  return formatDisplay(user);
}

export function PhoneInput({
  value,
  onChangeText,
  error: externalError,
  editable = true,
  placeholder,
  onFocus,
  onBlur,
  containerStyle,
}: PhoneInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const [userDigits, setUserDigits] = useState(() => extractUserDigits(value || ''));

  useEffect(() => {
    const next = extractUserDigits(value || '');
    setUserDigits((prev) => (next !== prev ? next : prev));
  }, [value]);

  const displayValue = useMemo(() => formatDisplay(userDigits), [userDigits]);

  const emit = useCallback(
    (digits: string) => {
      onChangeText(toFullNumber(digits));
    },
    [onChangeText],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      const next = extractUserDigits(text);
      if (next === userDigits) return;
      setUserDigits(next);
      emit(next);
    },
    [userDigits, emit],
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

  const error = externalError || (touched && !isValid(userDigits) && userDigits.length > 0
    ? 'Telefon numarası 0(5xx) xxx xx xx formatında olmalıdır.'
    : undefined);

  const borderColor = error
    ? colors.danger
    : isFocused
      ? colors.primary
      : colors.border;

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
        value={displayValue}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || MASK_TEMPLATE}
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        editable={editable}
        maxLength={MASK_LENGTH}
        caretHidden={false}
      />
      {error ? (
        <Text style={[typography.small, { color: colors.danger, marginTop: spacing.xs }]}>
          {error}
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
  },
});
