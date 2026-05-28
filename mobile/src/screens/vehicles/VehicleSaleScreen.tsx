import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { vehicleService } from '../../services/vehicleService';
import { hapticLight } from '../../utils/haptic';
import Card from '../../components/shared/Card';
import OfflineBar from '../../components/shared/OfflineBar';

const AUCTION_DURATIONS = [1, 3, 5, 7];

export default function VehicleSaleScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const vehicle = JSON.parse(route.params.vehicle);
  const [saleType, setSaleType] = useState<'fixed' | 'auction'>('fixed');
  const [price, setPrice] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [bidIncrement, setBidIncrement] = useState('1000');
  const [auctionDays, setAuctionDays] = useState(3);
  const [customEndDate, setCustomEndDate] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    hapticLight();
    if (saleType === 'fixed' && (!price || parseFloat(price) <= 0)) { Alert.alert('Eksik', 'Satış fiyatı giriniz.'); return; }
    if (saleType === 'auction' && (!startingBid || parseFloat(startingBid) <= 0)) { Alert.alert('Eksik', 'Başlangıç teklifi giriniz.'); return; }

    setSubmitting(true);
    try {
      const data: any = { vehicleId: vehicle.id, saleType };
      if (saleType === 'fixed') data.price = parseFloat(price);
      else {
        data.startingBid = parseFloat(startingBid);
        if (reservePrice) data.reservePrice = parseFloat(reservePrice);
        if (buyNowPrice) data.buyNowPrice = parseFloat(buyNowPrice);
        data.bidIncrement = parseFloat(bidIncrement) || 1000;
        data.auctionStart = new Date().toISOString();
        if (useCustomDate && customEndDate) {
          const endDateTime = customEndTime ? `${customEndDate}T${customEndTime}:00` : `${customEndDate}T23:59:00`;
          data.auctionEnd = new Date(endDateTime).toISOString();
        } else {
          data.auctionEnd = new Date(Date.now() + auctionDays * 86400000).toISOString();
        }
      }

      await vehicleService.createListing(data);
      Alert.alert('Başarılı', 'Aracınız satışa çıkarıldı!', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Satışa çıkarılamadı.';
      if (msg.missing) Alert.alert('Eksik Kriterler', msg.missing.join('\n'));
      else Alert.alert('Hata', typeof msg === 'string' ? msg : 'Satışa çıkarılamadı.');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Araç Satış</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>{vehicle.brand} {vehicle.model} ({vehicle.year})</Text>

        {/* Satış Tipi */}
        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Satış Tipi</Text>
        {(['fixed', 'auction'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.radioRow, { borderColor: saleType === t ? colors.primary : colors.border, backgroundColor: saleType === t ? colors.primary + '10' : colors.card }]} onPress={() => setSaleType(t)}>
            <View style={[styles.radio, { borderColor: saleType === t ? colors.primary : colors.border }]}>{saleType === t && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}</View>
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{t === 'fixed' ? 'Tek Fiyat' : 'Süreli İhale'}</Text>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>{t === 'fixed' ? 'Sabit fiyatla hemen sat' : 'Alıcılar teklif versin'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Form */}
        <Card accentColor={colors.primary} style={{ marginTop: spacing.lg }}>
          {saleType === 'fixed' ? (
            <View>
              <Text style={[typography.label, { color: colors.text }]}>Satış Fiyatı (TL) *</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Örn: 450000" placeholderTextColor={colors.textTertiary} />
            </View>
          ) : (
            <>
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[typography.label, { color: colors.text }]}>Başlangıç Teklifi (TL) *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={startingBid} onChangeText={setStartingBid} keyboardType="numeric" placeholder="Örn: 300000" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[typography.label, { color: colors.text }]}>Rezerv Fiyat (opsiyonel)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={reservePrice} onChangeText={setReservePrice} keyboardType="numeric" placeholder="Bu fiyata ulaşmazsa satış olmaz" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={[typography.label, { color: colors.text }]}>Hemen Al Fiyatı (opsiyonel)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={buyNowPrice} onChangeText={setBuyNowPrice} keyboardType="numeric" placeholder="Bu fiyattan anında satın alınabilir" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1, marginBottom: spacing.sm }}>
                  <Text style={[typography.label, { color: colors.text }]}>İhale Süresi</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: 4 }}>
                    {AUCTION_DURATIONS.map(d => (
                      <TouchableOpacity key={d} style={[styles.chip, { backgroundColor: auctionDays === d ? colors.primary : colors.card, borderColor: auctionDays === d ? colors.primary : colors.border }]} onPress={() => setAuctionDays(d)}>
                        <Text style={[typography.caption, { color: auctionDays === d ? colors.white : colors.text }]}>{d} Gün</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {/* Custom end date toggle */}
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }} onPress={() => setUseCustomDate(!useCustomDate)}>
                  <View style={[styles.radio, { borderColor: useCustomDate ? colors.primary : colors.border, marginRight: spacing.sm }]}>{useCustomDate && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}</View>
                  <Text style={[typography.caption, { color: colors.text }]}>Ozel bitis tarihi/sec</Text>
                </TouchableOpacity>
                {useCustomDate && (
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                    <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, flex: 1 }]} value={customEndDate} onChangeText={setCustomEndDate} placeholder="2026-12-31" placeholderTextColor={colors.textTertiary} />
                    <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, flex: 1 }]} value={customEndTime} onChangeText={setCustomEndTime} placeholder="23:59" placeholderTextColor={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1, marginBottom: spacing.sm }}>
                  <Text style={[typography.label, { color: colors.text }]}>Min. Teklif Artisi</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={bidIncrement} onChangeText={setBidIncrement} keyboardType="numeric" placeholder="1000" placeholderTextColor={colors.textTertiary} />
                </View>
              </View>
            </>
          )}
        </Card>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.success, marginTop: spacing.xl }]} onPress={handleSubmit} disabled={submitting}>
          <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>{submitting ? 'İşleniyor...' : 'Satışa Çıkar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  radioRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: 4, fontSize: 15 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  submitBtn: { paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
});
