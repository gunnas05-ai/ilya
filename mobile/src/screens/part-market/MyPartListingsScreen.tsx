import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { handleError } from '../../services/errorService';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { hapticLight } from '../../utils/haptic';
import Card from '../../components/shared/Card';

export default function MyPartListingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [listings, setListings] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'listings' | 'offers'>('listings');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [lRes, oRes] = await Promise.all([
        apiClient.get('/part-market/listings?my=true&limit=50'),
        apiClient.get('/part-market/favorites/my'),
      ]);
      setListings(lRes.data?.data?.items || lRes.data?.data || []);
      setOffers(oRes.data?.data || []);
    } catch (e) {
      handleError(e, { screen: 'MyPartListings', action: 'fetchData' });
      setError('İlanlarınız yüklenirken bir hata oluştu.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;

  if (error) return <View style={[styles.container, { backgroundColor: colors.background }]}><ErrorState message={error} onRetry={fetchData} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>İlanlarım</Text>

      <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[{ key: 'listings' as const, label: '📦 İlanlarım' }, { key: 'offers' as const, label: '❤️ Favoriler' }].map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, { backgroundColor: tab === t.key ? colors.primary : 'transparent' }]} onPress={() => { hapticLight(); setTab(t.key); }}>
            <Text style={[typography.caption, { color: tab === t.key ? '#FFF' : colors.text, fontWeight: '600' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'listings' ? (
        listings.length === 0 ? <Card accentColor={colors.textTertiary}><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz ilanınız yok.</Text></Card>
        : listings.map((item: any) => (
          <Card key={item.id} accentColor={item.status === 'active' ? colors.success : colors.textTertiary} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{Number(item.price).toLocaleString('tr-TR')} ₺ • {item.status === 'active' ? '🟢 Aktif' : item.status === 'sold' ? '✅ Satıldı' : '⚫ Yayında değil'}</Text>
              </View>
            </View>
          </Card>
        ))
      ) : (
        offers.length === 0 ? <Card accentColor={colors.textTertiary}><Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz favori ilanınız yok.</Text></Card>
        : offers.map((fav: any) => (
          <Card key={fav.id} accentColor={colors.danger} style={{ marginBottom: spacing.sm }}>
            <TouchableOpacity onPress={() => navigation.navigate('PartListingDetail', { id: fav.listingId })}>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>❤️ Favori İlan</Text>
            </TouchableOpacity>
          </Card>
        ))
      )}

      <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('PartListingCreate')}>
        <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>+ Yeni İlan Ver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  createBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
});
