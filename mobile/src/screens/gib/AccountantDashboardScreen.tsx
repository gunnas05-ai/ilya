import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, Modal, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { gibService } from '../../services/gibService';
import { financeService } from '../../services/financeService';
import { hapticLight } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF', pending: '#F59E0B', sent: '#3B82F6',
  approved: '#10B981', rejected: '#EF4444',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak', pending: 'Onay Bekliyor', sent: 'Gönderildi',
  approved: 'Onaylandı', rejected: 'Reddedildi',
};

interface KDVSummary {
  summary: { totalVat: number; totalSubtotal: number; totalGrand: number; totalInvoices: number };
  monthly: Array<{ month: string; vatTotal: number; grandTotal: number; count: number }>;
}

export default function AccountantDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [kdvSummary, setKDVSummary] = useState<KDVSummary | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'sent'>('all');
  const [qrModal, setQrModal] = useState<{ visible: boolean; dataUrl?: string; invoiceNo?: string }>({ visible: false });
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  const isAccountant = user?.role === 'SUPER_ADMIN' || user?.dbRole === 'muhasebe' || user?.dbRole === 'admin';

  const fetchQr = async (invId: string) => {
    if (qrCodes[invId]) {
      setQrModal({ visible: true, dataUrl: qrCodes[invId], invoiceNo: invId });
      return;
    }
    try {
      const result = await gibService.getQr(invId);
      const dataUrl = result?.data?.qrDataUrl || result?.qrDataUrl;
      if (dataUrl) {
        setQrCodes(prev => ({ ...prev, [invId]: dataUrl }));
        setQrModal({ visible: true, dataUrl, invoiceNo: invId });
      }
    } catch { /* silent */ }
  };

  const fetchAll = useCallback(async () => {
    setError(null);
    // EX-009: Each call wrapped individually so one failure doesn't break all
    const [invRes, kdvRes, plRes] = await Promise.all([
      gibService.getAccountantInvoices({ status: activeTab === 'all' ? undefined : activeTab, limit: 30 }).catch((e: any) => {
        if (e?.response?.status === 403) return { unauthorized: true };
        console.warn('invoice fetch failed:', e?.message);
        return null;
      }),
      gibService.getAccountantKDVSummary().catch(() => null),
      financeService.getDashboardSummary().catch(() => null),
    ]);

    if (invRes?.unauthorized) {
      setError('Bu ekrana erişim yetkiniz yok. Muhasebeci veya admin olarak giriş yapın.');
      return;
    }
    if (!invRes && !kdvRes && !plRes) {
      setError('Veriler yüklenirken hata oluştu. Lütfen tekrar deneyin.');
      return;
    }
    setInvoices(invRes?.invoices || invRes?.data?.invoices || []);
    setKDVSummary(kdvRes?.data || kdvRes);
    setDashboardData(plRes?.data || plRes);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await fetchAll();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}><OfflineBar /><ListSkeleton count={5} /></View>;
  }
  if (error) {
    return <View style={[styles.container, { backgroundColor: colors.background }]}><OfflineBar /><ErrorState message={error} onRetry={() => { setLoading(true); fetchAll().finally(() => setLoading(false)); }} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* EX-009: 4 KPI Boxes — Single Container, Vertical Stack */}
        <Card accentColor={colors.primary} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>📊 Muhasebe Özeti</Text>
          <View style={{ gap: spacing.sm }}>
            <View style={[styles.kpiRow, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>1️⃣ Bekleyen Fatura</Text>
                <Text style={[typography.small, { color: colors.textTertiary }]}>Onay Bekleyen</Text>
              </View>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>{invoices.filter(i => i.status === 'pending').length}</Text>
            </View>
            <View style={[styles.kpiRow, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>2️⃣ Toplam Ciro</Text>
                <Text style={[typography.small, { color: colors.textTertiary }]}>{kdvSummary?.summary?.totalInvoices || 0} Fatura</Text>
              </View>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>{(kdvSummary?.summary?.totalGrand || 0).toLocaleString('tr-TR')} ₺</Text>
            </View>
            <View style={[styles.kpiRow, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>3️⃣ Gelir-Gider</Text>
                <Text style={[typography.small, { color: colors.textTertiary }]}>Net Durum</Text>
              </View>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>{dashboardData ? ((dashboardData.totalIncome - dashboardData.totalExpense) || 0).toLocaleString('tr-TR') + ' ₺' : '—'}</Text>
            </View>
            <View style={[styles.kpiRow, { backgroundColor: colors.info + '12', borderColor: colors.info + '30' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.info, fontWeight: '700' }]}>4️⃣ Toplam KDV</Text>
                <Text style={[typography.small, { color: colors.textTertiary }]}>Gönderilen</Text>
              </View>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800' }]}>{(kdvSummary?.summary?.totalVat || 0).toLocaleString('tr-TR')} ₺</Text>
            </View>
          </View>
        </Card>

        {/* EX-009: KDV Monthly Summary */}
        {kdvSummary?.monthly && kdvSummary.monthly.length > 0 && (
          <>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>📊 Aylık KDV Raporu</Text>
            <Card accentColor={colors.info} style={{ marginBottom: spacing.lg }}>
              {kdvSummary.monthly.slice(0, 6).map((m, i) => (
                <View key={m.month} style={[styles.kdvRow, i < kdvSummary.monthly.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{m.month}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.body, { color: colors.info, fontWeight: '700' }]}>{m.vatTotal.toLocaleString('tr-TR')} ₺ KDV</Text>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>{m.count} fatura · {m.grandTotal.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* EX-009: Pending Invoices Tabs */}
        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>📋 Faturalar</Text>
        <View style={{ flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm }}>
          {(['all', 'pending', 'sent'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, { backgroundColor: activeTab === tab ? colors.primary : colors.surface, borderColor: activeTab === tab ? colors.primary : colors.border }]}
              onPress={() => { hapticLight(); setActiveTab(tab); }}
            >
              <Text style={[typography.caption, { color: activeTab === tab ? colors.white : colors.text, fontWeight: '600' }]}>
                {tab === 'all' ? 'Tümü' : tab === 'pending' ? 'Onay Bekleyen' : 'Gönderilen'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {invoices.length === 0 ? (
          <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center', padding: spacing.xl }]}>Görüntülenecek fatura bulunamadı.</Text>
        ) : (
          invoices.map((inv: any) => (
            <TouchableOpacity
              key={inv.id}
              onPress={() => { hapticLight(); navigation.navigate('InvoiceDetail', { invoiceId: inv.id }); }}
              activeOpacity={0.7}
            >
              <Card accentColor={STATUS_COLORS[inv.status] || colors.primary} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{inv.invoiceNo}</Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{inv.invoiceTypeLabel || inv.invoiceType}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <TouchableOpacity onPress={() => { hapticLight(); fetchQr(inv.id); }}>
                      <Text style={{ fontSize: 28 }}>📱</Text>
                    </TouchableOpacity>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[inv.status] || colors.textTertiary) + '20' }]}>
                      <Text style={[typography.small, { color: STATUS_COLORS[inv.status], fontWeight: '600' }]}>{STATUS_LABELS[inv.status]}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>{new Date(inv.issueDate).toLocaleDateString('tr-TR')}</Text>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{Number(inv.grandTotal).toLocaleString('tr-TR')} ₺</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={qrModal.visible} transparent animationType="fade" onRequestClose={() => setQrModal({ visible: false })}>
        <TouchableOpacity style={styles.qrOverlay} activeOpacity={1} onPress={() => setQrModal({ visible: false })}>
          <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md, textAlign: 'center' }]}>
              🔍 Fatura QR Kodu
            </Text>
            {qrModal.dataUrl ? (
              <Image source={{ uri: qrModal.dataUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl }]}>QR kod yükleniyor...</Text>
            )}
            <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
              Bu QR kodu GİB sorgulama için kullanabilirsiniz
            </Text>
            <TouchableOpacity
              style={[styles.qrCloseBtn, { backgroundColor: colors.primary }]}
              onPress={() => setQrModal({ visible: false })}
            >
              <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kdvRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill, borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.sm,
  },
  kpiRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
  },
  qrOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  qrCard: {
    width: Dimensions.get('window').width * 0.85,
    borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl,
    alignItems: 'center',
  },
  qrImage: {
    width: 220, height: 220, borderRadius: radius.md,
  },
  qrCloseBtn: {
    marginTop: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md, minWidth: 120, alignItems: 'center',
  },
});
