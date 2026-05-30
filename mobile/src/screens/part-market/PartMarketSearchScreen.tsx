import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { handleError } from '../../services/errorService';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import { hapticLight } from '../../utils/haptic';

export default function PartMarketSearchScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { query, category, categoryName } = route.params || {};
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(query || '');

  const doSearch = async () => {
    setLoading(true);
    try {
      setError(null);
      const params: any = { limit: 30 };
      if (search) params.search = search;
      const res = await apiClient.get('/part-market/listings', { params });
      setResults(res.data?.data?.items || res.data?.data || []);
    } catch (e) {
      handleError(e, { screen: 'PartMarketSearch', action: 'doSearch' });
      setError('Arama sonuçları yüklenirken bir hata oluştu.');
    } finally { setLoading(false); }
  };

  useEffect(() => { doSearch(); }, [category]);

  const COND_LABELS: Record<string, string> = { new: 'Sıfır', like_new: 'Az Kullanılmış', used: 'Kullanılmış', refurbished: 'Tadilatlı', for_parts: 'Çıkma' };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
      {/* Arama çubuğu */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.sm }}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Parça, marka ara..."
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]} onPress={doSearch}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* İlan listesi */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : results.length === 0 ? (
        <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📭</Text>
          <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center' }]}>
            {categoryName ? `"${categoryName}" kategorisinde ilan bulunamadı.` : 'Sonuç bulunamadı.'}
          </Text>
        </View>
      ) : (
        results.map((item: any) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.itemRow, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate('PartListingDetail', { id: item.id })}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]} numberOfLines={1}>
                {[item.brand, item.model, COND_LABELS[item.condition], item.city].filter(Boolean).join(' • ')}
              </Text>
            </View>
            <Text style={[typography.h3, { color: colors.primary, fontWeight: '800' }]}>
              {Number(item.price).toLocaleString('tr-TR')} TL
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, fontSize: 15, minHeight: 48 },
  filterBtn: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
});
