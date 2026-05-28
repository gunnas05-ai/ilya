import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { loadService } from '../../services/loadService';
import { calculateDistance } from '../../services/trackingService';
import { getCurrentLocation } from '../../services/locationService';
import { hapticLight } from '../../utils/haptic';
import { ProfileRequiredScreen } from '../../components/ProfileStatusBanner';
import { apiClient } from '../../services/api';
import LoadCard from '../../components/LoadCard';

const LOAD_TYPE_LABELS: Record<string, string> = { tam_yuk: 'Tam Yük', kismi_yuk: 'Kısmi', evden_eve: 'Evden Eve', sehir_ici: 'Şehir İçi' };

export default function LoadAcceptScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [profileVerified, setProfileVerified] = useState<boolean | null>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);

  const DEMO_LOADS = [
    { id: 'demo-1', title: 'Tekstil Ürünleri — 18 Palet', fromCity: 'İstanbul', toCity: 'Ankara', status: 'beklemede', weight: '18 ton', vehicleType: 'Tenteli TIR', totalPrice: 28500, loadType: 'tam_yuk', pickupLat: 41.0, pickupLng: 28.9, pickupDate: '2026-06-01' },
    { id: 'demo-2', title: 'Demir Çelik Sac Rulo', fromCity: 'Kocaeli', toCity: 'İzmir', status: 'beklemede', weight: '24 ton', vehicleType: 'Çekici (TIR)', totalPrice: 31000, loadType: 'tam_yuk', pickupLat: 40.7, pickupLng: 29.9, pickupDate: '2026-06-03' },
    { id: 'demo-3', title: 'Gıda Kolileri — 12 Palet', fromCity: 'Mersin', toCity: 'Sivas', status: 'beklemede', weight: '12 ton', vehicleType: 'Frigorifik Araç', totalPrice: 18500, loadType: 'kismi_yuk', pickupLat: 36.8, pickupLng: 34.6, pickupDate: '2026-06-02' },
    { id: 'demo-4', title: 'Beyaz Eşya — 6 Adet', fromCity: 'İstanbul', toCity: 'Bursa', status: 'yolda', weight: '8 ton', vehicleType: 'Kamyon', totalPrice: 8500, loadType: 'evden_eve', pickupLat: 41.0, pickupLng: 28.9, pickupDate: '2026-05-28' },
    { id: 'demo-5', title: 'Elektronik Malzeme', fromCity: 'Ankara', toCity: 'Antalya', status: 'beklemede', weight: '5 ton', vehicleType: 'Panelvan', totalPrice: 12500, loadType: 'sehir_ici', pickupLat: 39.9, pickupLng: 32.8, pickupDate: '2026-06-05' },
  ];

  const fetchLoads = useCallback(async () => {
    try {
      const data = await loadService.getAll({ limit: 50 });
      const list = Array.isArray(data?.loads) ? data.loads : Array.isArray(data) ? data : [];
      setLoads(list.length > 0 ? list : DEMO_LOADS);
    } catch { setLoads(DEMO_LOADS); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    // Profil dogrulama kontrolu — super admin her zaman yetkili
    const role = require('../../store/authStore').useAuthStore.getState().user?.role;
    if (role === 'super_admin') {
      setProfileVerified(true);
      return;
    }
    apiClient.get('/users/profile/status').then(r => {
      const d = r.data?.data || r.data;
      setProfileVerified(d?.canAccessLoads === true);
    }).catch(() => setProfileVerified(true));
  }, []);

  useEffect(() => {
    fetchLoads();
    getCurrentLocation().then((loc) => setUserLocation({ lat: loc.latitude, lng: loc.longitude })).catch(() => {}).finally(() => setLocating(false));
  }, []);

  // Profil onaylanmamissa tam ekran yonlendirme karti goster (super admin haric)
  if (profileVerified === false) {
    return <ProfileRequiredScreen />;
  }

  // Yakından uzağa sırala
  const sorted = [...loads].sort((a, b) => {
    if (!userLocation) return 0;
    const distA = a.pickupLat ? calculateDistance(userLocation.lat, userLocation.lng, a.pickupLat, a.pickupLng || 0) : 9999;
    const distB = b.pickupLat ? calculateDistance(userLocation.lat, userLocation.lng, b.pickupLat, b.pickupLng || 0) : 9999;
    return distA - distB;
  });

  const filtered = search ? sorted.filter((l: any) =>
    `${l.fromCity} ${l.toCity} ${l.title} ${l.loadType}`.toLowerCase().includes(search.toLowerCase())
  ) : sorted;

  const getDistance = (load: any) => {
    if (!userLocation || !load.pickupLat) return null;
    return calculateDistance(userLocation.lat, userLocation.lng, load.pickupLat, load.pickupLng || 0);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoads(); }} tintColor={colors.primary} />}
    >
      {/* Konum durumu */}
      {locating ? (
        <View style={[styles.locationBar, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={[typography.caption, { color: colors.warning, marginLeft: spacing.sm }]}>Konum alınıyor...</Text>
        </View>
      ) : userLocation && (
        <View style={[styles.locationBar, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
          <Text style={[typography.caption, { color: colors.success }]}>📍 Yakınınızdaki yükler listeleniyor</Text>
        </View>
      )}

      {/* Arama */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.sm }}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Şehir, yük tipi ara..."
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={fetchLoads}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Yük Listesi */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : filtered.length === 0 ? (
        <View style={{ paddingVertical: spacing['3xl'], alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📦</Text>
          <Text style={[typography.body, { color: colors.textTertiary }]}>Uygun yük bulunamadı.</Text>
        </View>
      ) : (
        filtered.map((load: any) => (
          <LoadCard
            key={load.loadId || load.id}
            load={load}
            onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: load.loadId || load.id })}
            showDistance
            distance={getDistance(load)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locationBar: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.sm, marginBottom: spacing.sm },
  searchInput: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, fontSize: 15, minHeight: 48 },
  searchBtn: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  loadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
});
