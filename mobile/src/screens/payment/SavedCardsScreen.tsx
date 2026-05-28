import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight, hapticMedium } from '../../utils/haptic';
import Card from '../../components/shared/Card';

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  createdAt: string;
}

const BRAND_ICONS: Record<string, string> = {
  visa: '💳', mastercard: '💳', troy: '💳', amex: '💳',
};

export default function SavedCardsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Kart form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const res = await apiClient.get('/payment/card/list');
      setCards(res.data?.data || res.data || []);
    } catch {
      // Kart yok
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleAddCard = async () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
      Alert.alert('Geçersiz Kart', 'Lütfen geçerli bir kart numarası girin.');
      return;
    }
    if (!cardHolder) {
      Alert.alert('Eksik Bilgi', 'Kart üzerindeki ad soyadı girin.');
      return;
    }
    if (!expiryMonth || !expiryYear || !cvc) {
      Alert.alert('Eksik Bilgi', 'Son kullanma tarihi ve CVC girin.');
      return;
    }

    hapticMedium();
    setSavingCard(true);
    try {
      await apiClient.post('/payment/card/register', {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolderName: cardHolder,
        expiryMonth,
        expiryYear: `20${expiryYear}`,
        cvc,
      });
      Alert.alert('Başarılı', 'Kartınız güvenle kaydedildi.');
      setShowAddForm(false);
      resetForm();
      fetchCards();
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Kart kaydedilemedi.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = (cardId: string, last4: string) => {
    Alert.alert('Kartı Sil', `****${last4} kartını silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/payment/card/${cardId}`);
            hapticMedium();
            fetchCards();
          } catch {
            Alert.alert('Hata', 'Kart silinemedi.');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setCardNumber(''); setCardHolder(''); setExpiryMonth('');
    setExpiryYear(''); setCvc('');
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : cleaned);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCards(); }} />}
    >
      {/* Kayıtlı Kartlar */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
        💳 Kayıtlı Kartlarım
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
      ) : cards.length === 0 ? (
        <Card accentColor={colors.textTertiary} style={{ marginBottom: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            Henüz kayıtlı kartınız bulunmuyor.
          </Text>
        </Card>
      ) : (
        cards.map((card) => (
          <Card key={card.id} accentColor={card.isDefault ? colors.primary : colors.border} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ fontSize: 28 }}>{BRAND_ICONS[card.brand] || '💳'}</Text>
                <View>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                    **** **** **** {card.last4}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {card.cardHolderName} • {card.expiryMonth}/{card.expiryYear.slice(2)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                {card.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[typography.small, { color: colors.primary, fontWeight: '600' }]}>Varsayılan</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => handleDeleteCard(card.id, card.last4)}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Sil</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Kart Ekle Butonu */}
      {!showAddForm && (
        <TouchableOpacity
          style={[styles.addCardBtn, { borderColor: colors.primary }]}
          onPress={() => { hapticLight(); setShowAddForm(true); }}
          activeOpacity={0.7}
        >
          <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>+ Yeni Kart Ekle</Text>
        </TouchableOpacity>
      )}

      {/* Kart Ekleme Formu */}
      {showAddForm && (
        <View style={[styles.cardForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Yeni Kart Ekle</Text>
          <Text style={[typography.small, { color: colors.success, marginBottom: spacing.md }]}>
            🔒 Kart bilgileriniz SSL/TLS ile şifrelenir, platformda saklanmaz.
          </Text>

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Kart Numarası</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={cardNumber}
            onChangeText={formatCardNumber}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            maxLength={19}
          />

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Kart Üzerindeki Ad Soyad</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={cardHolder}
            onChangeText={setCardHolder}
            placeholder="AHMET YILMAZ"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Ay</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={expiryMonth}
                onChangeText={(t) => setExpiryMonth(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="12"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Yıl</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={expiryYear}
                onChangeText={(t) => setExpiryYear(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="28"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>CVC</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={cvc}
                onChangeText={(t) => setCvc(t.replace(/\D/g, '').slice(0, 3))}
                placeholder="123"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => { setShowAddForm(false); resetForm(); }}
            >
              <Text style={[typography.label, { color: colors.text }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 2 }]}
              onPress={handleAddCard}
              disabled={savingCard}
            >
              {savingCard ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Kartı Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addCardBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  defaultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  cardForm: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
  },
  submitBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
