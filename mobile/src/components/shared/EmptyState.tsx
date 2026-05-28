import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme';
import { PremiumButton } from '../PremiumButton';

interface EmptyStateProps {
  title?: string;
  description?: string;
  emoji?: string;
  ctaText?: string;
  onCtaPress?: () => void;
  ctaLoading?: boolean;
}

export default function EmptyState({
  title,
  description,
  emoji = '📭',
  ctaText,
  onCtaPress,
  ctaLoading = false
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
        {title || 'Henüz veri bulunmuyor'}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: ctaText ? spacing.xl : 0, textAlign: 'center' }]}>
        {description || 'Burada görüntülenecek bir şey yok'}
      </Text>
      {ctaText && onCtaPress && (
        <PremiumButton
          title={ctaText}
          onPress={onCtaPress}
          loading={ctaLoading}
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
    maxWidth: 240,
  }
});
