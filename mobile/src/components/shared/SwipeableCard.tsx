import { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACTION_WIDTH = 80;

interface SwipeableCardProps {
  children: React.ReactNode;
  onLeftAction?: () => void;
  leftActionLabel?: string;
  leftActionIcon?: string;
  leftActionColor?: string;
  onRightAction?: () => void;
  rightActionLabel?: string;
  rightActionIcon?: string;
  rightActionColor?: string;
  enabled?: boolean;
}

export default function SwipeableCard({
  children,
  onLeftAction,
  leftActionLabel = 'Favori',
  leftActionIcon = '★',
  leftActionColor,
  onRightAction,
  rightActionLabel = 'Teklif Ver',
  rightActionIcon = '→',
  rightActionColor,
  enabled = true,
}: SwipeableCardProps) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  const actualLeftColor = leftActionColor || colors.warning;
  const actualRightColor = rightActionColor || colors.primary;

  if (!enabled) {
    return <>{children}</>;
  }

  const renderLeftActions = () => {
    if (!onLeftAction) return null;
    return (
      <TouchableOpacity
        style={[styles.action, { backgroundColor: actualLeftColor, minWidth: ACTION_WIDTH }]}
        onPress={() => {
          swipeRef.current?.close();
          onLeftAction();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.actionIcon}>{leftActionIcon}</Text>
        <Text style={styles.actionLabel}>{leftActionLabel}</Text>
      </TouchableOpacity>
    );
  };

  const renderRightActions = () => {
    if (!onRightAction) return null;
    return (
      <TouchableOpacity
        style={[styles.action, { backgroundColor: actualRightColor, minWidth: ACTION_WIDTH }]}
        onPress={() => {
          swipeRef.current?.close();
          onRightAction();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.actionIcon}>{rightActionIcon}</Text>
        <Text style={styles.actionLabel}>{rightActionLabel}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={onLeftAction ? renderLeftActions : undefined}
      renderRightActions={onRightAction ? renderRightActions : undefined}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionIcon: {
    fontSize: 20,
    color: '#FFF',
  },
  actionLabel: {
    ...typography.caption,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 2,
    fontSize: 11,
  },
});
