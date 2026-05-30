import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store/themeStore';
import { spacing } from '../theme';

export default function ThemeToggle() {
  const { colors, isDark } = useTheme();
  const { setMode } = useThemeStore();
  return (
    <TouchableOpacity
      onPress={() => setMode(isDark ? 'light' : 'dark')}
      style={styles.button}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Gündüz moduna geç' : 'Gece moduna geç'}
    >
      <Text style={[styles.text, { color: colors.primary }]}>
        {isDark ? 'Gündüz' : 'Gece'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
  },
});
