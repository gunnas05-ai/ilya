import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme';
import { PremiumButton } from '../PremiumButton';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ErrorState({ message, onRetry, retryLoading = false, style }: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
        Bir hata oluştu
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: onRetry ? spacing.xl : 0, textAlign: 'center' }]}>
        {message || 'Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.'}
      </Text>
      {onRetry && (
        <PremiumButton
          title="Tekrar Dene"
          onPress={onRetry}
          loading={retryLoading}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  emoji: {
    fontSize: 56,
  },
  button: {
    width: '100%',
    maxWidth: 200,
  },
});
