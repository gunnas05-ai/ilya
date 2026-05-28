import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticMedium } from '../../utils/haptic';
import Card from '../../components/shared/Card';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonusCredits: number;
}

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  isDefault: boolean;
}

export default function CreditShopScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pkgsRes, balRes, cardsRes] = await Promise.all([
        apiClient.get('/billing/credits/packages'),
        apiClient.get('/billing/credits/balance'),
        apiClient.get('/payment/card/list'),
      ]);
      setPackages(pkgsRes.data?.data || []);
      setBalance(balRes.data?.data || { balance: 0 });
      setCards(cardsRes.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBuy = (pkg: CreditPackage) => {
    if (cards.length === 0) {
      Alert.alert('Kart Gerekli', 'Önce bir kart eklemelisiniz.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Kart Ekle', onPress: () => navigation.navigate('SavedCards') },
      ]);
      return;
    }
    const defaultCard = cards.find((c) => c.isDefault) || cards[0];
    const totalCredits = pkg.credits + (pkg.bonusCredits || 0);

    Alert.alert(
      'Kontör Satın Al',
      `${pkg.name}\n${totalCredits} kontör — ${pkg.price} TL\n\nKart: ****${defaultCard.last4}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Satın Al',
          onPress: async () => {
            hapticMedium();
            setPurchasing(pkg.id);
            try {
              await apiClient.post('/billing/credits/buy', { packageId: pkg.id, paymentMethodId: defaultCard.id });
              Alert.alert('Başarılı', `${totalCredits} kontör hesabınıza eklendi!`);
              fetchData();
            } catch (err: any) {
              Alert.alert('Hata', err.response?.data?.message || 'Ödeme başarısız.');
            } finally { setPurchasing(null); }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
    >
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>
        Kontör Satın Al
      </Text>

      {/* Bakiye Kartı */}
      <Card accentColor={colors.warning} style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Mevcut Bakiye</Text>
            <Text style={[typography.display, { color: colors.warning, fontWeight: '900' }]}>{balance?.balance || 0}</Text>
            <Text style={[typography.small, { color: colors.textTertiary }]}>kontör</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Alınan: {balance?.totalPurchased || 0}</Text>
            <Text style={[typography.small, { color: colors.textTertiary }]}>Kullanılan: {balance?.totalUsed || 0}</Text>
          </View>
        </View>
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          💡 1 kontör = 1 e-Fatura veya e-İrsaliye oluşturma hakkı
        </Text>
      </Card>

      {/* Paketler */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
        📦 Kontör Paketleri
      </Text>

      {packages.map((pkg) => {
        const totalCredits = pkg.credits + (pkg.bonusCredits || 0);
        return (
          <Card key={pkg.id} accentColor={colors.warning} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>{pkg.name}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {totalCredits} kontör {pkg.bonusCredits > 0 ? `(+${pkg.bonusCredits} hediye)` : ''}
                </Text>
                <Text style={[typography.h3, { color: colors.warning, fontWeight: '800', marginTop: spacing.xs }]}>
                  {pkg.price} ₺
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.buyBtn, { backgroundColor: colors.warning }]}
                onPress={() => handleBuy(pkg)}
                disabled={purchasing === pkg.id}
              >
                {purchasing === pkg.id ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Satın Al</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}

      {cards.length === 0 && (
        <Card accentColor={colors.info} style={{ marginTop: spacing.md }}>
          <Text style={[typography.caption, { color: colors.info, textAlign: 'center' }]}>
            💳 Kontör satın almak için önce bir kart eklemelisiniz.
          </Text>
          <TouchableOpacity
            style={[styles.addCardBtn, { borderColor: colors.primary }]}
            onPress={() => navigation.navigate('SavedCards')}
          >
            <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>+ Kart Ekle</Text>
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  buyBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.md, minWidth: 100, alignItems: 'center' },
  addCardBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', marginTop: spacing.md },
});
