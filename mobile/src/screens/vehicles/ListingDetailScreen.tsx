import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { vehicleService } from '../../services/vehicleService';
import { hapticLight, hapticMedium } from '../../utils/haptic';

const FUEL_LABELS: Record<string, string> = { benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG', elektrik: 'Elektrik', hibrit: 'Hibrit' };
const TRANS_LABELS: Record<string, string> = { manuel: 'Manuel', otomatik: 'Otomatik', yari_otomatik: 'Yarı Otomatik' };

export default function ListingDetailScreen({ navigation, route }: any) {
  const { listingId } = route.params;
  const { colors } = useTheme();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    vehicleService.getListing(listingId).then((data) => {
      setListing(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [listingId]);

  const handleCall = () => {
    hapticMedium();
    Alert.alert('📞 Telefon', 'Satıcı iletişim bilgisi mesaj yoluyla paylaşılacaktır.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Mesaj Gönder', onPress: () => setShowContact(true) },
    ]);
  };

  const handleSendMessage = () => {
    if (!message.trim()) { Alert.alert('Uyarı', 'Lütfen bir mesaj yazın.'); return; }
    hapticMedium();
    setSent(true);
    Alert.alert('✅ Mesaj Gönderildi', 'Satıcıya mesajınız iletildi.');
    setMessage('');
    setShowContact(false);
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!listing) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><Text style={{ color: colors.textSecondary }}>İlan bulunamadı</Text></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
      {/* Fotoğraf alanı */}
      <View style={[styles.photoArea, { backgroundColor: colors.card }]}>
        {listing.photos?.[0]?.url ? (
          <Image source={{ uri: listing.photos[0].url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 64, textAlign: 'center' }}>🚛</Text>
        )}
        {!listing.photos?.[0]?.url && <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>Fotoğraf yüklenmemiş</Text>}
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* Fiyat */}
        <Text style={[typography.display, { color: colors.primary, fontWeight: '900', marginTop: spacing.md }]}>
          {listing.price ? `${Number(listing.price).toLocaleString('tr-TR')} TL` : 'Fiyat yok'}
        </Text>

        {/* Kategori Ağacı */}
        <View style={[styles.categoryPath, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>
            🏷️ {listing.brand || 'Marka yok'} {listing.model ? `→ ${listing.model}` : ''} {listing.year ? `→ ${listing.year}` : ''}
          </Text>
          <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>
            {[FUEL_LABELS[listing.fuelType], TRANS_LABELS[listing.transmission], listing.color].filter(Boolean).join(' • ')}
          </Text>
        </View>

        {/* Detaylar */}
        <View style={styles.detailSection}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Marka</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.brand || '-'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Model</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.model || '-'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Yıl</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.year || '-'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Kilometre</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{(listing.mileage || 0).toLocaleString('tr-TR')} km</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Yakıt</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{FUEL_LABELS[listing.fuelType] || '-'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Vites</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{TRANS_LABELS[listing.transmission] || '-'}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Renk</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.color || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Plaka</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.plate || '-'}</Text>
          </View>
        </View>

        {/* Açıklama */}
        {listing.description && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Açıklama</Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{listing.description}</Text>
          </View>
        )}

        {/* Kaza / Servis kaydı */}
        {listing.hasAccident && listing.accidentDetail && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.warning, fontWeight: '700', marginBottom: spacing.xs }]}>⚠️ Kaza Geçmişi</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{listing.accidentDetail}</Text>
          </View>
        )}

        {/* İletişime Geçin Accordion */}
        <View style={{ marginTop: spacing.xl }}>
          <TouchableOpacity
            style={[styles.contactHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { hapticLight(); setShowContact(!showContact); }}
            activeOpacity={0.7}
          >
            <Text style={[typography.h3, { color: colors.text, fontWeight: '700', flex: 1 }]}>📞 İletişime Geçin</Text>
            <Text style={[typography.body, { color: colors.textTertiary }]}>{showContact ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showContact && (
            <View style={[styles.contactBody, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={[styles.contactOption, { borderBottomColor: colors.border }]} onPress={handleCall}>
                <Text style={{ fontSize: 24, marginRight: spacing.md }}>📞</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Telefon ile Ulaş</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>Satıcının telefon numarasını gör</Text>
                </View>
                <Text style={[typography.body, { color: colors.textTertiary }]}>›</Text>
              </TouchableOpacity>

              <View style={{ padding: spacing.md }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>veya mesaj bırakın:</Text>
                <TextInput style={[styles.msgInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={message} onChangeText={setMessage} placeholder="Mesajınızı yazın..." placeholderTextColor={colors.textTertiary} multiline />
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={handleSendMessage}>
                  <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>{sent ? '✅ Gönderildi' : 'Mesaj Gönder'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { justifyContent: 'center', alignItems: 'center' },
  photoArea: { height: 250, justifyContent: 'center', alignItems: 'center' },
  photo: { width: '100%', height: '100%' },
  categoryPath: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md },
  detailSection: { marginTop: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  contactHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1 },
  contactBody: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  contactOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  msgInput: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.sm },
  sendBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
});
