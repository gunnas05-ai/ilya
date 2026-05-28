import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { vehicleService } from '../../services/vehicleService';
import { hapticLight } from '../../utils/haptic';

const VEHICLE_CATEGORIES = [
  { slug: 'cekip', name: 'Çekici (TIR)', icon: '🚛' },
  { slug: 'kamyon', name: 'Kamyon', icon: '🚚' },
  { slug: 'kirkayak', name: 'Kırkayak', icon: '🛻' },
  { slug: 'lowbed', name: 'Lowbed', icon: '🏗️' },
  { slug: 'tanker', name: 'Tanker', icon: '⛽' },
  { slug: 'frigo', name: 'Frigorifik', icon: '❄️' },
  { slug: 'konteyner', name: 'Konteyner', icon: '📦' },
  { slug: 'silobas', name: 'Silobas', icon: '🔄' },
];

export default function ListingsBrowseScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {}, []));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 500); }} tintColor={colors.primary} />}
    >
      {/* Arama butonu */}
      <TouchableOpacity
        style={[styles.searchBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => { hapticLight(); navigation.navigate('CategoryBrowse', { category: 'all', categoryName: 'Tüm Araçlar' }); }}
        activeOpacity={0.7}
      >
        <Text style={[typography.body, { color: colors.textTertiary, flex: 1, marginLeft: spacing.sm }]}>Marka, model, yıl ara...</Text>
        <Text style={{ fontSize: 20 }}>🔍</Text>
      </TouchableOpacity>

      {/* Kategoriler */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>Araç Tipleri</Text>

      {VEHICLE_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.slug}
          style={[styles.catRow, { borderBottomColor: colors.border }]}
          onPress={() => { hapticLight(); navigation.navigate('CategoryBrowse', { category: cat.slug, categoryName: cat.name }); }}
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
        onPress={() => { hapticLight(); navigation.navigate('CategoryBrowse', { category: 'diger', categoryName: 'Diğer Araçlar' }); }}
        activeOpacity={0.7}
      >
        <Text style={styles.catIcon}>📋</Text>
        <Text style={[typography.body, { color: colors.text, flex: 1, fontWeight: '600' }]}>Diğer</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>Kategorilere uymayan araçlar</Text>
        <Text style={[typography.body, { color: colors.textTertiary, marginLeft: spacing.sm }]}>›</Text>
      </TouchableOpacity>

      {/* İlan Ver butonu */}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('VehicleForm', { editMode: false })}
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
