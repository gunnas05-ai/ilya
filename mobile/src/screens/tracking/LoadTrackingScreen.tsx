import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useTrackingStore } from '../../store/trackingStore';
import { LoadTracking } from '../../types/tracking';
import { formatDistance, calculateDistance, simulateLoadProgress } from '../../services/trackingService';
import { hapticLight } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import { subscribeToEvent } from '../../services/websocket';

import Card from '../../components/shared/Card';

const CURRENT_USER = 'device_user_1';
const TEST_RECEIVER = 'device_user_2';

interface Props {
  navigation: any;
}

export default function LoadTrackingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { trackedLoads, loadTracking, updateLocation } = useTrackingStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'creator' | 'receiver'>('creator');

  useEffect(() => {
    loadTracking().then(() => setLoading(false));

    // EX-011: Subscribe to real-time tracking updates via WS
    const unsub = subscribeToEvent('TRACKING_UPDATE', (payload: any) => {
      if (payload.loadId && payload.lat && payload.lng) {
        updateLocation(payload.loadId, {
          latitude: payload.lat,
          longitude: payload.lng,
          timestamp: payload.timestamp || new Date().toISOString(),
          label: 'Canlı Konum',
          speed: payload.speed,
          heading: payload.heading,
        } as any);
      }
    });

    return () => { unsub(); };
  }, []);

  const loads = Object.values(trackedLoads);
  const myLoads: LoadTracking[] =
    viewMode === 'creator'
      ? loads.filter((l) => l.creatorId === CURRENT_USER)
      : loads.filter((l) => l.receiverId === TEST_RECEIVER);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate GPS progress update
    for (const load of myLoads) {
      if (load.status !== 'teslim_edildi') {
        const progress = Math.random() * 0.3;
        const currentProgress = load.status === 'beklemede' ? 0 : load.status === 'yolda' ? 0.5 : 1;
        const updated = simulateLoadProgress(load, Math.min(1, currentProgress + progress));
        await updateLocation(load.loadId, updated.currentLocation);
      }
    }
    await loadTracking();
    setRefreshing(false);
  }, [myLoads, updateLocation, loadTracking]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'yolda':
        return colors.info;
      case 'teslim_edildi':
        return colors.success;
      default:
        return colors.warning;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'yolda':
        return 'Yolda';
      case 'teslim_edildi':
        return 'Teslim Edildi';
      default:
        return 'Beklemede';
    }
  };

  const renderItem = ({ item }: { item: LoadTracking }) => {
    const dist = calculateDistance(
      item.currentLocation.latitude,
      item.currentLocation.longitude,
      item.deliveryLocation.latitude,
      item.deliveryLocation.longitude
    );

    return (
      <Card
        accentColor={statusColor(item.status)}
        onPress={() => navigation.navigate('LoadTrackingDetail', { loadId: item.loadId })}
      >
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
            <Text style={[typography.caption, { color: statusColor(item.status), fontWeight: '600' }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {item.route.fromCity} → {item.route.toCity}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.distItem}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Teslimata Kalan</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {formatDistance(dist)}
            </Text>
          </View>
          <View style={styles.distItem}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Tahmini Varış</Text>
            <Text style={[typography.body, { color: colors.text }]}>
              {item.estimatedArrival || 'Hesaplanıyor...'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.trackBtn, { backgroundColor: colors.primary + '15' }]}
          onPress={() => navigation.navigate('LoadTrackingDetail', { loadId: item.loadId })}
        >
          <Text style={[typography.label, { color: colors.primary, fontWeight: '600' }]}>
            Takip Et →
          </Text>
        </TouchableOpacity>
      </Card>
    );
  };

  const hasReceiverLoads = loads.some((l) => l.receiverId === TEST_RECEIVER);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />



      {hasReceiverLoads && (
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              viewMode === 'creator' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => { setViewMode('creator'); hapticLight(); }}
          >
            <Text
              style={[
                typography.label,
                { color: viewMode === 'creator' ? colors.primary : colors.textTertiary },
              ]}
            >
              Yüklediklerim
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              viewMode === 'receiver' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => { setViewMode('receiver'); hapticLight(); }}
          >
            <Text
              style={[
                typography.label,
                { color: viewMode === 'receiver' ? colors.primary : colors.textTertiary },
              ]}
            >
              Alacaklarım
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ListSkeleton count={3} cardHeight={140} />
      ) : myLoads.length === 0 ? (
        <EmptyState
          title={viewMode === 'creator' ? 'Henüz yük eklemediniz' : 'Size atanmış yük bulunmuyor'}
          description={viewMode === 'creator'
            ? 'Ana sayfadan "+ Yük Ekle" ile yük oluşturabilirsiniz.'
            : 'Bir yük alındığında burada görünecek.'}
        />
      ) : (
        <FlatList
          data={myLoads}
          keyExtractor={(item) => item.loadId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  routeRow: {
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  distItem: {
    flex: 1,
  },
  trackBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
});
