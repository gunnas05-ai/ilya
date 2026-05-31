import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../navigation/types';
import { spacing, radius, typography } from '../theme';
import { useRecentLoads } from '../hooks/query';
import { announcementService } from '../services/announcementService';
import { apiClient } from '../services/api';
import Card from '../components/shared/Card';
import ListSkeleton from '../components/shared/ListSkeleton';
import EmptyState from '../components/shared/EmptyState';
import ErrorState from '../components/shared/ErrorState';
import { ProfileStatusBanner } from '../components/ProfileStatusBanner';
import LoadCard from '../components/LoadCard';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

const MODULE_ITEMS = [
  { label: 'Yakıt\nİstasyonu', icon: '⛽', screen: 'FuelStations' as const },
  { label: 'Lokantalar', icon: '🍽️', screen: 'Restaurants' as const },
  { label: 'Araç Al/Sat', icon: '🚗', screen: 'ListingsBrowse' as const },
  { label: 'İkinci El', icon: '🔧', screen: 'PartMarketHome' as const },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isGuest, logout, user } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState(true);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<any>(null);

  const recentQuery = useRecentLoads();
  const loading = recentQuery.isLoading;

  useFocusEffect(React.useCallback(() => {
    announcementService.getLatest().then(d => setAnnouncement(d?.content || null)).catch((e) => console.warn('Duyuru yuklenemedi:', e?.message));
    apiClient.get('/users/profile/status').then(r => setProfileStatus(r?.data?.data || r?.data || null)).catch((e) => console.warn('Profil durumu alinamadi:', e?.message));
  }, []));

  const recentLoads = Array.isArray(recentQuery.data) ? recentQuery.data : [];
  const isError = recentQuery.isError;
  const onRetry = () => { recentQuery.refetch(); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={
        <RefreshControl
          refreshing={recentQuery.isRefetching}
          onRefresh={() => { recentQuery.refetch(); }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        <Text style={[typography.display, { color: colors.text, fontWeight: '900', letterSpacing: 2, fontSize: 32 }]}>{t('home.title')}</Text>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 1, marginTop: 4 }]}>{t('home.subtitle')}</Text>
      </View>

      <ProfileStatusBanner status={profileStatus} />

      {isGuest && (
        <View style={{ marginBottom: spacing.md }}>
          <TouchableOpacity style={[s.guestChip, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => logout()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Üye Ol">
            <Text style={[typography.small, { color: '#fff', fontWeight: '700' }]}>{t('home.join')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isError ? (
        <ErrorState message={t('home.loadError')} onRetry={onRetry} />
      ) : loading ? (
        <ListSkeleton count={3} />
      ) : (
        <>
          <Card accentColor={isAvailable ? colors.primary : colors.textTertiary} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '800' }]}>{t('home.availability')}</Text>
                <Text style={[typography.caption, { color: isAvailable ? colors.primary : colors.textSecondary, fontWeight: '600', marginTop: 2 }]}>
                  {isAvailable ? t('home.active') : t('home.inactive')}
                </Text>
              </View>
              <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={isAvailable ? '#FFFFFF' : '#9CA3AF'} accessibilityRole="switch" accessibilityLabel="Müsaitlik durumu" accessibilityState={{ checked: isAvailable }} />
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
