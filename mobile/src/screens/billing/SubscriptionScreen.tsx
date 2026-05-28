import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight, hapticMedium } from '../../utils/haptic';
import Card from '../../components/shared/Card';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxLoads: number;
  maxUsers: number;
  features: Record<string, boolean>;
  description: string;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
}

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  isDefault: boolean;
}

export default function SubscriptionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, subRes, cardsRes] = await Promise.all([
        apiClient.get('/billing/plans'),
        apiClient.get('/billing/subscription'),
        apiClient.get('/payment/card/list'),
      ]);
      setPlans(plansRes.data?.data || plansRes.data || []);
      const subData = subRes.data?.data || subRes.data;
      setSubscription(subData?.id ? subData : null);
      setCards(cardsRes.data?.data || cardsRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubscribe = (plan: Plan) => {
    if (cards.length === 0) {
      Alert.alert('Kart Gerekli', 'Abonelik için önce bir kart eklemelisiniz.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Kart Ekle', onPress: () => navigation.navigate('SavedCards') },
      ]);
      return;
    }

    const defaultCard = cards.find((c) => c.isDefault) || cards[0];
    Alert.alert(
      'Abonelik Onayı',
      `${plan.displayName} paketini aylık ${plan.monthlyPrice} TL'ye satın almak istediğinize emin misiniz?\n\nKart: ****${defaultCard.last4}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Satın Al',
          onPress: async () => {
            hapticMedium();
            setPurchasing(plan.id);
            try {
              await apiClient.post('/billing/subscribe', {
                planId: plan.id,
                paymentMethodId: defaultCard.id,
              });
              Alert.alert('Başarılı', `${plan.displayName} paketine hoş geldiniz!`);
              fetchData();
            } catch (err: any) {
              Alert.alert('Hata', err.response?.data?.message || 'Ödeme başarısız oldu.');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert('Aboneliği İptal Et', 'Aboneliğiniz dönem sonunda iptal edilecektir. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete('/billing/subscription');
            hapticMedium();
            fetchData();
            Alert.alert('İptal Edildi', 'Aboneliğiniz dönem sonunda sona erecek.');
          } catch {
            Alert.alert('Hata', 'İptal işlemi başarısız.');
          }
        },
      },
    ]);
  };

  const getFeatureIcon = (val: boolean) => val ? '✅' : '❌';

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
      refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} />}
    >
      {/* Mevcut Abonelik */}
      {subscription ? (
        <Card accentColor={colors.success} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.success, fontWeight: '800' }]}>Mevcut Aboneliğiniz</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[typography.body, { color: colors.text }]}>
              Durum: <Text style={{ color: colors.success, fontWeight: '700' }}>
                {subscription.status === 'active' ? '🟢 Aktif' : subscription.status === 'grace_period' ? '🟡 Ödeme Bekliyor' : '🔴 Sona Ermiş'}
              </Text>
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              Sonraki yenileme: {new Date(subscription.currentPeriodEnd).toLocaleDateString('tr-TR')}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Otomatik yenileme: {subscription.autoRenew ? '✅ Açık' : '❌ Kapalı'}
            </Text>
          </View>
          {subscription.status === 'active' && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.danger, marginTop: spacing.md }]}
              onPress={handleCancel}
            >
              <Text style={[typography.label, { color: colors.danger }]}>Aboneliği İptal Et</Text>
            </TouchableOpacity>
          )}
        </Card>
      ) : (
        <Card accentColor={colors.warning} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h3, { color: colors.warning, fontWeight: '800' }]}>Aboneliğiniz Yok</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Yük oluşturmak ve platform özelliklerini kullanmak için bir paket seçin.
          </Text>
        </Card>
      )}

      {/* Paketler */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>
        📦 Abonelik Paketleri
      </Text>

      {plans.map((plan) => {
        const isCurrentPlan = subscription?.planId === plan.id;
        return (
          <Card
            key={plan.id}
            accentColor={isCurrentPlan ? colors.success : plan.name === 'PROFESSIONAL' ? colors.primary : colors.border}
            style={{ marginBottom: spacing.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <View>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '700' }]}>{plan.displayName}</Text>
                {plan.description && (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{plan.description}</Text>
                )}
              </View>
              {isCurrentPlan && (
                <View style={[styles.activeBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[typography.small, { color: colors.success, fontWeight: '700' }]}>Aktif</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md }}>
              <Text style={[typography.display, { color: colors.primary, fontWeight: '900' }]}>
                {plan.monthlyPrice}₺
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>/ay</Text>
              {plan.yearlyPrice > 0 && (
                <Text style={[typography.small, { color: colors.success, marginLeft: spacing.sm, fontWeight: '600' }]}>
                  Yıllık {plan.yearlyPrice}₺ (%20 indirim)
                </Text>
              )}
            </View>

            <View style={[styles.featureList, { borderTopColor: colors.border }]}>
              <View style={styles.featureRow}>
                <Text style={[typography.caption, { color: colors.text }]}>
                  {plan.maxLoads === -1 ? '🚛 Limitsiz yük' : `🚛 ${plan.maxLoads} yük/ay`}
                </Text>
                <Text style={[typography.caption, { color: colors.text }]}>👥 {plan.maxUsers} kullanıcı</Text>
              </View>
              {plan.features && Object.entries(plan.features).map(([key, val]) => (
                <Text key={key} style={[typography.caption, { color: val ? colors.text : colors.textTertiary, marginTop: 2 }]}>
                  {getFeatureIcon(val as boolean)} {key === 'webhook' ? 'Webhook' : key === 'api' ? 'API Erişimi' : key === 'sla' ? 'SLA Desteği' : key === 'premium_support' ? 'Premium Destek' : key === 'white_label' ? 'Beyaz Etiket' : key}
                </Text>
              ))}
            </View>

            {!isCurrentPlan && (
              <TouchableOpacity
                style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSubscribe(plan)}
                disabled={purchasing === plan.id}
              >
                {purchasing === plan.id ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Paketi Seç</Text>
                )}
              </TouchableOpacity>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  activeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  featureList: { borderTopWidth: 1, paddingTop: spacing.sm, marginTop: spacing.sm },
  featureRow: { flexDirection: 'row', gap: spacing.md },
  buyBtn: {
    paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, minHeight: 48,
  },
  cancelBtn: {
    paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', minHeight: 40,
  },
});
