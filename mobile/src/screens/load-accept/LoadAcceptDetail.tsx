import { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { loadService } from '../../services/loadService';
import { useLoadAcceptStore } from '../../store/loadAcceptStore';
import { handleError } from '../../services/errorService';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptic';
import { apiClient } from '../../services/api';
import Card from '../../components/shared/Card';
import ErrorState from '../../components/shared/ErrorState';
import ListSkeleton from '../../components/shared/ListSkeleton';

const LOAD_TYPE_LABELS: Record<string, string> = { tam_yuk: 'Tam Yük', kismi_yuk: 'Kısmi', evden_eve: 'Evden Eve', sehir_ici: 'Şehir İçi' };
const URGENCY_LABELS: Record<string, string> = { Dusuk: 'Düşük', Normal: 'Normal', Yuksek: 'Yüksek' };

export default function LoadAcceptDetail({ navigation, route }: any) {
  const { loadId } = route.params;
  const { colors } = useTheme();
  const { placeBid } = useLoadAcceptStore();
  const [load, setLoad] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBid, setShowBid] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNote, setBidNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [instantStatus, setInstantStatus] = useState<any>(null);
  const [instantBooking, setInstantBooking] = useState(false);
  const [rateData, setRateData] = useState<any>(null);

  const fetchLoad = () => {
    setLoading(true); setError(null);
    loadService.getById(loadId).then((data) => { setLoad(data); setRateData(null); }).catch((e) => { handleError(e, { screen: 'LoadAcceptDetail' }); setError('Yük detayı yüklenirken bir hata oluştu.'); }).finally(() => setLoading(false));
    apiClient.get(`/instant-book/${loadId}/status`).then(r => { setInstantStatus(r.data || r); }).catch(() => {});
  };

  useEffect(() => { fetchLoad(); }, [loadId]);

  useEffect(() => {
    if (!load?.fromCity || !load?.toCity) return;
    apiClient.get(`/rates/route?from=${encodeURIComponent(load.fromCity)}&to=${encodeURIComponent(load.toCity)}`)
      .then(r => setRateData(r.data || r))
      .catch(() => {});
  }, [load?.fromCity, load?.toCity]);

  const handleTakeLoad = async () => {
    if (!showBid) { hapticLight(); setShowBid(true); return; }
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) { Alert.alert('Uyarı', 'Geçerli bir teklif giriniz.'); return; }
    hapticMedium(); setSubmitting(true);
    try {
      await placeBid(loadId, amount, bidNote || 'Teklif', 3, false, 1440);
      hapticSuccess();
      Alert.alert('✅ Teklif Gönderildi', 'Yük sahibi teklifinizi değerlendirecek.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Teklif gönderilemedi.'); }
    finally { setSubmitting(false); }
  };

  /** ⚡ Anında Rezervasyon — FCFS Hemen Al */
  const handleInstantBook = async () => {
    hapticMedium(); setInstantBooking(true);
    try {
      const res = await apiClient.post(`/instant-book/${loadId}/book`);
      const data = res.data || res;
      const netEarnings = Math.round(data.netCarrierEarnings || 0);

      Alert.alert(
        '⚡ Yük Rezerve Edildi!',
        `Bu yük 5 dakikalığına size kilitlendi.\n\nFiyat: ${Number(data.instantPrice || 0).toLocaleString('tr-TR')} ₺\nKomisyon: ${Number(data.platformCommission || 0).toLocaleString('tr-TR')} ₺\nNet Kazanç: ${netEarnings.toLocaleString('tr-TR')} ₺\n\nOnaylıyor musunuz?`,
        [
          { text: 'Vazgeç', style: 'cancel', onPress: async () => { await apiClient.post(`/instant-book/${loadId}/release`).catch(() => {}); } },
          { text: '✅ Onayla', onPress: async () => {
            try {
              await apiClient.post(`/instant-book/${loadId}/confirm`);
              hapticSuccess();
              Alert.alert('🎉 Başarılı!', 'Yük kesin olarak size rezerve edildi. Teslimat bilgileriniz hazır.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
            } catch { Alert.alert('Hata', 'Onaylama başarısız. Lütfen tekrar deneyin.'); }
          }},
        ],
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Bu yük az önce başkası tarafından alındı.';
      Alert.alert('⚠️ Rezervasyon Başarısız', msg);
    }
    finally { setInstantBooking(false); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!load) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><Text style={{ color: colors.textSecondary }}>Yük bulunamadı</Text></View>;

  const typeLabel = LOAD_TYPE_LABELS[load.loadType] || load.loadType;

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }]}><ListSkeleton count={3} /></View>;
  if (error) return <View style={[styles.container, { backgroundColor: colors.background }]}><ErrorState message={error} onRetry={fetchLoad} /></View>;
  if (!load) return <View style={[styles.container, { backgroundColor: colors.background }]}><ErrorState message="Yük bulunamadı." /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
        {/* Rota + Fiyat */}
        <View style={{ marginTop: spacing.md }}>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800' }]}>
            {load.fromCity || '?'} → {load.toCity || '?'}
          </Text>
          <Text style={[typography.display, { color: colors.primary, fontWeight: '900', marginTop: spacing.xs }]}>
            {load.totalPrice ? `${Number(load.totalPrice).toLocaleString('tr-TR')} TL` : 'Fiyat yok'}
          </Text>
        </View>

        {/* 📊 Rota Fiyat İstihbaratı */}
        {rateData?.avg7d > 0 && (
          <View style={{ marginTop: spacing.md, backgroundColor: colors.success + '10', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.success + '30' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[typography.label, { color: colors.success, fontWeight: '800' }]}>📊 Rota Fiyat İstihbaratı</Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>Son 7 gün</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.textSecondary }]}>Piyasa Ort.</Text>
                <Text style={[typography.cardValue, { color: colors.success }]}>{rateData.avg7d?.toLocaleString('tr-TR')} ₺</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.small, { color: colors.textSecondary }]}>Önerilen Aralık</Text>
                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                  {rateData.recommendedRange?.min?.toLocaleString('tr-TR')} — {rateData.recommendedRange?.max?.toLocaleString('tr-TR')} ₺
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
              <Text style={{ fontSize: 10, color: rateData.trend === 'up' ? colors.success : rateData.trend === 'down' ? colors.danger : colors.textTertiary }}>
                {rateData.trend === 'up' ? '📈 Yükselişte' : rateData.trend === 'down' ? '📉 Düşüşte' : '➡️ Sabit'} %{rateData.trendPct || 0}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>{rateData.sampleCount} işlem</Text>
            </View>
          </View>
        )}

        {/* Kategori etiketi */}
        <View style={[styles.tagRow, { marginTop: spacing.md }]}>
          <View style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>{typeLabel}</Text>
          </View>
          {load.urgency && (
            <View style={[styles.tag, { backgroundColor: load.urgency === 'Yuksek' ? colors.danger + '15' : colors.warning + '15' }]}>
              <Text style={[typography.small, { color: load.urgency === 'Yuksek' ? colors.danger : colors.warning, fontWeight: '600' }]}>
                {URGENCY_LABELS[load.urgency] || load.urgency}
              </Text>
            </View>
          )}
          {load.escrow && (
            <View style={[styles.tag, { backgroundColor: colors.success + '15' }]}>
              <Text style={[typography.small, { color: colors.success, fontWeight: '600' }]}>🔒 Escrow</Text>
            </View>
          )}
        </View>

        {/* Detay Tablosu */}
        <View style={[styles.detailSection, { marginTop: spacing.xl }]}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Yük Türü</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{typeLabel}</Text>
          </View>
          {load.totalTonnage && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Tonaj</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{load.totalTonnage} Ton</Text>
            </View>
          )}
          {load.volume && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Hacim</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{load.volume} m³</Text>
            </View>
          )}
          {load.vehicleType && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Araç Tipi</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{load.vehicleType}{load.trailerType ? ` / ${load.trailerType}` : ''}</Text>
            </View>
          )}
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Yükleme</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
              {load.fromCity}{load.fromDistrict ? `, ${load.fromDistrict}` : ''} {load.pickupDate ? `• ${new Date(load.pickupDate).toLocaleDateString('tr-TR')}` : ''}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Teslimat</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
              {load.toCity}{load.toDistrict ? `, ${load.toDistrict}` : ''} {load.deliveryDate ? `• ${new Date(load.deliveryDate).toLocaleDateString('tr-TR')}` : ''}
            </Text>
          </View>
          {load.routeDistance && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Mesafe</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{load.routeDistance} km</Text>
            </View>
          )}
          {load.coldChain && (
            <View style={styles.detailRow}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Soğuk Zincir</Text>
              <Text style={[typography.caption, { color: colors.info, fontWeight: '600' }]}>❄️ Gerekli</Text>
            </View>
          )}
        </View>

        {/* Açıklama */}
        {load.description && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Açıklama</Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{load.description}</Text>
          </View>
        )}

        {/* Teklif formu */}
        {showBid && (
          <Card accentColor={colors.warning} style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Teklif Ver</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder="Teklif Tutarı (₺)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginTop: spacing.sm, minHeight: 60 }]}
              value={bidNote}
              onChangeText={setBidNote}
              placeholder="Not (opsiyonel)"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </Card>
        )}
      </ScrollView>

      {/* Alt Yapışkan Buton */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {load.fromCity} → {load.toCity}
          </Text>
          {instantStatus?.available && (
            <Text style={{ fontSize: 10, color: colors.success, fontWeight: '700', marginTop: 2 }}>
              ⚡ Anında Rezervasyon: {Number(instantStatus.instantPrice || 0).toLocaleString('tr-TR')} ₺
            </Text>
          )}
        </View>

        {/* Anında Al butonu (eğer yük instant-book'a açıksa) */}
        {instantStatus?.available ? (
          <TouchableOpacity
            style={[styles.takeBtn, { backgroundColor: colors.success }]}
            onPress={handleInstantBook}
            disabled={instantBooking}
          >
            <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>
              {instantBooking ? 'Rezerve...' : '⚡ Hemen Al'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.takeBtn, { backgroundColor: colors.primary }]}
            onPress={handleTakeLoad}
            disabled={submitting}
          >
            <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>
              {submitting ? '...' : showBid ? 'Teklif Gönder' : 'Yükü Al'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { justifyContent: 'center', alignItems: 'center' },
  tagRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  detailSection: { marginTop: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  input: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 15, minHeight: 48 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1 },
  takeBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md, minWidth: 120, alignItems: 'center' },
});
