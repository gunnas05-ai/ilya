import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight, hapticMedium } from '../../utils/haptic';

const COND_LABELS: Record<string, string> = { new: 'Sıfır', like_new: 'Az Kullanılmış', used: 'Kullanılmış', refurbished: 'Tadilatlı', for_parts: 'Çıkma' };

export default function PartListingDetailScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    apiClient.get(`/part-market/listings/${id}`).then((res) => {
      setListing(res.data?.data || res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

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
    Alert.alert('✅ Mesaj Gönderildi', 'Satıcıya mesajınız iletildi. Size geri dönüş yapılacaktır.');
    setMessage('');
    setShowContact(false);
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!listing) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><Text style={{ color: colors.textSecondary }}>İlan bulunamadı</Text></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
      {/* Fotoğraf alanı */}
      <View style={[styles.photoArea, { backgroundColor: colors.card }]}>
        <Text style={{ fontSize: 64, textAlign: 'center' }}>📦</Text>
        <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>Fotoğraf yüklenmemiş</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* Fiyat */}
        <Text style={[typography.display, { color: colors.primary, fontWeight: '900', marginTop: spacing.md }]}>
          {Number(listing.price).toLocaleString('tr-TR')} TL
        </Text>

        {/* Kategori Ağacı */}
        <View style={[styles.categoryPath, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>
            🏷️ {listing.brand || 'Marka belirtilmemiş'} {listing.model ? `→ ${listing.model}` : ''} {listing.partNumber ? `→ ${listing.partNumber}` : ''}
          </Text>
          <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>
            {COND_LABELS[listing.condition] || listing.condition} {listing.mileage ? `• ${listing.mileage} km` : ''}
          </Text>
        </View>

        {/* Detaylar */}
        <View style={styles.detailSection}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Durum</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{COND_LABELS[listing.condition] || listing.condition}</Text>
          </View>
          {listing.brand && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Marka</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.brand}</Text>
            </View>
          )}
          {listing.model && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Model</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.model}</Text>
            </View>
          )}
          {listing.partNumber && (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Parça No</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.partNumber}</Text>
            </View>
          )}
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Garanti</Text>
            <Text style={[typography.caption, { color: listing.warranty ? colors.success : colors.textTertiary, fontWeight: '600' }]}>
              {listing.warranty ? `${listing.warrantyMonths || 3} ay` : 'Yok'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Teslimat</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
              {listing.localPickup ? '✅ Elden' : ''} {listing.shippingAvailable ? `🚚 Kargo ${listing.shippingPrice ? listing.shippingPrice + '₺' : 'Ücretsiz'}` : ''}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Konum</Text>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>{listing.city || 'Belirtilmemiş'}</Text>
          </View>
        </View>

        {/* Açıklama */}
        {listing.description && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>Açıklama</Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{listing.description}</Text>
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
                <TextInput
                  style={[styles.msgInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Mesajınızı yazın..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
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
  categoryPath: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md },
  detailSection: { marginTop: spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  contactHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1 },
  contactBody: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  contactOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  msgInput: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.sm },
  sendBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
});
