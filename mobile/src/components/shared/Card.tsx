import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  accentColor?: string;
  onPress?: () => void;
  style?: any;
  accessibilityLabel?: string;
}

export default function Card({ children, accentColor, onPress, style, accessibilityLabel }: CardProps) {

export default function Card({ children, accentColor, onPress, style }: CardProps) {
  const { colors } = useTheme();

  const container = (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {/* Left accent bar — separate View, not border-left */}
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      {/* Content area — flex:1 ensures it stretches with the card */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={accessibilityLabel || 'Kart'}>
        {container}
      </TouchableOpacity>
    );
  }

  return container;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accent: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
});
