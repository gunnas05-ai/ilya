import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { spacing, typography } from '../theme';

export default function FABMenuItem({ icon, title, desc, onPress, colors }: {
  icon: string;
  title: string;
  desc: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${desc}`}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textWrap}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
  },
});
