import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  required?: boolean;
  editable?: boolean;
}

export default function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  multiline,
  maxLength,
  keyboardType = 'default',
  required = false,
  editable = true,
}: FormFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: colors.text }]}>
        {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
            height: multiline ? 100 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        editable={editable}
      />
      {error && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  input: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    fontSize: 14,
  },
});
