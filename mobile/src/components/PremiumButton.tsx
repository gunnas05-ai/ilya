import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/spacing';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  type?: 'primary' | 'success' | 'danger' | 'surface';
  style?: any;
}

export const PremiumButton = ({ title, onPress, loading, type = 'primary', style }: PremiumButtonProps) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!loading && onPress) onPress();
  };

  const bgColor = type === 'primary' ? colors.primary 
    : type === 'success' ? colors.success 
    : type === 'danger' ? colors.danger 
    : colors.surface;

  const textColor = type === 'surface' 
    ? colors.text 
    : isDark 
      ? '#FFFFFF' 
      : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bgColor }, style]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: spacing.lg,
    borderRadius: spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});
