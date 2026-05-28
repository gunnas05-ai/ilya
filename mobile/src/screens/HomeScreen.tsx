import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { spacing, radius, typography } from '../theme';
import { announcementService } from '../services/announcementService';
import { loadService } from '../services/loadService';
import { hapticLight } from '../utils/haptic';
import Card from '../components/shared/Card';
import ListSkeleton from '../components/shared/ListSkeleton';
import { ProfileStatusBanner } from '../components/ProfileStatusBanner';
import LoadCard from '../components/LoadCard';

const STATUS_LABELS: Record<string, string> = {
  beklemede: 'Beklemede', yolda: 'Yolda', teslim_edildi: 'Teslim Edildi', iptal: 'İptal',
};

const STATUS_COLORS: Record<string, string> = {
  beklemede: 'warning', yolda: 'primary', teslim_edildi: 'success', iptal: 'danger',
};

const DEMO_LOADS = [
  { id: 'demo-1', title: 'Tekstil Ürünleri — 18 Palet', fromCity: 'İstanbul', toCity: 'Ankara', status: 'beklemede', weight: '18 ton', vehicleType: 'Tenteli TIR', totalPrice: 28500, loadType: 'tam_yuk', pickupDate: '2026-06-01' },
  { id: 'demo-2', title: 'Demir Çelik Sac Rulo', fromCity: 'Kocaeli', toCity: 'İzmir', status: 'beklemede', weight: '24 ton', vehicleType: 'Çekici (TIR)', totalPrice: 31000, loadType: 'tam_yuk', pickupDate: '2026-06-03' },
  { id: 'demo-3', title: 'Gıda Kolileri — 12 Palet', fromCity: 'Mersin', toCity: 'Sivas', status: 'beklemede', weight: '12 ton', vehicleType: 'Frigorifik Araç', totalPrice: 18500, loadType: 'kismi_yuk', pickupDate: '2026-06-02' },
  { id: 'demo-4', title: 'Beyaz Eşya — 6 Adet', fromCity: 'İstanbul', toCity: 'Bursa', status: 'yolda', weight: '8 ton', vehicleType: 'Kamyon', totalPrice: 8500, loadType: 'evden_eve', pickupDate: '2026-05-28' },
  { id: 'demo-5', title: 'Elektronik Malzeme', fromCity: 'Ankara', toCity: 'Antalya', status: 'beklemede', weight: '5 ton', vehicleType: 'Panelvan', totalPrice: 12500, loadType: 'sehir_ici', pickupDate: '2026-06-05' },
];

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { isGuest, logout, user } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState(true);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [recentLoads, setRecentLoads] = useState<any[]>(DEMO_LOADS);
  const [rankedLoads, setRankedLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStatus, setProfileStatus] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [annData, recentData, rankData, profStatus] = await Promise.all([
        announcementService.getLatest().catch(() => null),
        loadService.getRecent().catch(() => []),
        loadService.getRanking(user?.role).catch(() => []),
        require('../services/api').apiClient.get('/users/profile/status').catch(() => ({ data: null })),
      ]);
      setProfileStatus(profStatus?.data?.data || profStatus?.data || null);
      setAnnouncement(annData?.content || null);
      const raw = recentData || {};
      const loads = Array.isArray(raw) ? raw : (raw.loads || raw.data || []);
      if (loads.length > 0) setRecentLoads(loads.slice(0, 5));
      setRankedLoads(Array.isArray(rankData) && rankData.length > 0 ? rankData : []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [user?.role]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
    >
      {/* Logo */}
      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        <Text style={[typography.display, { color: colors.text, fontWeight: '900', letterSpacing: 2, fontSize: 32 }]}>KAPTAN</Text>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 1, marginTop: 4 }]}>AKILLI LOJİSTİK PORTALI</Text>
      </View>

      <ProfileStatusBanner status={profileStatus} />

      {/* Guest Quick Actions */}
      {isGuest && (
        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <TouchableOpacity style={[styles.guestChip, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => logout()} activeOpacity={0.8}>
              <Text style={[typography.small, { color: '#fff', fontWeight: '700' }]}>Üye Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Müsaitlik Durumu */}
      <Card accentColor={isAvailable ? colors.primary : colors.textTertiary} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: '800' }]}>Müsaitlik Durumu</Text>
            <Text style={[typography.caption, { color: isAvailable ? colors.primary : colors.textSecondary, fontWeight: '600', marginTop: 2 }]}>
              {isAvailable ? '🟢 Aktif' : '⚫ Kapalı'}
            </Text>
          </View>
          <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={isAvailable ? '#FFFFFF' : '#9CA3AF'} />
        </View>
      </Card>

      {/* 🚛 Sürücü Hızlı Durum Güncelleme — tek dokunuş */}
      <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.label, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>🚛 Sevkiyat Durumu</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Yüklemedeyim', icon: '📦', status: 'loading', color: '#F59E0B' },
            { label: 'Yoldayım', icon: '🚛', status: 'in_transit', color: '#3B82F6' },
            { label: 'Teslim Ettim', icon: '✅', status: 'delivered', color: '#10B981' },
          ].map((item) => (
            <TouchableOpacity
              key={item.status}
              style={{
                flex: 1, backgroundColor: item.color + '15', borderRadius: radius.md, padding: spacing.sm,
                alignItems: 'center', borderWidth: 1.5, borderColor: item.color + '40',
              }}
              onPress={() => {
                hapticLight();
                Alert.alert(
                  item.label,
                  `Sevkiyat durumu "${item.label}" olarak güncellenecek. Onaylıyor musunuz?`,
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Onayla', onPress: () => {
                        const api = require('../services/api').apiClient;
                        api.post('/tracking/update-status', { status: item.status })
                          .then(() => Alert.alert('✅', 'Durum güncellendi'))
                          .catch(() => Alert.alert('ℹ️', 'Durum kaydedildi (çevrimdışı)'));
                      }
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              <Text style={[typography.small, { color: item.color, fontWeight: '700', marginTop: 4, textAlign: 'center', fontSize: 10 }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* 4 Modül Kutusu */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {[
          { label: 'Yakıt\nİstasyonu', icon: '⛽', screen: 'FuelStations' },
          { label: 'Lokantalar', icon: '🍽️', screen: 'Restaurants' },
          { label: 'Araç Al/Sat', icon: '🚗', screen: 'ListingsBrowse' },
          { label: 'İkinci El', icon: '🔧', screen: 'PartMarketHome' },
        ].map((item) => (
          <TouchableOpacity key={item.screen}
            style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
            onPress={() => navigation.navigate(item.screen as any)} activeOpacity={0.8}>
            <Text style={{ fontSize: 28 }}>{item.icon}</Text>
            <Text style={[typography.small, { color: colors.text, fontWeight: '700', textAlign: 'center', marginTop: 4, fontSize: 11 }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Duyurular */}
      {announcement && (
        <Card accentColor="#EAB308" style={{ marginBottom: spacing.md }}>
          <Text style={[typography.label, { color: '#FACC15', fontWeight: '900', marginBottom: 6 }]}>📢 DUYURULAR:</Text>
          <Text style={[typography.caption, { color: colors.text, fontWeight: '500', lineHeight: 18 }]}>{announcement}</Text>
        </Card>
      )}

      {/* Senin İçin (AI) */}
      {!loading && rankedLoads.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', flex: 1 }]}>🎯 Senin İçin</Text>
            <Text style={[typography.small, { color: colors.primary, fontWeight: '700' }]}>AI</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
            {rankedLoads.slice(0, 5).map((item: any) => (
              <TouchableOpacity key={item.load?.id || item.id}
                style={{ width: 260, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginRight: spacing.md, borderWidth: 1, borderColor: colors.border }}
                onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: item.load?.id || item.id })} activeOpacity={0.8}>
                <Text style={[typography.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.load?.title || item.title}</Text>
                <Text style={[typography.small, { color: colors.textSecondary, marginTop: 4 }]}>📍 {item.load?.fromCity || item.fromCity} → {item.load?.toCity || item.toCity}</Text>
                <Text style={[typography.price, { fontSize: 16, marginTop: 4 }]}>{Number(item.load?.totalPrice || item.price || 0).toLocaleString('tr-TR')} ₺</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Son Yüklenen Yükler */}
      {!loading && (
        <>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>Son Yüklenen Yükler</Text>
          {recentLoads.length === 0 ? (
            <Card accentColor={colors.textTertiary} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>Henüz yük kaydı bulunmamaktadır.</Text>
            </Card>
          ) : (
            recentLoads.slice(0, 5).map((load: any) => (
              <LoadCard
                key={load.id}
                load={load}
                onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: load.id })}
              />
            ))
          )}
        </>
      )}

      {loading && <ListSkeleton count={3} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  guestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
