import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { handleError } from '../../services/errorService';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { hapticLight, hapticMedium } from '../../utils/haptic';
import Card from '../../components/shared/Card';

export default function PartOffersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [counterId, setCounterId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [rRes, sRes] = await Promise.all([
        apiClient.get('/part-market/favorites/my').catch(() => ({ data: { data: [] } })),
        apiClient.get('/part-market/offers/my'),
      ]);
      setSent(sRes.data?.data || []);
      setReceived([]);
    } catch (e) {
      handleError(e, { screen: 'PartOffers', action: 'fetchData' });
      setError('Teklifler yüklenirken bir hata oluştu.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAccept = async (offerId: string) => {
    hapticMedium();
    try { await apiClient.put(`/part-market/offers/${offerId}/accept`); Alert.alert('✅', 'Teklif kabul edildi.'); fetchData(); }
    catch (e) { handleError(e, { screen: 'PartOffers', action: 'accept' }); }
  };

  const handleReject = async (offerId: string) => {
    try { await apiClient.put(`/part-market/offers/${offerId}/reject`); fetchData(); }
    catch { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  const handleCounter = async (offerId: string) => {
    const amount = parseFloat(counterAmount);
    if (!amount || amount <= 0) { Alert.alert('Uyarı', 'Geçerli bir tutar girin.'); return; }
    hapticMedium();
    try { await apiClient.put(`/part-market/offers/${offerId}/counter`, { amount, message: '' }); setCounterId(null); fetchData(); }
    catch { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>Teklifler</Text>

      <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[{ key: 'received' as const, label: '📥 Gelen' }, { key: 'sent' as const, label: '📤 Verdiğim' }].map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, { backgroundColor: tab === t.key ? colors.primary : 'transparent' }]} onPress={() => { hapticLight(); setTab(t.key); }}>
            <Text style={[typography.caption, { color: tab === t.key ? '#FFF' : colors.text, fontWeight: '600' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'sent' ? (
        sent.length === 0 ? <Card accentColor={colors.textTertiary}><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz teklif vermediniz.</Text></Card>
        : sent.map((o: any) => (
          <Card key={o.id} accentColor={o.status === 'accepted' ? colors.success : o.status === 'rejected' ? colors.danger : colors.warning} style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{Number(o.amount).toLocaleString('tr-TR')} ₺</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Durum: {o.status === 'pending' ? '🟡 Bekliyor' : o.status === 'accepted' ? '✅ Kabul' : o.status === 'rejected' ? '❌ Red' : o.status === 'countered' ? `🔄 Karşı: ${o.counterAmount}₺` : o.status}</Text>
          </Card>
        ))
      ) : (
        <Card accentColor={colors.textTertiary}><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Gelen teklifler ilan detayında görüntülenir.</Text></Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
});
