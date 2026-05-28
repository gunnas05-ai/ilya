import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { useTheme } from '../../hooks/useTheme';
import { typography, spacing } from '../../theme';

export default function OfflineBar() {
  const { isConnected } = useNetwork();
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isConnected === false ? 0 : -100,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isConnected, translateY]);

  if (isConnected !== false) return null;

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: colors.warning,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[typography.caption, { color: colors.white, fontWeight: '600' }]}>
        İnternet bağlantınız yok
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
});
