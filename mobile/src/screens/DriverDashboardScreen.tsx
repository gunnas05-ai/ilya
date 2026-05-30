import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { useDrivingTimer } from '../hooks/useDrivingTimer';
import { useRecentLoads, useRecommendedLoads } from '../hooks/query';
import { apiClient } from '../services/api';
import { hapticMedium, hapticLight } from '../utils/haptic';
import { showToast } from '../utils/toast';
import Card from '../components/shared/Card';
import ListSkeleton from '../components/shared/ListSkeleton';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import { spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatTL(val: number) { return `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`; }

function ProgressBar({ progress, color, bgColor }: { progress: number; color: string; bgColor: string }) {
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: bgColor, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ height: '100%', width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color, borderRadius: 5 }} />
    </View>
  );
}

export default function DriverDashboardScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const timer = useDrivingTimer();
  const [earnings, setEarnings] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const recentQuery = useRecentLoads();
  const aiQuery = useRecommendedLoads(user?.role);

  React.useEffect(() => {
    apiClient.get('/finance/dashboard?period=today').then(r => {
      setEarnings(r.data?.data || r.data);
    }).catch(() => {}).finally(() => setEarningsLoading(false));
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    recentQuery.refetch();
    aiQuery.refetch();
    apiClient.get('/finance/dashboard?period=today').then(r => {
      setEarnings(r.data?.data || r.data);
    }).catch(() => {}).finally(() => setRefreshing(false));
  };

  const isDriving = timer.isDriving;
  const sessionWarning = timer.currentSessionSeconds >= timer.sessionLimitSeconds - 1800;
  const dailyWarning = timer.totalDrivingSeconds >= timer.dailyLimitSeconds - 3600;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg }]}>🚛 Sürücü Paneli</Text>

      {/* AETR Timer Card */}
      <Card accentColor={isDriving ? '#3B82F6' : sessionWarning ? '#F59E0B' : dailyWarning ? '#EF4444' : colors.primary} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>⏱️ AETR Sürüş Sayacı</Text>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Bu Oturum</Text>
            <Text style={[typography.h2, { color: sessionWarning ? '#F59E0B' : colors.primary, fontWeight: '800' }]}>{timer.sessionDisplay}</Text>
            <Text style={[typography.small, { color: colors.textTertiary }]}>/ {timer.sessionMaxDisplay} limit</Text>
            <ProgressBar progress={timer.sessionProgress} color={sessionWarning ? '#F59E0B' : colors.primary} bgColor={colors.border} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Bugün Toplam</Text>
            <Text style={[typography.h2, { color: dailyWarning ? '#EF4444' : colors.text, fontWeight: '800' }]}>{timer.dailyDisplay}</Text>
            <Text style={[typography.small, { color: colors.textTertiary }]}>/ {timer.dailyMaxDisplay} limit</Text>
            <ProgressBar progress={timer.dailyProgress} color={dailyWarning ? '#EF4444' : colors.warning} bgColor={colors.border} />
          </View>
        </View>

        {/* Uyarılar */}
        {timer.warnings.length > 0 && (
          <View style={{ backgroundColor: timer.warnings[0]?.includes('🔴') ? '#EF4444' + '15' : '#F59E0B' + '15', padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm }}>
            {timer.warnings.map((w, i) => (
              <Text key={i} style={[typography.small, { color: timer.warnings[0]?.includes('🔴') ? '#EF4444' : '#F59E0B', fontWeight: '700', marginBottom: i < timer.warnings.length - 1 ? 4 : 0 }]}>{w}</Text>
            ))}
          </View>
        )}

        {/* Kontroller */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {!isDriving ? (
            <TouchableOpacity style={[s.btn, { backgroundColor: '#3B82F6' }]} onPress={() => { hapticMedium(); timer.startDriving(); showToast('Sürüş başladı. İyi yollar! 🚛', 'info'); }}>
              <Text style={s.btnText}>▶ Sürüşe Başla</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.btn, { backgroundColor: '#F59E0B' }]} onPress={() => { hapticMedium(); timer.stopDriving(); showToast('Mola verildi. Dinlenmeyi unutmayın.', 'warning'); }}>
              <Text style={s.btnText}>⏸ Mola Ver</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.success }]} onPress={() => { hapticMedium(); timer.takeBreak(); showToast('Oturum sıfırlandı, iyi molalar!', 'success'); }}>
            <Text style={s.btnText}>🔄 Sıfırla</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Günlük Kazanç */}
      {earningsLoading ? (
        <ListSkeleton count={1} />
      ) : earnings ? (
        <Card accentColor={colors.success} style={{ marginBottom: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>💰 Bugünkü Kazanç</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1, backgroundColor: colors.success + '15', padding: spacing.md, borderRadius: radius.md, alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.success, fontWeight: '800' }]}>{formatTL(earnings?.netProfit || 0)}</Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>Net Kar</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.primary + '15', padding: spacing.md, borderRadius: radius.md, alignItems: 'center' }}>
              <Text style={[typography.h2, { color: colors.primary, fontWeight: '800' }]}>{formatTL(earnings?.totalIncome || 0)}</Text>
              <Text style={[typography.small, { color: colors.textSecondary }]}>Brüt Gelir</Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* AI Önerileri */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>🤖 Sana Özel Yükler</Text>
      {aiQuery.isLoading ? (
        <ListSkeleton count={2} />
      ) : aiQuery.isError ? (
        <ErrorState message="Öneriler yüklenemedi." onRetry={() => aiQuery.refetch()} />
      ) : !aiQuery.data || (Array.isArray(aiQuery.data) && aiQuery.data.length === 0) ? (
        <EmptyState emoji="📦" message="Henüz önerilen yük bulunmuyor." />
      ) : (
        (Array.isArray(aiQuery.data) ? aiQuery.data : []).slice(0, 3).map((item: any, i: number) => (
          <TouchableOpacity key={i} style={[s.loadCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('LoadAcceptDetail', { loadId: item.load?.id || item.id })} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{item.load?.title || item.title}</Text>
                <Text style={[typography.small, { color: colors.textSecondary }]}>📍 {item.load?.fromCity || item.fromCity} → {item.load?.toCity || item.toCity}</Text>
              </View>
              <Text style={[typography.h3, { color: colors.primary, fontWeight: '800' }]}>{formatTL(item.load?.totalPrice || item.totalPrice || 0)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Hızlı İşlemler */}
      <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.lg }]}>⚡ Hızlı İşlemler</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {[
          { label: 'Yük Ara', icon: '🔍', screen: 'LoadAccept' as const },
          { label: 'Yakıt', icon: '⛽', screen: 'FuelStations' as const },
          { label: 'Lokanta', icon: '🍽️', screen: 'Restaurants' as const },
          { label: 'Cüzdan', icon: '💰', screen: 'Wallet' as const },
        ].map(item => (
          <TouchableOpacity key={item.screen} style={[s.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { hapticLight(); navigation.navigate(item.screen as any); }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</Text>
            <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  loadCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  quickBtn: { width: '22%', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
});
