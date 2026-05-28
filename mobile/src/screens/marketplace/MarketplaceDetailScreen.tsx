import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { marketplaceService } from '../../services/marketplaceService';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';

export default function MarketplaceDetailScreen({ route, navigation }: any) {
  const { listingId } = route.params;
  const { colors } = useTheme();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [compatResult, setCompatResult] = useState<any>(null);
  const [compatListingId, setCompatListingId] = useState('');

  useEffect(() => {
    marketplaceService.getListing(listingId).then(setListing).catch(() => setError('İlan yüklenemedi')).finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return <View style={{ flex:1, backgroundColor:colors.background }}><OfflineBar /><ListSkeleton /></View>;
  if (error) return <View style={{ flex:1, backgroundColor:colors.background }}><OfflineBar /><ErrorState message={error} onRetry={() => { setLoading(true); marketplaceService.getListing(listingId).then(setListing).finally(() => setLoading(false)); }} /></View>;
  if (!listing) return null;

  const vd = listing.vehicleDetail;

  const handleOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) { Alert.alert('Uyarı', 'Geçerli bir teklif tutarı giriniz.'); return; }
    try {
      await marketplaceService.createOffer({ listingId, offerAmount: parseFloat(offerAmount), message: offerMsg });
      hapticSuccess();
      Alert.alert('Başarılı', 'Teklifiniz iletildi.');
      setShowOfferForm(false);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Teklif gönderilemedi.'); }
  };

  const handleTowingCheck = async () => {
    if (!compatListingId) { Alert.alert('Uyarı', 'Eşleştirilecek dorse/çekici ilan ID giriniz.'); return; }
    try {
      const res = await marketplaceService.checkTowingCompatibility(
        vd?.vehicleType === 'dorse' ? compatListingId : listingId,
        vd?.vehicleType === 'dorse' ? listingId : compatListingId,
      );
      setCompatResult(res);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Uyumluluk kontrolü başarısız.'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.xs }]}>{listing.title}</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{listing.city} / {listing.district}</Text>

        <Card accentColor={colors.success} style={{ marginTop: spacing.md }}>
          <Text style={[typography.h2, { color: colors.success }]}>{(listing.price / 1000).toFixed(0)}k ₺</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
            {listing.isEscrowSupported && <Text style={[typography.small, { color: colors.success }]}>🔒 Escrow</Text>}
            {listing.isBarterAvailable && <Text style={[typography.small, { color: colors.info }]}>🔄 Takas</Text>}
            {listing.isNegotiable && <Text style={[typography.small, { color: colors.warning }]}>💰 Pazarlık</Text>}
            {listing.aiRiskScore > 0.5 && <Text style={[typography.small, { color: colors.danger }]}>⚠️ Risk: {listing.aiRiskScore}</Text>}
          </View>
        </Card>

        <Text style={[typography.body, { color: colors.text, marginTop: spacing.md }]}>{listing.description}</Text>

        {/* Vehicle Details */}
        {vd && (
          <Card accentColor={colors.info} style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>🚛 Araç Detayları</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {vd.vehicleType && <Chip label={`Tip: ${vd.vehicleType}`} colors={colors} />}
              {vd.brand && <Chip label={`Marka: ${vd.brand}`} colors={colors} />}
              {vd.model && <Chip label={`Model: ${vd.model}`} colors={colors} />}
              {vd.modelYear && <Chip label={`Yıl: ${vd.modelYear}`} colors={colors} />}
              {vd.currentKm && <Chip label={`${(vd.currentKm / 1000).toFixed(0)}k km`} colors={colors} />}
              {vd.kingPinDiameter && <Chip label={`King Pin: ${vd.kingPinDiameter}"`} colors={colors} />}
              {vd.axleCapacityKg && <Chip label={`Aks: ${(vd.axleCapacityKg / 1000).toFixed(1)}t`} colors={colors} />}
              {vd.trailerType && <Chip label={`Dorse: ${vd.trailerType}`} colors={colors} />}
              {vd.adrClass && <Chip label={`ADR: ${vd.adrClass}`} colors={colors} />}
            </View>
          </Card>
        )}

        {/* EX-013: Towing Compatibility Check */}
        {vd && (vd.vehicleType === 'cekici' || vd.vehicleType === 'dorse' || vd.vehicleType === 'tir') && (
          <Card accentColor={colors.warning} style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>🔗 Çekici-Dorse Uyum Kontrolü</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              {vd.vehicleType === 'dorse' ? 'Bu dorse için çekici' : 'Bu çekici için dorse'} ilan ID'sini girin:
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, flex: 1 }]} placeholder="İlan ID" placeholderTextColor={colors.textTertiary} value={compatListingId} onChangeText={setCompatListingId} />
              <TouchableOpacity style={[styles.checkBtn, { backgroundColor: colors.primary }]} onPress={handleTowingCheck}>
                <Text style={[typography.label, { color: colors.white }]}>Kontrol Et</Text>
              </TouchableOpacity>
            </View>
            {compatResult && (
              <View style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: compatResult.compatible ? colors.success + '10' : colors.danger + '10', borderRadius: radius.md }}>
                <Text style={[typography.label, { color: compatResult.compatible ? colors.success : colors.danger, fontWeight: '700' }]}>{compatResult.recommendation}</Text>
                {compatResult.checks?.map((c: any, i: number) => (
                  <Text key={i} style={[typography.small, { color: c.compatible ? colors.success : colors.danger, marginTop: 2 }]}>{c.compatible ? '✅' : '❌'} {c.detail}</Text>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Offer Button */}
        {!showOfferForm ? (
          <TouchableOpacity style={[styles.offerBtn, { backgroundColor: colors.primary }]} onPress={() => { hapticLight(); setShowOfferForm(true); }}>
            <Text style={[typography.label, { color: colors.white }]}>💬 Teklif Ver</Text>
          </TouchableOpacity>
        ) : (
          <Card accentColor={colors.primary} style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Teklif Ver</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Teklif Tutarı (₺)" placeholderTextColor={colors.textTertiary} value={offerAmount} onChangeText={setOfferAmount} keyboardType="numeric" />
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 72 }]} placeholder="Mesajınız (opsiyonel)" placeholderTextColor={colors.textTertiary} value={offerMsg} onChangeText={setOfferMsg} multiline />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.success }]} onPress={handleOffer}><Text style={[typography.label, { color: colors.white }]}>Gönder</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={() => setShowOfferForm(false)}><Text style={[typography.label, { color: colors.textTertiary }]}>İptal</Text></TouchableOpacity>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function Chip({ label, colors }: { label: string; colors: any }) {
  return <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.surface }}><Text style={[typography.small, { color: colors.textTertiary }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  input: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, minHeight: 44, fontSize: 14, marginBottom: spacing.sm },
  checkBtn: { paddingHorizontal: spacing.lg, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  offerBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
  formBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
});
