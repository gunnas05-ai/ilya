import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight } from '../../utils/haptic';

const CATEGORIES = [
  { slug: 'motor', name: 'Motor & Aktarma', icon: '🚛' },
  { slug: 'yuruyen', name: 'Yürüyen Aksam', icon: '🔧' },
  { slug: 'lastik', name: 'Lastik', icon: '🛞' },
  { slug: 'elektrik', name: 'Elektrik & Elektronik', icon: '⚡' },
  { slug: 'kaporta', name: 'Kaporta & Kabin', icon: '🛡️' },
  { slug: 'sogutma', name: 'Soğutma & Isıtma', icon: '❄️' },
  { slug: 'dorse', name: 'Dorse & Treyler', icon: '🔩' },
  { slug: 'aksesuar', name: 'Aksesuar & Ekipman', icon: '🛠️' },
];

export default function PartMarketHomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Arama butonu */}
      <TouchableOpacity
        style={[styles.searchBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => { hapticLight(); navigation.navigate('PartMarketSearch'); }}
        activeOpacity={0.7}
      >
        <Text style={[typography.body, { color: colors.textTertiary, flex: 1, marginLeft: spacing.sm }]}>Parça, marka, parça no ara...</Text>
        <Text style={{ fontSize: 20 }}>🔍</Text>
      </TouchableOpacity>

      {/* Kategoriler */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>Kategoriler</Text>

      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.slug}
          style={[styles.catRow, { borderBottomColor: colors.border }]}
          onPress={() => { hapticLight(); navigation.navigate('PartMarketSearch', { category: cat.slug, categoryName: cat.name }); }}
          activeOpacity={0.7}
        >
          <Text style={styles.catIcon}>{cat.icon}</Text>
          <Text style={[typography.body, { color: colors.text, flex: 1, fontWeight: '600' }]}>{cat.name}</Text>
          <Text style={[typography.body, { color: colors.textTertiary }]}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Diğer */}
      <TouchableOpacity
        style={[styles.catRow, { borderBottomColor: colors.border }]}
        onPress={() => { hapticLight(); navigation.navigate('PartMarketSearch', { category: 'diger', categoryName: 'Diğer' }); }}
        activeOpacity={0.7}
      >
        <Text style={styles.catIcon}>📋</Text>
        <Text style={[typography.body, { color: colors.text, flex: 1, fontWeight: '600' }]}>Diğer</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>Kategorilere uymayan ilanlar</Text>
        <Text style={[typography.body, { color: colors.textTertiary, marginLeft: spacing.sm }]}>›</Text>
      </TouchableOpacity>

      {/* İlan Ver butonu */}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('PartListingCreate')}
        activeOpacity={0.8}
      >
        <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>+ İlan Ver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1,
    marginTop: spacing.sm, marginBottom: spacing.xl,
    minHeight: 48,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  catIcon: { fontSize: 22, marginRight: spacing.md, width: 36, textAlign: 'center' },
  createBtn: {
    paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', marginTop: spacing.xl,
  },
});
