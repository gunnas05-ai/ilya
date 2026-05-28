import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { marketplaceService } from '../../services/marketplaceService';
import { hapticLight } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import Card from '../../components/shared/Card';

const CATEGORIES = [
  { id: 1, name: 'Çekici', icon: '🚛', slug: 'cekici' },
  { id: 2, name: 'Dorse', icon: '📦', slug: 'dorse' },
  { id: 3, name: 'Kamyon', icon: '🚚', slug: 'kamyon' },
  { id: 4, name: 'Yedek Parça', icon: '🔧', slug: 'yedek-parca' },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10B981', PENDING: '#F59E0B', RESERVED: '#3B82F6', SOLD: '#9CA3AF',
};

export default function MarketplaceBrowseScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      const res = await marketplaceService.getListings({
        categoryId: activeCategory || undefined,
        search: search || undefined,
      });
      setListings(res.listings || []);
    } catch { setListings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeCategory, search]);

  useEffect(() => { setLoading(true); fetchListings(); }, [fetchListings]);

  if (loading) return <View style={{ flex:1, backgroundColor:colors.background }}><OfflineBar /><ListSkeleton /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Çekici, dorse, yedek parça ara..." placeholderTextColor={colors.textTertiary} value={search} onChangeText={setSearch} onSubmitEditing={fetchListings} />
      </View>

      {/* Categories */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm }}>
        {CATEGORIES.map(c => {
          const isActive = activeCategory === c.id;
          return (
            <TouchableOpacity key={c.id} style={[styles.catChip, { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: isActive ? colors.primary : colors.border }]} onPress={() => { hapticLight(); setActiveCategory(isActive ? null : c.id); }}>
              <Text style={[typography.caption, { color: isActive ? colors.white : colors.text }]}>{c.icon} {c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => { hapticLight(); navigation.navigate('MarketplaceDetail', { listingId: item.id }); }}>
            <Card accentColor={STATUS_COLORS[item.status] || colors.primary} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.city} / {item.district}</Text>
                </View>
                <Text style={[typography.h3, { color: colors.success }]}>{(item.price / 1000).toFixed(0)}k ₺</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                {item.aiRiskScore > 0.5 && <Text style={[typography.small, { color: colors.danger }]}>⚠️ Risk: {item.aiRiskScore}</Text>}
                {item.isBarterAvailable && <Text style={[typography.small, { color: colors.info }]}>🔄 Takas</Text>}
                {item.isEscrowSupported && <Text style={[typography.small, { color: colors.success }]}>🔒 Escrow</Text>}
              </View>
            </Card>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchListings(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState title="İlan bulunamadı" description="Pazaryerinde henüz ilan yok." />}
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => { hapticLight(); navigation.navigate('MarketplaceCreate'); }}>
        <Text style={{ color: colors.white, fontSize: 28, fontWeight: '300' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, minHeight: 44 },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 14 },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
