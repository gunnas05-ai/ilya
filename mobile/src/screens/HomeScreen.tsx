import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../navigation/types';
import { spacing, radius, typography } from '../theme';
import { useRecentLoads, useRecommendedLoads } from '../hooks/query';
import { announcementService } from '../services/announcementService';
import { apiClient } from '../services/api';
import { hapticLight } from '../utils/haptic';
import { showToast } from '../utils/toast';
import Card from '../components/shared/Card';
import ListSkeleton from '../components/shared/ListSkeleton';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/shared/ErrorState';
import { ProfileStatusBanner } from '../components/ProfileStatusBanner';
import LoadCard from '../components/LoadCard';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_ITEMS = [
  { label: 'Yüklemedeyim', icon: '📦', status: 'loading', color: '#F59E0B' },
  { label: 'Yoldayım', icon: '🚛', status: 'in_transit', color: '#3B82F6' },
  { label: 'Teslim Ettim', icon: '✅', status: 'delivered', color: '#10B981' },
];

const MODULE_ITEMS = [
  { label: 'Yakıt\nİstasyonu', icon: '⛽', screen: 'FuelStations' as const },
  { label: 'Lokantalar', icon: '🍽️', screen: 'Restaurants' as const },
  { label: 'Araç Al/Sat', icon: '🚗', screen: 'ListingsBrowse' as const },
  { label: 'İkinci El', icon: '🔧', screen: 'PartMarketHome' as const },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { colors } = useTheme();
  const { isGuest, logout, user } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState(true);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<any>(null);

  const recentQuery = useRecentLoads();
  const rankedQuery = useRecommendedLoads(user?.role);

  const loading = recentQuery.isLoading;

  useFocusEffect(React.useCallback(() => {
    announcementService.getLatest().then(d => setAnnouncement(d?.content || null)).catch(() => {});
    apiClient.get('/users/profile/status').then(r => setProfileStatus(r?.data?.data || r?.data || null)).catch(() => {});
  }, []));

  const handleStatusUpdate = (label: string, status: string) => {
    hapticLight();
    apiClient.post('/tracking/update-status', { status })
      .then(() => showToast('Durum güncellendi', 'success'))
      .catch(() => showToast('Durum kaydedildi (çevrimdışı)', 'info'));
  };

  const recentLoads = Array.isArray(recentQuery.data) ? recentQuery.data : [];
  const rankedLoads = Array.isArray(rankedQuery.data) ? rankedQuery.data : [];

  const isError = recentQuery.isError || rankedQuery.isError;
  const onRetry = () => { recentQuery.refetch(); rankedQuery.refetch(); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={
        <RefreshControl
          refreshing={recentQuery.isRefetching || rankedQuery.isRefetching}
          onRefresh={() => { recentQuery.refetch(); rankedQuery.refetch(); }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        <Text style={[typography.display, { color: colors.text, fontWeight: '900', letterSpacing: 2, fontSize: 32 }]}>KAPTAN</Text>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 1, marginTop: 4 }]}>AKILLI LOJİSTİK PORTALI</Text>
      </View>

      <ProfileStatusBanner status={profileStatus} />

      {isGuest && (
        <View style={{ marginBottom: spacing.md }}>
          <TouchableOpacity style={[s.guestChip, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => logout()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Üye Ol">
            <Text style={[typography.small, { color: '#fff', fontWeight: '700' }]}>Üye Ol</Text>
          </TouchableOpacity>
        </View>
      )}

      {isError ? (
        <ErrorState message="Veriler yüklenirken bir hata oluştu." onRetry={onRetry} />
      ) : loading ? (
        <ListSkeleton count={3} />
      ) : (
        <>
          <Card accentColor={isAvailable ? colors.primary : colors.textTertiary} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '800' }]}>Müsaitlik Durumu</Text>
                <Text style={[typography.caption, { color: isAvailable ? colors.primary : colors.textSecondary, fontWeight: '600', marginTop: 2 }]}>
                  {isAvailable ? '🟢 Aktif' : '⚫ Kapalı'}
                </Text>
              </View>
              <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={isAvailable ? '#FFFFFF' : '#9CA3AF'} accessibilityRole="switch" accessibilityLabel="Müsaitlik durumu" accessibilityState={{ checked: isAvailable }} />
            </View>
          </Card>

          <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
            <Text style={[typography.label, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>🚛 Sevkiyat Durumu</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {STATUS_ITEMS.map((item) => (
                <TouchableOpacity key={item.status} style={{ flex: 1, backgroundColor: item.color + '15', borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1.5, borderColor: item.color + '40' }} onPress={() => handleStatusUpdate(item.label, item.status)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={item.label}>
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  <Text style={[typography.small, { color: item.color, fontWeight: '700', marginTop: 4, textAlign: 'center', fontSize: 10 }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {MODULE_ITEMS.map((item) => (
              <TouchableOpacity key={item.screen} style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border }} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={item.label.replace('\n', ' ')}>
                <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                <Text style={[typography.small, { color: colors.text, fontWeight: '700', textAlign: 'center', marginTop: 4, fontSize: 11 }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {announcement && (
            <Card accentColor="#EAB308" style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: '#FACC15', fontWeight: '900', marginBottom: 6 }]}>📢 DUYURULAR:</Text>
              <Text style={[typography.caption, { color: colors.text, fontWeight: '500', lineHeight: 18 }]}>{announcement}</Text>
            </Card>
          )}

          {rankedLoads.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '800', flex: 1 }]}>🎯 Senin İçin</Text>
                <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>AI</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
                {rankedLoads.slice(0, 5).map((item: any) => (
                  <TouchableOpacity key={item.load?.id || item.id} style={{ width: 260, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginRight: spacing.md, borderWidth: 1, borderColor: colors.border }} onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: item.load?.id || item.id })} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${item.load?.title || item.title}, ${item.load?.fromCity || item.fromCity} to ${item.load?.toCity || item.toCity}`}>
                    <Text style={[typography.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.load?.title || item.title}</Text>
                    <Text style={[typography.small, { color: colors.textSecondary, marginTop: 4 }]}>📍 {item.load?.fromCity || item.fromCity} → {item.load?.toCity || item.toCity}</Text>
                    <Text style={[typography.price, { fontSize: 16, marginTop: 4 }]}>{Number(item.load?.totalPrice || item.price || 0).toLocaleString('tr-TR')} ₺</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>Son Yüklenen Yükler</Text>
          {recentLoads.length === 0 ? (
            <EmptyState message="Henüz yük kaydı bulunmamaktadır." />
          ) : (
            recentLoads.slice(0, 5).map((load: any) => (
              <LoadCard key={load.id} load={load} onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: load.id })} />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  guestChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill,
    borderWidth: 1, minHeight: 36, justifyContent: 'center', alignItems: 'center',
  },
});
