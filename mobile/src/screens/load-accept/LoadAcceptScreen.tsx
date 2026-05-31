import { useEffect, useState, useCallback, useRef } from 'react';
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

const PAGE_SIZE = 10;

export default function LoadAcceptScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [profileVerified, setProfileVerified] = useState<boolean | null>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [aiLoads, setAiLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  };

  const fetchLoads = useCallback(async () => {
    try {
      setError(null);
      const [data, aiData] = await Promise.all([
        loadService.getAll({ page: 1, limit: 50, sortBy: 'pickupDate', sortOrder: 'DESC' }),
        loadService.getRecommended().catch(() => null),
      ]);
      let list = Array.isArray(data?.loads) ? data.loads : Array.isArray(data) ? data : [];
      // Tarihe gore sirala (yeni→eski)
      list.sort((a: any, b: any) => new Date(b.pickupDate || 0).getTime() - new Date(a.pickupDate || 0).getTime());
      setLoads(list);
      if (aiData) {
        const ai = Array.isArray(aiData) ? aiData.slice(0, 3) : [];
        setAiLoads(ai);
      }
    } catch (e) {
      handleError(e, { screen: 'LoadAcceptScreen', action: 'fetchLoads' });
      setError('Yükler yüklenirken bir hata oluştu.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  // Pagination
  const totalPages = Math.ceil(loads.length / PAGE_SIZE);
  const pagedLoads = loads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    const role = useAuthStore.getState().user?.role;
    if (role === 'super_admin') {
      setProfileVerified(true);
      return;
    }
    apiClient.get('/users/profile/status').then(r => {
      const d = r.data?.data || r.data;
      setProfileVerified(d?.canAccessLoads === true);
    }).catch((e) => { console.warn('Profil durumu kontrol edilemedi:', e?.message); setProfileVerified(null); });
  }, []);

  useEffect(() => {
    fetchLoads();
    getCurrentLocation().then((loc) => setUserLocation({ lat: loc.latitude, lng: loc.longitude })).catch((e) => console.warn('Konum alinamadi:', e?.message)).finally(() => setLocating(false));
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

  const filtered = debouncedSearch ? sorted.filter((l: any) =>
    `${l.fromCity} ${l.toCity} ${l.title} ${l.loadType}`.toLowerCase().includes(debouncedSearch.toLowerCase())
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
          onChangeText={handleSearchChange}
          placeholder="Şehir, yük tipi ara..."
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={fetchLoads}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* AI Onerilen Yukler (sadece arama yapilmadiginda) */}
      {!loading && !error && !search && aiLoads.length > 0 && (
        <>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>🤖 Sana Özel Yükler</Text>
          {aiLoads.map((item: any) => (
            <LoadCard
              key={item.load?.id || item.id || 'ai'}
              load={item.load || item}
              onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: item.load?.id || item.id })}
              showDistance
              distance={getDistance(item.load || item)}
            />
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
        </>
      )}

      {/* Yük Listesi */}
      {loading && !error ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLoads} />
      ) : filtered.length === 0 ? (
        <EmptyState emoji="📦" message="Uygun yük bulunamadı." />
      ) : (
        <>
          {pagedLoads.map((load: any) => (
            <LoadCard
              key={load.loadId || load.id}
              load={load}
              onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: load.loadId || load.id })}
              showDistance
              distance={getDistance(load)}
            />
          ))}
          {/* Pagination */}
          {totalPages > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, paddingBottom: spacing.xl }}>
              <TouchableOpacity style={[styles.pgBtn, { borderColor: colors.primary, opacity: page <= 0 ? 0.4 : 1 }]} onPress={() => setPage(p => Math.max(0, p - 1))} disabled={page <= 0}>
                <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>{'< Geri'}</Text>
              </TouchableOpacity>
              <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{page + 1} / {totalPages}</Text>
              <TouchableOpacity style={[styles.pgBtn, { borderColor: colors.primary, opacity: page >= totalPages - 1 ? 0.4 : 1 }]} onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>{'İleri >'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  pgBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
});
