import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

interface RadioGroupProps {
  label: string;
  value: string | boolean | null;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
}

export default function RadioGroup({
  label,
  value,
  options,
  onChange,
  required = false,
}: RadioGroupProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: colors.text }]}>
        {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
      </Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: isSelected ? colors.primary : colors.textTertiary },
                ]}
              >
                {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Text
                style={[
                  typography.body,
                  {
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    gap: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
