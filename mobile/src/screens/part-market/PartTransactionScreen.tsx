import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticMedium, hapticSuccess } from '../../utils/haptic';
import Card from '../../components/shared/Card';

export default function PartTransactionScreen({ navigation, route }: any) {
  const { listingId } = route.params || {};
  const { colors } = useTheme();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    apiClient.get(`/part-market/listings/${listingId}`).then((res) => { setListing(res.data?.data || res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [listingId]);

  const handleBuy = async () => {
    hapticMedium();
    setBuying(true);
    try {
      const res = await apiClient.post('/part-market/transactions', { listingId });
      hapticSuccess();
      Alert.alert('✅ Satın Alma Başladı', 'Ödeme için cüzdanınıza yönlendiriliyorsunuz.', [{ text: 'Tamam', onPress: () => navigation.navigate('Wallet') }]);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Satın alma başarısız.'); }
    finally { setBuying(false); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!listing) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><Text style={{ color: colors.textSecondary }}>İlan bulunamadı</Text></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg }]}>Satın Alma Özeti</Text>

      <Card accentColor={colors.primary}>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>{listing.title}</Text>
        <View style={styles.row}><Text style={[typography.caption, { color: colors.textSecondary }]}>Ürün Fiyatı</Text><Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>{Number(listing.price).toLocaleString('tr-TR')} ₺</Text></View>
        {listing.shippingAvailable && <View style={styles.row}><Text style={[typography.caption, { color: colors.textSecondary }]}>Kargo</Text><Text style={[typography.caption, { color: colors.text }]}>{listing.shippingPrice ? `${listing.shippingPrice} ₺` : 'Ücretsiz'}</Text></View>}
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>Toplam</Text>
          <Text style={[typography.h2, { color: colors.primary, fontWeight: '800' }]}>{Number(listing.price + (listing.shippingPrice || 0)).toLocaleString('tr-TR')} ₺</Text>
        </View>
      </Card>

      <Card accentColor={colors.success} style={{ marginTop: spacing.md }}>
        <Text style={[typography.caption, { color: colors.success, fontWeight: '600', marginBottom: spacing.sm }]}>🛡️ KAPTAN Güvenli Ödeme</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Ödemeniz escrow'da güvende tutulur. Ürünü teslim alıp onaylayana kadar satıcıya aktarılmaz.</Text>
      </Card>

      <TouchableOpacity style={[styles.buyBtn, { backgroundColor: colors.primary }]} onPress={handleBuy} disabled={buying}>
        <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>{buying ? 'İşleniyor...' : '🛒 Satın Al'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  buyBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
});
