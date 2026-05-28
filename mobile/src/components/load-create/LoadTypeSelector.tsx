import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { LOAD_TYPES } from '../../constants/loadConstants';

interface LoadTypeSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
}

export default function LoadTypeSelector({ value, onChange, error }: LoadTypeSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: colors.text }]}>
        Yük Türü Seçiniz <Text style={{ color: colors.danger }}>*</Text>
      </Text>
      <View style={styles.grid}>
        {LOAD_TYPES.map((type) => {
          const isSelected = value === type.value;
          return (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onChange(type.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  typography.label,
                  {
                    color: isSelected ? colors.primary : colors.text,
                    textAlign: 'center',
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    flexBasis: '47%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
