import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function CustomBackButton({ navigation, isDark, colors, onPressOverride }: {
  navigation: any;
  isDark: boolean;
  colors: any;
  onPressOverride?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPressOverride) onPressOverride();
        else if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('Home');
      }}
      style={[
        styles.button,
        {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
          shadowColor: isDark ? '#FFFFFF' : '#000000',
        },
      ]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Geri Dön"
    >
      <Text style={styles.text}>Geri Dön</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
    marginVertical: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 3.5,
    elevation: 4,
  },
  text: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
});
