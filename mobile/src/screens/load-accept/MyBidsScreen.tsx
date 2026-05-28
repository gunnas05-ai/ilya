import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useLoadAcceptStore } from '../../store/loadAcceptStore';
import { Bid } from '../../types/loadAccept';
import { hapticLight } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import CarrierScoreBadge from '../../components/CarrierScoreBadge';
import { carrierScoreService, CarrierScorecardFull } from '../../services/carrierScoreService';

import Card from '../../components/shared/Card';

interface Props {
  navigation: any;
}

export default function MyBidsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { myBids, fetchMyBids, cancelBid, loads } = useLoadAcceptStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'accepted' | 'rejected'>('all');
  const [myScorecard, setMyScorecard] = useState<CarrierScorecardFull | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchMyBids(),
          carrierScoreService.getMyScorecard().then(setMyScorecard).catch(() => {}),
        ]);
      } catch {
        setError('Teklifler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchMyBids();
    } catch {
      setError('Teklifler yenilenirken bir hata oluştu.');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredBids = myBids.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return b.status === 'pending' || b.status === 'countered';
    if (filter === 'accepted') return b.status === 'accepted';
    if (filter === 'rejected') return b.status === 'rejected' || b.status === 'expired';
    return true;
  });

  const handleCancel = (bid: Bid) => {
    Alert.alert('Teklifi İptal Et', 'Bu teklifi iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBid(bid.id);
            await fetchMyBids();
          } catch {
            Alert.alert('Hata', 'İptal edilirken bir hata oluştu');
          }
        },
      },
    ]);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return 'Beklemede';
      case 'countered': return 'Karşı Teklif';
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      case 'expired': return 'Süresi Doldu';
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'accepted': return colors.success;
      case 'countered': return colors.info;
      case 'rejected': return colors.danger;
      case 'expired': return colors.textTertiary;
      default: return colors.warning;
    }
  };

  const getLoadInfo = (loadId: string) => {
    return loads.find((l) => l.loadId === loadId);
  };

  const renderBid = ({ item }: { item: Bid }) => {
    const loadInfo = getLoadInfo(item.loadId);

    return (
      <Card accentColor={statusColor(item.status)}>
        <View style={styles.cardHeader}>
          <Text style={[typography.h3, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {loadInfo?.title || 'Yük'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
            <Text style={[typography.caption, { color: statusColor(item.status), fontWeight: '600' }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        {loadInfo && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            {loadInfo.fromCity} → {loadInfo.toCity}
          </Text>
        )}

        <View style={styles.amountRow}>
          <View>
            <Text style={[typography.label, { color: colors.textTertiary }]}>Teklif</Text>
            <Text style={[typography.h3, { color: colors.primary }]}>
              {item.amount.toLocaleString('tr-TR')} ₺
            </Text>
          </View>
          {item.netAmount && (
            <View>
              <Text style={[typography.label, { color: colors.textTertiary }]}>Net Kazanç</Text>
              <Text style={[typography.h3, { color: colors.success }]}>
                {item.netAmount.toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          )}
          <View>
            <Text style={[typography.label, { color: colors.textTertiary }]}>Teslimat</Text>
            <Text style={[typography.body, { color: colors.text }]}>{item.estimatedDeliveryDays} gün</Text>
          </View>
        </View>

        {item.note && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {item.note}
          </Text>
        )}

        {item.status === 'accepted' && (
          <View style={[styles.acceptedBanner, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
            <Text style={[typography.label, { color: colors.success, fontWeight: '700' }]}>
              ✓ Teklifiniz Kabul Edildi
            </Text>
          </View>
        )}

        {(item.status === 'pending' || item.status === 'countered') && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.danger }]}
            onPress={() => { hapticLight(); handleCancel(item); }}
          >
            <Text style={[typography.caption, { color: colors.danger }]}>Teklifi İptal Et</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />

      {/* EX-008: My carrier scorecard */}
      {myScorecard && (
        <View style={[styles.scoreStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Taşıyıcı Skorunuz</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <CarrierScoreBadge
                  score={{
                    overallScore: myScorecard.overallScore,
                    scoreTier: myScorecard.scoreTier as any,
                    tierLabel: myScorecard.tierLabel,
                    tierColor: myScorecard.tierColor,
                    totalCompletedLoads: myScorecard.metrics.totalCompletedLoads,
                  }}
                  size="md"
                />
                {myScorecard.restrictions.escrowRequired && (
                  <View style={[styles.warningChip, { backgroundColor: colors.danger + '15' }]}>
                    <Text style={[typography.small, { color: colors.danger, fontWeight: '600' }]}>
                      ⚠️ Escrow Zorunlu
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Tamamlanan</Text>
              <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                {myScorecard.metrics.totalCompletedLoads} yük
              </Text>
            </View>
          </View>
          {/* Mini metrics row */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.textTertiary }]}>Zamanında</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>%{myScorecard.metrics.onTimeDeliveryPct.toFixed(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.textTertiary }]}>İptal</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>%{myScorecard.metrics.cancellationRate.toFixed(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.textTertiary }]}>Kabul</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>%{myScorecard.metrics.acceptanceRate}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.textTertiary }]}>Puan</Text>
              <Text style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}>★ {myScorecard.metrics.averageRating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['all', 'active', 'accepted', 'rejected'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.tab,
              filter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => { setFilter(f); hapticLight(); }}
          >
            <Text style={[typography.caption, { color: filter === f ? colors.primary : colors.textTertiary }]}>
              {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : f === 'accepted' ? 'Kabul' : 'Red'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ListSkeleton count={4} cardHeight={140} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); fetchMyBids().catch(() => setError('Teklifler yüklenirken bir hata oluştu.')).finally(() => setLoading(false)); }} />
      ) : filteredBids.length === 0 ? (
        <EmptyState
          title="Henüz teklifiniz bulunmuyor"
          description="Yük bul ekranından yüklere teklif verebilirsiniz."
        />
      ) : (
        <FlatList
          data={filteredBids}
          keyExtractor={(item) => item.id}
          renderItem={renderBid}
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  acceptedBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  scoreStrip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  warningChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
