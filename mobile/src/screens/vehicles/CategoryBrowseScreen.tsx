import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { vehicleService } from '../../services/vehicleService';

const FUEL_LABELS: Record<string, string> = { benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG', elektrik: 'Elektrik', hibrit: 'Hibrit' };
const TRANS_LABELS: Record<string, string> = { manuel: 'Manuel', otomatik: 'Otomatik', yari_otomatik: 'Yarı Otomatik' };

export default function CategoryBrowseScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { categoryName } = route.params || {};
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    try {
      const data = await vehicleService.getListings();
      setListings(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, []));

  const filtered = search ? listings.filter((l: any) =>
    `${l.brand} ${l.model}`.toLowerCase().includes(search.toLowerCase())
  ) : listings;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.sm }}>
        <TextInput style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={search} onChangeText={setSearch} placeholder="Marka, model ara..." placeholderTextColor={colors.textTertiary} />
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]} onPress={fetch}><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>🔍</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      : filtered.length === 0 ? (
        <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📭</Text>
          <Text style={[typography.body, { color: colors.textTertiary }]}>{categoryName ? `"${categoryName}" kategorisinde ilan bulunamadı.` : 'Sonuç bulunamadı.'}</Text>
        </View>
      ) : (
        filtered.map((item: any) => (
          <TouchableOpacity key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })} activeOpacity={0.7}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{item.brand} {item.model}</Text>
              <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]} numberOfLines={1}>{[item.year, FUEL_LABELS[item.fuelType], TRANS_LABELS[item.transmission], `${(item.mileage || 0).toLocaleString('tr-TR')} km`].filter(Boolean).join(' • ')}</Text>
            </View>
            <Text style={[typography.h3, { color: colors.primary, fontWeight: '800' }]}>{item.price ? `${Number(item.price).toLocaleString('tr-TR')} TL` : 'Fiyat yok'}</Text>
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
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
});
