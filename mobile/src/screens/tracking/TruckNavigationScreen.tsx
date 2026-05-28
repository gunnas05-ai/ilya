import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { routingService, TruckRouteResult, VehicleProfile } from '../../services/routingService';
import { useCarrierStore } from '../../store/carrierStore';
import { hapticLight, hapticMedium } from '../../utils/haptic';
import Card from '../../components/shared/Card';

type RootStackParamList = {
  TruckNavigation: {
    loadId: string;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    fromCity: string;
    toCity: string;
  };
};

const DEFAULT_PROFILE: VehicleProfile = {
  height: 400,
  width: 250,
  length: 1650,
  totalWeight: 25000,
  axleWeight: 11500,
  adrClass: '',
  trailerType: 'Tenteli',
  hasRefrigeration: false,
};

const QUICK_PROFILES = [
  { label: 'Standart TIR', profile: { ...DEFAULT_PROFILE } },
  { label: 'Mega Treyler', profile: { ...DEFAULT_PROFILE, height: 450, length: 1800 } },
  { label: 'Kırkayak', profile: { ...DEFAULT_PROFILE, totalWeight: 32000, axleWeight: 13000 } },
  { label: 'Lowbed', profile: { ...DEFAULT_PROFILE, height: 320, length: 2000, totalWeight: 40000 } },
  { label: 'Tanker (ADR)', profile: { ...DEFAULT_PROFILE, height: 380, adrClass: '3', trailerType: 'Tanker' } },
];

const TruckNavigationScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const { profile: carrierProfile } = useCarrierStore();

  const originCoord = { lat: params.originLat || 41.0082, lng: params.originLng || 28.9784 };
  const destCoord = { lat: params.destLat || 39.9334, lng: params.destLng || 32.8597 };

  // EX-002: Build vehicle profile from carrier data
  const carrierBasedProfile: VehicleProfile = {
    height: carrierProfile?.vehicleType === 'Mega Treyler' ? 450 : carrierProfile?.vehicleType === 'Lowbed Çekici' ? 320 : 400,
    width: 250,
    length: carrierProfile?.volumeCapacity && carrierProfile.volumeCapacity > 85 ? 1800 : 1650,
    totalWeight: (carrierProfile?.tonnageCapacity || 25) * 1000,
    axleWeight: carrierProfile?.tonnageCapacity ? (carrierProfile.tonnageCapacity * 1000) / 2.2 : 11500,
    adrClass: carrierProfile?.srcBelgesi?.includes('SRC') ? '' : '',
    trailerType: carrierProfile?.vehicleType || 'Tenteli',
    hasRefrigeration: carrierProfile?.vehicleType === 'Frigorifik Araç',
  };

  const quickProfiles = [
    ...QUICK_PROFILES,
    { label: '🚛 Aracım', profile: carrierBasedProfile },
  ];

  const [vehicleProfile, setVehicleProfile] = useState<VehicleProfile>(carrierBasedProfile);
  const [routeResult, setRouteResult] = useState<TruckRouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [selectedProfileLabel, setSelectedProfileLabel] = useState('🚛 Aracım');

  // Calculate route on mount
  useEffect(() => {
    calculateRoute();
  }, []);

  const calculateRoute = async () => {
    setCalculating(true);
    try {
      const result = await routingService.calculateTruckRoute(
        originCoord,
        destCoord,
        [],
        vehicleProfile,
      );
      setRouteResult(result);
      hapticMedium();
    } catch (err: any) {
      Alert.alert('Rota Hesaplanamadı', err?.response?.data?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setCalculating(false);
    }
  };

  const selectProfile = (label: string, profile: VehicleProfile) => {
    hapticLight();
    setSelectedProfileLabel(label);
    setVehicleProfile(profile);
    setRouteResult(null);
    setTimeout(() => calculateRoute(), 100);
  };

  const handleBack = () => navigation.goBack();

  if (!params.originLat) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.emptyCenter}>
          <Ionicons name="navigate-outline" size={64} color={colors.textTertiary} />
          <Text style={[typography.body, { color: colors.textTertiary, marginTop: spacing.md }]}>Rota bilgisi bulunamadı.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mapRegion = {
    latitude: (originCoord.lat + destCoord.lat) / 2,
    longitude: (originCoord.lng + destCoord.lng) / 2,
    latitudeDelta: Math.abs(originCoord.lat - destCoord.lat) + 2,
    longitudeDelta: Math.abs(originCoord.lng - destCoord.lng) + 2,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <View style={[styles.backPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color="#FF6B00" />
          </View>
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Kamyon Navigasyon</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Vehicle Profile Quick Select — includes carrier's own vehicle */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.quickRow, { borderBottomColor: colors.border }]}>
        {/* Carrier's own vehicle profile (always first) */}
        <TouchableOpacity
          style={[
            styles.quickChip,
            {
              backgroundColor: selectedProfileLabel === '🚛 Aracım' ? colors.primary : colors.card,
              borderColor: selectedProfileLabel === '🚛 Aracım' ? colors.primary : colors.success,
            },
          ]}
          onPress={() => selectProfile('🚛 Aracım', carrierBasedProfile)}
          activeOpacity={0.7}
        >
          <Text style={[typography.small, { color: selectedProfileLabel === '🚛 Aracım' ? '#fff' : colors.success, fontWeight: '700' }]}>
            🚛 Aracım
          </Text>
        </TouchableOpacity>
        {QUICK_PROFILES.map((qp) => (
          <TouchableOpacity
            key={qp.label}
            style={[
              styles.quickChip,
              {
                backgroundColor: selectedProfileLabel === qp.label ? colors.primary : colors.card,
                borderColor: selectedProfileLabel === qp.label ? colors.primary : colors.border,
              },
            ]}
            onPress={() => selectProfile(qp.label, qp.profile)}
            activeOpacity={0.7}
          >
            <Text style={[typography.small, { color: selectedProfileLabel === qp.label ? '#fff' : colors.text, fontWeight: '600' }]}>
              {qp.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map */}
      <View style={[styles.mapWrap, { borderColor: colors.border }]}>
        <MapView style={styles.map} region={mapRegion}>
          <Marker coordinate={{ latitude: originCoord.lat, longitude: originCoord.lng }} title="Başlangıç" description={params.fromCity} pinColor="green" />
          <Marker coordinate={{ latitude: destCoord.lat, longitude: destCoord.lng }} title="Varış" description={params.toCity} pinColor="red" />
          {routeResult?.route.coordinates && (
            <Polyline
              coordinates={routeResult.route.coordinates.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
              strokeColor={routeResult.safetyCheck.isRouteSafe ? '#FF6B00' : '#EF4444'}
              strokeWidth={4}
            />
          )}
        </MapView>
        {calculating && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>

      {/* Safety Check Result */}
      {routeResult && (
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
          {/* Safety Banner */}
          <Card
            accentColor={routeResult.safetyCheck.isRouteSafe ? colors.success : colors.danger}
            style={styles.safetyBanner}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={routeResult.safetyCheck.isRouteSafe ? 'shield-checkmark' : 'warning'}
                size={28}
                color={routeResult.safetyCheck.isRouteSafe ? colors.success : colors.danger}
              />
              <Text style={[typography.h3, { color: routeResult.safetyCheck.isRouteSafe ? colors.success : colors.danger, marginLeft: spacing.sm, flex: 1 }]}>
                {routeResult.safetyCheck.isRouteSafe ? 'Rota Güvenli' : `${routeResult.safetyCheck.unsafeCount} Engel Tespit Edildi!`}
              </Text>
            </View>
          </Card>

          {/* Route Summary */}
          <View style={[styles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Mesafe</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{routeResult.route.totalDistanceKm} km</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Tahmini Süre</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{Math.round(routeResult.route.estimatedMinutes / 60)}s {routeResult.route.estimatedMinutes % 60}dk</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Hız Limiti</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{routeResult.truckSpeedLimitKmh} km/s</Text>
            </View>
          </View>

          {/* Vehicle Info */}
          <View style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.label, { color: colors.text, marginBottom: spacing.sm }]}>Araç Profili</Text>
            <View style={styles.vehicleGrid}>
              {[
                { label: 'Yükseklik', value: `${vehicleProfile.height} cm` },
                { label: 'Genişlik', value: `${vehicleProfile.width} cm` },
                { label: 'Ağırlık', value: `${(vehicleProfile.totalWeight / 1000).toFixed(1)} ton` },
                { label: 'Dingil', value: `${(vehicleProfile.axleWeight / 1000).toFixed(1)} ton` },
              ].map((v) => (
                <View key={v.label} style={styles.vehicleItem}>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>{v.label}</Text>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '600' }]}>{v.value}</Text>
                </View>
              ))}
            </View>
            {vehicleProfile.adrClass ? (
              <View style={[styles.adrBadge, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="flame" size={16} color={colors.warning} />
                <Text style={[typography.small, { color: colors.warning, marginLeft: spacing.xs }]}>
                  ADR Sınıf {vehicleProfile.adrClass} — Özel güzergah kısıtlamaları uygulanabilir
                </Text>
              </View>
            ) : null}
          </View>

          {/* Restriction Warnings */}
          {routeResult.safetyCheck.warnings.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[typography.h3, { color: colors.danger, marginBottom: spacing.sm }]}>
                ⚠️ Rota Engelleri
              </Text>
              {routeResult.safetyCheck.warnings.map((w, i) => (
                <Card key={i} accentColor={colors.danger} style={styles.warningCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Ionicons name={w.type === 'bridge' ? 'business' : w.type === 'tunnel' ? 'subway' : 'speedometer'} size={20} color={colors.danger} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text style={[typography.label, { color: colors.text }]}>{w.name}</Text>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>{w.description}</Text>
                      <View style={{ flexDirection: 'row', marginTop: spacing.xs, gap: spacing.md }}>
                        <Text style={[typography.small, { color: colors.danger }]}>
                          {w.maxHeight > 0 ? `Max Yükseklik: ${w.maxHeight}cm (Araç: ${w.vehicleHeight}cm)` : ''}
                        </Text>
                        <Text style={[typography.small, { color: colors.danger }]}>
                          {w.maxWeight > 0 ? `Max Tonaj: ${(w.maxWeight / 1000).toFixed(0)}t (Araç: ${(w.vehicleWeight / 1000).toFixed(1)}t)` : ''}
                        </Text>
                      </View>
                      <Text style={[typography.small, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                        Rotaya ~{w.distanceKm} km uzaklıkta
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Nearby Restrictions (safe) */}
          {routeResult.safetyCheck.allNearby.filter((r) => r.clear).length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[typography.label, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
                Yakındaki Kontrol Noktaları (Geçişe Uygun)
              </Text>
              {routeResult.safetyCheck.allNearby.filter((r) => r.clear).map((r, i) => (
                <View key={i} style={[styles.clearItem, { borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                    {r.name} (~{r.distanceKm} km)
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Recalculate Button */}
          <TouchableOpacity
            style={[styles.recalcBtn, { backgroundColor: colors.primary }]}
            onPress={calculateRoute}
            disabled={calculating}
            activeOpacity={0.8}
          >
            {calculating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[typography.button, { color: '#fff' }]}>Rotayı Yeniden Hesapla</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backPill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1 },
  quickRow: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, maxHeight: 48,
  },
  quickChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill,
    borderWidth: 1, marginRight: spacing.sm, minHeight: 32, justifyContent: 'center',
  },
  mapWrap: { height: 280, borderBottomWidth: 1 },
  map: { flex: 1 },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  resultScroll: { flex: 1 },
  resultContent: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  safetyBanner: { marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  vehicleCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vehicleItem: {
    width: '47%', padding: spacing.sm, borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  adrBadge: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.sm,
    borderRadius: radius.sm, marginTop: spacing.sm,
  },
  warningCard: { marginBottom: spacing.sm },
  clearItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs,
    borderBottomWidth: 0.5, marginBottom: spacing.xs,
  },
  recalcBtn: {
    paddingVertical: spacing.md, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: spacing.xl,
  },
});

export default TruckNavigationScreen;
