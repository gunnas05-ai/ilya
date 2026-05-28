import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { gibService } from '../../services/gibService';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  pending: '#F59E0B',
  sent: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Onay Bekliyor',
  sent: 'Gönderildi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal Edildi',
};

export default function InvoiceDetailScreen({ route, navigation }: any) {
  const { invoiceId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [invoice, setInvoice] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const inv = await gibService.getById(invoiceId);
      setInvoice(inv);
      const logData = await gibService.getLogs(invoiceId);
      setLogs(Array.isArray(logData) ? logData : logData.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Belge bilgisi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  const handleApprove = async () => {
    hapticLight();
    setActionLoading('approve');
    try {
      await gibService.approve(invoiceId);
      hapticSuccess();
      Alert.alert('Başarılı', 'Belge onaya taşındı.');
      loadData();
    } catch (err: any) {
      hapticError();
      Alert.alert('Hata', err.response?.data?.message || 'Onaylama başarısız.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendGib = async () => {
    hapticLight();
    setActionLoading('send');
    try {
      await gibService.sendToGib(invoiceId);
      hapticSuccess();
      Alert.alert('Başarılı', 'Belge GİB\'e iletildi.');
      loadData();
    } catch (err: any) {
      hapticError();
      Alert.alert('Hata', err.response?.data?.message || 'Gönderme başarısız.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendToAccountant = () => {
    hapticLight();
    Alert.alert(
      'Muhasebeciye Gönder',
      'Bu belgenin PDF ve XML dosyalarını muhasebecinize e-posta ile göndermek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setActionLoading('accountant');
            try {
              const res = await gibService.sendToAccountant(invoiceId);
              hapticSuccess();
              Alert.alert(res.success ? 'Başarılı' : 'Uyarı', res.message || 'İşlem tamamlandı.');
              loadData();
            } catch (err: any) {
              hapticError();
              Alert.alert('Hata', err.response?.data?.message || 'Gönderme başarısız.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    hapticLight();
    Alert.alert('İptal Et', 'Bu belgeyi iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          setActionLoading('cancel');
          try {
            await gibService.cancel(invoiceId);
            hapticSuccess();
            Alert.alert('Başarılı', 'Belge iptal edildi.');
            loadData();
          } catch (err: any) {
            hapticError();
            Alert.alert('Hata', err.response?.data?.message || 'İptal başarısız.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const loadQr = async () => {
    hapticLight();
    try {
      const qr = await gibService.getQr(invoiceId);
      setQrDataUrl(qr.qrDataUrl);
    } catch {
      hapticError();
      Alert.alert('Hata', 'QR kod alınamadı.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OfflineBar />

        <ListSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OfflineBar />

        <ErrorState message={error} onRetry={loadData} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OfflineBar />

        <ErrorState message="Belge bulunamadı" onRetry={loadData} />
      </View>
    );
  }

  const receiver = JSON.parse(invoice.receiverJson || '{}');
  const statusColor = STATUS_COLORS[invoice.status] || colors.textTertiary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />



      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Status Header */}
        <View style={[styles.statusBar, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[typography.h3, { color: statusColor }]}>
            {STATUS_LABELS[invoice.status] || invoice.status}
          </Text>
        </View>

        {invoice.status === 'sent' && (
          <View style={[styles.statusBar, { backgroundColor: colors.info + '15', marginTop: -spacing.md }]}>
            <Text style={[typography.body, { color: colors.info }]}>
              📧 Fatura XML ve PDF dosyaları muhasebecinize e-posta ile iletildi.
            </Text>
          </View>
        )}

        {/* Invoice Info */}
        <Card accentColor={statusColor} style={{ marginBottom: spacing.sm }}>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Belge No</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{invoice.invoiceNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Tür</Text>
            <Text style={[typography.body, { color: colors.text }]}>{invoice.invoiceType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Senaryo</Text>
            <Text style={[typography.body, { color: colors.text }]}>{invoice.scenario}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Tarih</Text>
            <Text style={[typography.body, { color: colors.text }]}>
              {new Date(invoice.issueDate).toLocaleDateString('tr-TR')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>ETTN</Text>
            <Text style={[typography.body, { color: colors.text }]} selectable>{invoice.ettn}</Text>
          </View>
        </Card>

        {/* Receiver */}
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Alıcı
        </Text>
        <Card accentColor={colors.info} style={{ marginBottom: spacing.sm }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{receiver.name}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {receiver.type === 'kurumsal' ? 'VKN' : 'TCKN'}: {receiver.vknTckn}
          </Text>
          {receiver.taxOffice && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>VD: {receiver.taxOffice}</Text>
          )}
        </Card>

        {/* Financial Totals */}
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Mali Tutarlar
        </Text>
        <Card accentColor={colors.success} style={{ marginBottom: spacing.sm }}>
          <TotalRow label="Mal/Hizmet Toplamı" value={invoice.subtotal} colors={colors} />
          <TotalRow label="Toplam İskonto" value={invoice.discountTotal} colors={colors} />
          <TotalRow label="KDV Matrahı" value={Number(invoice.subtotal) - Number(invoice.discountTotal)} colors={colors} />
          <TotalRow label="Hesaplanan KDV" value={invoice.vatTotal} colors={colors} />
          {Number(invoice.withholdingTotal) > 0 && (
            <TotalRow label="Tevkifat" value={invoice.withholdingTotal} colors={colors} />
          )}
          <View style={[styles.divider, { borderBottomColor: colors.border }]} />
          <TotalRow label="Net Ödenecek" value={invoice.grandTotal} colors={colors} bold />
        </Card>

        {/* Items */}
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Kalemler ({invoice.items?.length || 0})
        </Text>
        {invoice.items?.map((item: any, i: number) => (
          <View key={item.id || i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.body, { color: colors.text }]}>{item.description}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {item.quantity} {item.unit} x {Number(item.unitPrice).toFixed(2)} ₺
              {item.discountPct > 0 ? ` (İskonto %${item.discountPct})` : ''}
              {' | '}KDV %{item.vatRate}
            </Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: spacing.xs }]}>
              {Number(item.lineTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </Text>
          </View>
        ))}

        {/* QR Code */}
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: colors.primary }]}
          onPress={loadQr}
          activeOpacity={0.7}
        >
          <Text style={[typography.label, { color: colors.primary }]}>QR Kod Göster</Text>
        </TouchableOpacity>
        {qrDataUrl && (
          <View style={styles.qrContainer}>
            <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}>
              Belge Doğrulama Kodu
            </Text>
          </View>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              İşlem Geçmişi
            </Text>
            {logs.map((log: any, i: number) => (
              <View key={log.id || i} style={[styles.logItem, { borderBottomColor: colors.border }]}>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>
                  {new Date(log.createdAt).toLocaleString('tr-TR')}
                </Text>
                <Text style={[typography.body, { color: colors.text }]}>{log.detail}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        {invoice.status === 'draft' && (
          <>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.success }]}
              onPress={handleApprove}
              disabled={actionLoading !== null}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.white }]}>
                {actionLoading === 'approve' ? '...' : 'Onaya Taşı'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.danger }]}
              onPress={handleCancel}
              disabled={actionLoading !== null}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.white }]}>İptal</Text>
            </TouchableOpacity>
          </>
        )}
        {invoice.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              onPress={handleSendGib}
              disabled={actionLoading !== null}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.white }]}>
                {actionLoading === 'send' ? 'Gönderiliyor...' : 'GİB\'e Gönder'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.danger }]}
              onPress={handleCancel}
              disabled={actionLoading !== null}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.white }]}>İptal</Text>
            </TouchableOpacity>
          </>
        )}
        {invoice.status === 'sent' && (
          <>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              onPress={() => { hapticLight(); Alert.alert('Bilgi', 'PDF görüntüleme yakında eklenecek.'); }}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.white }]}>PDF Görüntüle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { borderColor: colors.primary, borderWidth: 1.5 }]}
              activeOpacity={0.7}
            >
              <Text style={[typography.label, { color: colors.primary }]}>XML İndir</Text>
            </TouchableOpacity>
          </>
        )}

        {/* EX-009: Send to accountant (all statuses) */}
        <TouchableOpacity
          style={[styles.footerBtn, styles.accountantBtn, { borderColor: colors.info }]}
          onPress={handleSendToAccountant}
          disabled={actionLoading !== null}
          activeOpacity={0.8}
        >
          <Text style={[typography.label, { color: colors.info }]}>
            {actionLoading === 'accountant' ? '...' : '📧 Muhasebeci'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TotalRow({ label, value, colors, bold }: { label: string; value: number; colors: any; bold?: boolean }) {
  return (
    <View style={[styles.totalRow, bold && { marginTop: spacing.xs }]}>
      <Text style={[typography.body, { color: colors.textTertiary }, bold && { fontWeight: '600' }]}>{label}</Text>
      <Text style={[bold ? typography.h3 : typography.body, { color: colors.text, fontWeight: bold ? '700' : '400' }]}>
        {Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
      </Text>
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
    paddingTop: Platform.OS === 'ios' ? spacing.xl + spacing.sm : spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: spacing.sm,
  },
  itemRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  actionBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  logItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  accountantBtn: {
    borderWidth: 1.5,
    minWidth: 100,
    flex: 0.5,
  },
});
