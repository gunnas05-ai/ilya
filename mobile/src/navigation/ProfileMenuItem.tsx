import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { spacing, radius, typography } from '../theme';

export default function ProfileMenuItem({ label, icon, onPress, colors, isDark }: {
  label: string;
  icon: string;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: isDark ? '#FFFFFF' : '#000000',
        },
      ]}
    >
      <View style={styles.accent} />
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  accent: {
    width: 4,
    backgroundColor: '#FF6B00',
  },
  content: {
    flex: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  arrow: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: '700',
  },
});
