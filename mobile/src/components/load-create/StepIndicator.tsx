import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

const STEPS = [
  { label: 'Ortak Bilgiler', icon: '1' },
  { label: 'Yük Detayı', icon: '2' },
  { label: 'Fiyatlandırma', icon: '3' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;

        return (
          <View key={index} style={styles.stepWrapper}>
            <View
              style={[
                styles.circle,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : isCompleted
                    ? colors.success
                    : colors.border,
                },
              ]}
            >
              <Text style={[styles.circleText, { color: colors.white }]}>
                {isCompleted ? '✓' : step.icon}
              </Text>
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isActive
                    ? colors.primary
                    : isCompleted
                    ? colors.success
                    : colors.textTertiary,
                },
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor: isCompleted ? colors.success : colors.border,
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.sm,
  },
});
