import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Share, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { analyticsService } from '../services/analyticsService';
import { useAuthStore } from '../store/authStore';
import { hapticLight } from '../utils/haptic';
import { generateAndSharePDF } from '../utils/reportGenerator';
import OfflineBar from '../components/shared/OfflineBar';
import ListSkeleton from '../components/shared/ListSkeleton';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import { KPIWidget } from '../components/shared/KPIWidget';
import Card from '../components/shared/Card';
import { useAnalyticsStore, AnalyticsPeriod } from '../store/analyticsStore';

type Tab = 'shipper' | 'lanes' | 'reports' | 'carrier';

const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: '7d', label: '7G' },
  { key: '30d', label: '30G' },
  { key: '90d', label: '90G' },
  { key: '12m', label: '12A' },
];

type LaneSort = 'loads' | 'avgPrice' | 'completion' | 'delay';

const LANE_SORT_OPTIONS: { key: LaneSort; label: string }[] = [
  { key: 'loads', label: 'Yük' },
  { key: 'avgPrice', label: 'Fiyat' },
  { key: 'completion', label: 'Tamamlama' },
  { key: 'delay', label: 'Gecikme' },
];

export default function AnalyticsDashboardScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const store = useAnalyticsStore();
  const [tab, setTab] = useState<Tab>('shipper');
  const [laneSort, setLaneSort] = useState<LaneSort>('loads');
  const [laneSortAsc, setLaneSortAsc] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const isCarrier = user?.role === 'DRIVER';

  useEffect(() => { store.fetchAll(); }, []);

  // Shipper tab empty check
  const hasShipperData = store.shipperDashboard && store.shipperDashboard.totalLoads > 0;

  // Lane data with sorting
  const sortedLanes = useMemo(() => {
    if (!store.laneAnalytics) return [];
    const lanes = [...store.laneAnalytics.lanes];
    const sortMap: Record<LaneSort, (a: typeof lanes[0], b: typeof lanes[0]) => number> = {
      loads: (a, b) => b.totalLoads - a.totalLoads,
      avgPrice: (a, b) => b.avgPrice - a.avgPrice,
      completion: (a, b) => b.completionRate - a.completionRate,
      delay: (a, b) => a.delayRate - b.delayRate,
    };
    lanes.sort(sortMap[laneSort]);
    if (laneSortAsc) lanes.reverse();
    return lanes.slice(0, 20);
  }, [store.laneAnalytics, laneSort, laneSortAsc]);

  // Filter data by selected period (client-side approximation)
  const filterByPeriod = <T extends { month?: string }>(items: T[], period: AnalyticsPeriod): T[] => {
    if (period === 'all') return items;
    const now = new Date();
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    const cutoff = new Date(now.getTime() - (daysMap[period] || 30) * 86400000);
    return items.filter(item => {
      if (item.month) return new Date(item.month + '-01') >= cutoff;
      return true;
    });
  };

  // CSV export handler
  const handleCSVExport = (type: string) => {
    hapticLight();
    const url = analyticsService.getExportUrl(type);
    const labels: Record<string, string> = { loads: 'Yük', invoices: 'Fatura', expenses: 'Gider' };
    Alert.alert('CSV Dışa Aktar', `${labels[type] || type} verileri CSV olarak dışa aktarılacak.`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Paylaş', onPress: () => Share.share({ message: `KAPTAN ${labels[type] || type} Raporu: ${url}`, url }) },
    ]);
  };

  // PDF report handler
  const handlePDFReport = async (type: 'monthly' | 'annual' | 'tax') => {
    hapticLight();
    setGenerating(type);
    const labels: Record<string, string> = { monthly: 'Aylık', annual: 'Yıllık', tax: 'Vergi' };
    Alert.alert(`${labels[type]} Rapor`, 'PDF raporunuz hazırlanıyor...', [
      { text: 'İptal', style: 'cancel', onPress: () => setGenerating(null) },
      { text: 'Oluştur', onPress: async () => {
        const ok = await generateAndSharePDF(type);
        setGenerating(null);
        if (!ok) Alert.alert('Hata', 'PDF oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.');
      }},
    ]);
  };

  // Loading state
  if (store.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <OfflineBar />
        <ListSkeleton />
      </View>
    );
  }

  // Error state
  if (store.error && !store.shipperDashboard && !store.laneAnalytics) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <OfflineBar />
        <ErrorState message={store.error} onRetry={() => store.fetchAll()} />
      </View>
    );
  }

  // Tier color helper
  const tierColor = (tier: string) => {
    const map: Record<string, string> = {
      excellent: colors.success,
      good: colors.info,
      fair: colors.warning,
      at_risk: colors.danger,
    };
    return map[tier] || colors.textTertiary;
  };

  const tierLabel = (tier: string) => {
    const map: Record<string, string> = {
      excellent: 'Mükemmel',
      good: 'İyi',
      fair: 'Orta',
      at_risk: 'Riskli',
    };
    return map[tier] || tier;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.sm }}
        refreshControl={
          <RefreshControl refreshing={store.refreshing} onRefresh={store.refreshAll} tintColor={colors.primary} />
        }
      >
        {/* ── Tabs ──────────────────────────────── */}
        <View style={{ flexDirection: 'row', marginBottom: spacing.md, gap: spacing.xs }}>
          {([
            { key: 'shipper' as Tab, label: 'Yük Veren' },
            { key: 'lanes' as Tab, label: 'Rotalar' },
            { key: 'reports' as Tab, label: 'Raporlar' },
            ...(isCarrier ? [{ key: 'carrier' as Tab, label: 'Taşıyıcı' }] : []),
          ]).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, { backgroundColor: tab === t.key ? colors.primary : colors.card, borderColor: tab === t.key ? colors.primary : colors.border }]}
              onPress={() => { hapticLight(); setTab(t.key); }}
            >
              <Text style={[typography.caption, { color: tab === t.key ? colors.white : colors.text, fontWeight: '600' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Period Filter ─────────────────────── */}
        <View style={{ flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.xs }}>
          {PERIOD_OPTIONS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, { backgroundColor: store.period === p.key ? colors.primary + '20' : colors.card, borderColor: store.period === p.key ? colors.primary : colors.border }]}
              onPress={() => { hapticLight(); store.setPeriod(p.key); }}
            >
              <Text style={[typography.small, { color: store.period === p.key ? colors.primary : colors.textSecondary, fontWeight: store.period === p.key ? '700' : '400' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══════════════════════════════════════════
            ║  SHIPPER TAB
            ═══════════════════════════════════════════ */}
        {tab === 'shipper' && (
          <>
            {!hasShipperData ? (
              <EmptyState emoji="📦" title="Henüz yük verisi bulunmuyor" description="Analitik verilerinizin görüntülenmesi için en az bir yük oluşturmalısınız." />
            ) : (
              <>
                {/* KPI Row 1 */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                  <KPIWidget title="Toplam Yük" value={store.shipperDashboard!.totalLoads.toString()} subtitle="tüm zamanlar" accentColor={colors.primary} />
                  <KPIWidget title="Aktif" value={store.shipperDashboard!.activeLoads.toString()} subtitle="devam eden" accentColor={colors.warning} />
                  <KPIWidget title="Tamamlanan" value={store.shipperDashboard!.completedLoads.toString()} subtitle="teslim edildi" accentColor={colors.success} />
                </View>

                {/* KPI Row 2 */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                  <KPIWidget title="Ort. Fiyat" value={`${(store.shipperDashboard!.avgPrice / 1000).toFixed(1)}k ₺`} subtitle="yük başına" accentColor={colors.info} />
                  <KPIWidget title="Toplam Harcama" value={`${(store.shipperDashboard!.totalSpent / 1000).toFixed(1)}k ₺`} subtitle="toplam" accentColor={colors.danger} />
                </View>

                {/* Completion rate */}
                <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Tamamlanma Oranı</Text>
                  <View style={{ marginTop: spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>%{store.shipperDashboard!.totalLoads > 0 ? Math.round((store.shipperDashboard!.completedLoads / store.shipperDashboard!.totalLoads) * 100) : 0}</Text>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>{store.shipperDashboard!.completedLoads}/{store.shipperDashboard!.totalLoads} yük</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: 8, width: `${store.shipperDashboard!.totalLoads > 0 ? (store.shipperDashboard!.completedLoads / store.shipperDashboard!.totalLoads) * 100 : 0}%`, backgroundColor: colors.success, borderRadius: 4 }} />
                    </View>
                  </View>
                </Card>

                {/* Top Lanes */}
                {store.shipperDashboard!.topLanes.length > 0 && (
                  <>
                    <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>En Çok Kullanılan Rotalar</Text>
                    {store.shipperDashboard!.topLanes.map((tl, i) => (
                      <Card key={i} accentColor={colors.primary} style={{ marginBottom: spacing.xs }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{tl.lane}</Text>
                            <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>{tl.count} yük</Text>
                          </View>
                          <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>~{(tl.avgPrice / 1000).toFixed(1)}k ₺</Text>
                        </View>
                      </Card>
                    ))}
                  </>
                )}

                {/* Monthly Trend */}
                {store.shipperDashboard!.trend.length > 0 && (
                  <>
                    <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Aylık Trend</Text>
                    <Card accentColor={colors.info}>
                      {(() => {
                        const filteredTrend = filterByPeriod(
                          store.shipperDashboard!.trend.map(t => ({ ...t, month: t.month })),
                          store.period
                        );
                        const maxCount = Math.max(...filteredTrend.map(t => t.count), 1);
                        const maxTotal = Math.max(...filteredTrend.map(t => t.total), 1);
                        return filteredTrend.map((t, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs + 2 }}>
                            <Text style={[typography.small, { color: colors.textTertiary, width: 65 }]}>{t.month}</Text>
                            <View style={{ flex: 1, marginRight: spacing.sm }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', height: 14, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ height: 14, width: `${Math.round((t.count / maxCount) * 100)}%`, backgroundColor: colors.primary, borderRadius: 4, opacity: 0.9 }} />
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', height: 10, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden', marginTop: 2 }}>
                                <View style={{ height: 10, width: `${Math.round((t.total / maxTotal) * 100)}%`, backgroundColor: colors.info, borderRadius: 4, opacity: 0.7 }} />
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>{t.count} yük</Text>
                              <Text style={[typography.small, { color: colors.textTertiary }]}>{(t.total / 1000).toFixed(0)}k ₺</Text>
                            </View>
                          </View>
                        ));
                      })()}
                      {/* Legend */}
                      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 10, height: 10, backgroundColor: colors.primary, borderRadius: 2 }} />
                          <Text style={[typography.small, { color: colors.textTertiary }]}>Yük</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 10, height: 10, backgroundColor: colors.info, borderRadius: 2 }} />
                          <Text style={[typography.small, { color: colors.textTertiary }]}>Tutar</Text>
                        </View>
                      </View>
                    </Card>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            ║  LANES TAB
            ═══════════════════════════════════════════ */}
        {tab === 'lanes' && (
          <>
            {!store.laneAnalytics || store.laneAnalytics.lanes.length === 0 ? (
              <EmptyState emoji="🛣️" title="Rota verisi bulunmuyor" description="Sistemde henüz yeterli rota verisi oluşmadı." />
            ) : (
              <>
                {/* Lane count KPI */}
                <KPIWidget title="Aktif Rota" value={store.laneAnalytics.totalLanes.toString()} subtitle="toplam rota" accentColor={colors.primary} />

                {/* Sort controls */}
                <View style={{ flexDirection: 'row', marginTop: spacing.md, marginBottom: spacing.sm, gap: spacing.xs, alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Sırala:</Text>
                  {LANE_SORT_OPTIONS.map(o => (
                    <TouchableOpacity
                      key={o.key}
                      style={[styles.sortBtn, { backgroundColor: laneSort === o.key ? colors.primary : colors.card, borderColor: laneSort === o.key ? colors.primary : colors.border }]}
                      onPress={() => {
                        hapticLight();
                        if (laneSort === o.key) setLaneSortAsc(!laneSortAsc);
                        else { setLaneSort(o.key); setLaneSortAsc(false); }
                      }}
                    >
                      <Text style={[typography.small, { color: laneSort === o.key ? colors.white : colors.textSecondary, fontWeight: '600' }]}>
                        {o.label}{laneSort === o.key ? (laneSortAsc ? ' ↑' : ' ↓') : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Lane cards */}
                {sortedLanes.map((l, i) => (
                  <Card key={i} accentColor={l.completionRate >= 80 ? colors.success : l.completionRate >= 50 ? colors.warning : colors.danger} style={{ marginBottom: spacing.xs }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{l.lane}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                      <View style={[styles.metricPill, { backgroundColor: colors.primary + '18' }]}>
                        <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>{l.totalLoads} yük</Text>
                      </View>
                      <View style={[styles.metricPill, { backgroundColor: colors.info + '18' }]}>
                        <Text style={[typography.small, { color: colors.info, fontWeight: '600' }]}>Ort: {(l.avgPrice / 1000).toFixed(1)}k ₺</Text>
                      </View>
                      <View style={[styles.metricPill, { backgroundColor: colors.success + '18' }]}>
                        <Text style={[typography.small, { color: colors.success, fontWeight: '600' }]}>%{l.completionRate} tam.</Text>
                      </View>
                      <View style={[styles.metricPill, { backgroundColor: l.delayRate > 30 ? colors.danger + '18' : colors.warning + '18' }]}>
                        <Text style={[typography.small, { color: l.delayRate > 30 ? colors.danger : colors.warning, fontWeight: '600' }]}>%{l.delayRate} gecikme</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>Min: {(l.minPrice / 1000).toFixed(1)}k ₺</Text>
                      <Text style={[typography.small, { color: colors.textTertiary }]}>Maks: {(l.maxPrice / 1000).toFixed(1)}k ₺</Text>
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            ║  REPORTS TAB (PDF + CSV Export)
            ═══════════════════════════════════════════ */}
        {tab === 'reports' && (
          <>
            {/* ── PDF Reports Section ── */}
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>PDF Raporlar</Text>

            {/* Monthly */}
            <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Aylık Taşıma Raporu</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Bu aya ait tüm sevkiyat, gelir ve gider özeti. Muhasebeciniz için ideal.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.sm }]}
                onPress={() => handlePDFReport('monthly')}
                disabled={generating === 'monthly'}
              >
                {generating === 'monthly' ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[typography.label, { color: colors.white }]}>PDF Oluştur</Text>
                )}
              </TouchableOpacity>
            </Card>

            {/* Annual */}
            <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Yıllık Taşıma Raporu</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Yıllık taşıma hacmi, gelir-gider analizi, aylık trend dağılımı.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.info, marginTop: spacing.sm }]}
                onPress={() => handlePDFReport('annual')}
                disabled={generating === 'annual'}
              >
                {generating === 'annual' ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[typography.label, { color: colors.white }]}>PDF Oluştur</Text>
                )}
              </TouchableOpacity>
            </Card>

            {/* Tax */}
            <Card accentColor={colors.warning} style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Vergi Raporu</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                KDV özeti, e-fatura toplamları ve muhasebeci için vergi dökümü.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.warning, marginTop: spacing.sm }]}
                onPress={() => handlePDFReport('tax')}
                disabled={generating === 'tax'}
              >
                {generating === 'tax' ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[typography.label, { color: colors.white }]}>PDF Oluştur</Text>
                )}
              </TouchableOpacity>
            </Card>

            {/* ── CSV Export Section ── */}
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>CSV Dışa Aktar</Text>

            {/* Loads CSV */}
            <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Yük Raporu</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Tüm yükleriniz: başlık, rota, fiyat, durum, tarih</Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: spacing.sm }]} onPress={() => handleCSVExport('loads')}>
                <Text style={[typography.label, { color: colors.white }]}>CSV İndir</Text>
              </TouchableOpacity>
            </Card>

            {/* Invoices CSV */}
            <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Fatura Raporu</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Tüm faturalarınız: belge no, tür, KDV, toplam, durum</Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.info, marginTop: spacing.sm }]} onPress={() => handleCSVExport('invoices')}>
                <Text style={[typography.label, { color: colors.white }]}>CSV İndir</Text>
              </TouchableOpacity>
            </Card>

            {/* Expenses CSV */}
            <Card accentColor={colors.warning}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Gider Raporu</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Tüm giderleriniz: açıklama, tutar, tarih, kategori</Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warning, marginTop: spacing.sm }]} onPress={() => handleCSVExport('expenses')}>
                <Text style={[typography.label, { color: colors.white }]}>CSV İndir</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════
            ║  CARRIER TAB
            ═══════════════════════════════════════════ */}
        {tab === 'carrier' && (
          <>
            {!store.carrierScorecard ? (
              <EmptyState emoji="🚛" title="Taşıyıcı verisi bulunmuyor" description="Verimlilik verilerinizin hesaplanması için sevkiyat tamamlamalısınız." />
            ) : (
              <>
                {/* Score badge */}
                <Card accentColor={tierColor(store.carrierScorecard.scoreTier)} style={{ marginBottom: spacing.md }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[typography.h1, { color: tierColor(store.carrierScorecard.scoreTier), fontWeight: '800' }]}>
                      {Math.round(store.carrierScorecard.overallScore)}
                    </Text>
                    <View style={[styles.scoreBadge, { backgroundColor: tierColor(store.carrierScorecard.scoreTier) + '20' }]}>
                      <Text style={[typography.label, { color: tierColor(store.carrierScorecard.scoreTier), fontWeight: '700' }]}>
                        {tierLabel(store.carrierScorecard.scoreTier)}
                      </Text>
                    </View>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Taşıyıcı Skor Kartı</Text>
                  </View>
                </Card>

                {/* Performance KPIs */}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                  <KPIWidget title="Zamanında" value={`%${Math.round(store.carrierScorecard.metrics.onTimeDeliveryPct)}`} subtitle="teslimat" accentColor={colors.success} />
                  <KPIWidget title="İptal" value={`%${Math.round(store.carrierScorecard.metrics.cancellationRate)}`} subtitle="oranı" accentColor={store.carrierScorecard.metrics.cancellationRate > 20 ? colors.danger : colors.warning} />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                  <KPIWidget title="Hasar" value={`%${Math.round(store.carrierScorecard.metrics.claimsRatio)}`} subtitle="talep oranı" accentColor={store.carrierScorecard.metrics.claimsRatio > 10 ? colors.danger : colors.success} />
                  <KPIWidget title="Puan" value={store.carrierScorecard.metrics.averageRating.toFixed(1)} subtitle={`${store.carrierScorecard.metrics.totalRatings} değerlendirme`} accentColor={colors.info} />
                </View>

                {/* Detailed metrics */}
                <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>Performans Detayları</Text>
                  {[
                    { label: 'Ort. Yanıt Süresi', value: `${store.carrierScorecard.metrics.avgResponseTimeMinutes} dk` },
                    { label: 'Tamamlanan Yük', value: store.carrierScorecard.metrics.totalCompletedLoads.toString() },
                    { label: 'Toplam Gelir', value: `${(store.carrierScorecard.metrics.totalRevenue / 1000).toFixed(1)}k ₺` },
                    { label: 'Kabul Oranı', value: `%${Math.round(store.carrierScorecard.metrics.acceptanceRate)}` },
                  ].map((m, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>{m.label}</Text>
                      <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>{m.value}</Text>
                    </View>
                  ))}
                </Card>

                {/* Restrictions */}
                {store.carrierScorecard.restrictions.isRestricted && (
                  <Card accentColor={colors.danger}>
                    <Text style={[typography.body, { color: colors.danger, fontWeight: '600' }]}>Kısıtlamalar</Text>
                    {store.carrierScorecard.restrictions.escrowRequired && (
                      <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>• Escrow zorunlu</Text>
                    )}
                    {store.carrierScorecard.restrictions.bidLimitPerDay > 0 && (
                      <Text style={[typography.small, { color: colors.textSecondary }]}>• Günlük teklif limiti: {store.carrierScorecard.restrictions.bidLimitPerDay}</Text>
                    )}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center' },
  periodBtn: { paddingVertical: 4, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1 },
  sortBtn: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  actionBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  metricPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  scoreBadge: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill },
});
