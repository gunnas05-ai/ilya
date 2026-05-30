import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import type { RootStackParamList } from '../../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
import { spacing, radius, typography } from '../../theme';
import { loadService } from '../../services/loadService';
import { calculateDistance } from '../../services/trackingService';
import { getCurrentLocation } from '../../services/locationService';
import { hapticLight } from '../../utils/haptic';
import { ProfileRequiredScreen } from '../../components/ProfileStatusBanner';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { handleError } from '../../services/errorService';
import ErrorState from '../../components/shared/ErrorState';
import EmptyState from '../../components/shared/EmptyState';
import ListSkeleton from '../../components/shared/ListSkeleton';
import LoadCard from '../../components/LoadCard';

const LOAD_TYPE_LABELS: Record<string, string> = { tam_yuk: 'Tam Yük', kismi_yuk: 'Kısmi', evden_eve: 'Evden Eve', sehir_ici: 'Şehir İçi' };

export default function LoadAcceptScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [profileVerified, setProfileVerified] = useState<boolean | null>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);

  const fetchLoads = useCallback(async () => {
    try {
      setError(null);
      const data = await loadService.getAll({ limit: 50 });
      const list = Array.isArray(data?.loads) ? data.loads : Array.isArray(data) ? data : [];
      setLoads(list);
    } catch (e) {
      handleError(e, { screen: 'LoadAcceptScreen', action: 'fetchLoads' });
      setError('Yükler yüklenirken bir hata oluştu.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const role = useAuthStore.getState().user?.role;
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
      {loading && !error ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLoads} />
      ) : filtered.length === 0 ? (
        <EmptyState emoji="📦" message="Uygun yük bulunamadı." />
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
