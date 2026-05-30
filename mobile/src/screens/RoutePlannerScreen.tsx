import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useNearbyFuelStations, useNearbyRestaurants } from '../hooks/query';
import { spacing, radius, typography } from '../theme';
import Card from '../components/shared/Card';
import ListSkeleton from '../components/shared/ListSkeleton';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_CENTER = { lat: 40.7854, lng: 31.3021 }; // Düzce/Kaynaşlı merkez

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

export default function RoutePlannerScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const [center] = useState(DEFAULT_CENTER);

  const fuelQuery = useNearbyFuelStations(center.lat, center.lng, 100);
  const restaurantQuery = useNearbyRestaurants(center.lat, center.lng, 100);

  const loading = fuelQuery.isLoading || restaurantQuery.isLoading;
  const error = fuelQuery.isError || restaurantQuery.isError;

  const stations = (fuelQuery.data || []).map((s: any) => ({
    ...s,
    distanceKm: s.distanceKm || getDistance(center.lat, center.lng, s.latitude || center.lat, s.longitude || center.lng),
  }));

  const restaurants = (restaurantQuery.data || []).map((r: any) => ({
    ...r,
    distanceKm: r.distanceKm || getDistance(center.lat, center.lng, r.latitude || center.lat, r.longitude || center.lng),
  }));

  // Combined & sorted: cheapest fuel stops and nearest restaurants
  const cheapestFuel = [...stations].sort((a, b) => {
    const priceA = a.prices?.motorin || 999;
    const priceB = b.prices?.motorin || 999;
    return priceA - priceB;
  }).slice(0, 3);

  const nearestRestaurants = [...restaurants]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  const refetch = () => { fuelQuery.refetch(); restaurantQuery.refetch(); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>🗺️ Rota Planlayıcı</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Yakıt, mola ve yemek noktalarını rotana göre planla</Text>

      {loading ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <ErrorState message="Rota verileri yüklenirken bir hata oluştu." onRetry={refetch} />
      ) : (
        <>
          {/* En Ucuz Yakıt */}
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>⛽ En Ucuz 3 Motorin</Text>
          {cheapestFuel.length === 0 ? (
            <EmptyState emoji="⛽" message="Yakıt istasyonu bulunamadı." />
          ) : (
            cheapestFuel.map((s, i) => (
              <TouchableOpacity key={s.id || i} style={[s2.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('FuelStations')}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{i + 1}. {s.name}</Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>{s.brand} • {s.distanceKm} km</Text>
                  </View>
                  <Text style={[typography.h3, { color: colors.success, fontWeight: '800' }]}>{s.prices?.motorin || '--'} ₺</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={[s2.linkBtn, { borderColor: colors.primary }]} onPress={() => navigation.navigate('FuelStations')}>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>Tüm İstasyonlar →</Text>
          </TouchableOpacity>

          {/* En Yakın Restoranlar */}
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.lg }]}>🍽️ En Yakın 5 Tesis</Text>
          {nearestRestaurants.length === 0 ? (
            <EmptyState emoji="🍽️" message="Yakında restoran bulunamadı." />
          ) : (
            nearestRestaurants.map((r, i) => (
              <TouchableOpacity key={r.id || i} style={[s2.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Restaurants')}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{r.name}</Text>
                    <Text style={[typography.small, { color: colors.textSecondary }]}>{r.cuisine || 'Restoran'} • {r.distanceKm} km • ~{r.eta || Math.round(r.distanceKm * 1.2 + 5)} dk</Text>
                  </View>
                  {r.rating && (
                    <View style={[s2.rating, { backgroundColor: '#F59E0B' }]}>
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>★ {r.rating}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={[s2.linkBtn, { borderColor: colors.primary }]} onPress={() => navigation.navigate('Restaurants')}>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>Tüm Tesisler →</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Hızlı Erişim */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.lg }]}>⚡ Hızlı Erişim</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { label: 'Yük Ara', icon: '🔍', screen: 'LoadAccept' as const },
          { label: 'Cüzdan', icon: '💰', screen: 'Wallet' as const },
          { label: 'Panel', icon: '🚛', screen: 'DriverDashboard' as const },
        ].map(item => (
          <TouchableOpacity key={item.screen} style={[s2.qBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate(item.screen as any)}>
            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            <Text style={[typography.small, { color: colors.text, fontWeight: '600', marginTop: 4 }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s2 = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  linkBtn: { paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', marginTop: spacing.sm },
  rating: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  qBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
});
