import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing, radius } from '../../theme';

interface StatusBadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'disabled';
  style?: any;
}

export function StatusBadge({ label, type = 'info', style }: StatusBadgeProps) {
  const { colors } = useTheme();

  // Pick soft background color and contrast text color
  let bgColor = colors.info + '15';
  let textColor = colors.info;

  if (type === 'success') {
    bgColor = colors.success + '15';
    textColor = colors.success;
  } else if (type === 'warning') {
    bgColor = colors.warning + '15';
    textColor = colors.warning;
  } else if (type === 'danger') {
    bgColor = colors.danger + '15';
    textColor = colors.danger;
  } else if (type === 'disabled') {
    bgColor = colors.disabled + '15';
    textColor = colors.textSecondary;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[typography.small, { color: textColor, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
