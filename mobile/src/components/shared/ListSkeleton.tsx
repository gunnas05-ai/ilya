import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme';
import Skeleton from './Skeleton';

interface ListSkeletonProps {
  count?: number;
  cardHeight?: number;
}

export default function ListSkeleton({ count = 5, cardHeight = 180 }: ListSkeletonProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, { height: cardHeight, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Skeleton width="65%" height={18} />
            <Skeleton width={60} height={22} borderRadius={4} />
          </View>
          <Skeleton width="80%" height={14} style={{ marginTop: spacing.sm }} />
          <Skeleton width="40%" height={24} style={{ marginTop: spacing.sm }} />
          <View style={styles.tagRow}>
            <Skeleton width={70} height={20} borderRadius={4} />
            <Skeleton width={60} height={20} borderRadius={4} />
            <Skeleton width={80} height={20} borderRadius={4} />
          </View>
          <View style={styles.footer}>
            <Skeleton width={60} height={14} />
            <Skeleton width={100} height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
