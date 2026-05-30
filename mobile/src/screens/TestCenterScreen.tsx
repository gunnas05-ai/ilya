import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { usePermission } from '../hooks/usePermission';
import { apiClient } from '../services/api';
import { hapticMedium } from '../utils/haptic';
import { showToast } from '../utils/toast';
import Card from '../components/shared/Card';
import ListSkeleton from '../components/shared/ListSkeleton';
import ErrorState from '../components/shared/ErrorState';
import { spacing, radius, typography } from '../theme';

export default function TestCenterScreen() {
  const { colors } = useTheme();
  const { can } = usePermission();
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes, runsRes] = await Promise.all([
        apiClient.get('/admin/tests/stats').catch(() => ({ data: null })),
        apiClient.get('/admin/tests/health').catch(() => ({ data: null })),
        apiClient.get('/admin/tests/runs').catch(() => ({ data: { data: [] } })),
      ]);
      setStats(statsRes.data || statsRes);
      setHealth(healthRes.data?.data || healthRes.data);
      setRuns(runsRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleRunAll = async () => {
    hapticMedium();
    setRunning(true);
    try {
      const res = await apiClient.post('/admin/tests/run/all');
      showToast('Testler başlatıldı!', 'info');
      setTimeout(fetchData, 3000);
    } catch { showToast('Test başlatılamadı', 'error'); }
    finally { setRunning(false); }
  };

  const handleHealthCheck = async () => {
    hapticMedium();
    try {
      await apiClient.post('/admin/tests/health/check');
      showToast('Sağlık kontrolü tamamlandı', 'success');
      setTimeout(fetchData, 2000);
    } catch { showToast('Kontrol başarısız', 'error'); }
  };

  if (!can('admin:view_panel')) {
    return <ErrorState message="Bu sayfayı görüntülemek için admin yetkisi gerekiyor." />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>🧪 QA Test Center</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Test ve sistem sağlığı izleme merkezi</Text>

      {loading ? <ListSkeleton count={3} /> : (
        <>
          {/* Test Stats */}
          <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>📊 Test İstatistikleri</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={[s.kpi, { backgroundColor: colors.success + '15' }]}>
                <Text style={[typography.h2, { color: colors.success, fontWeight: '800' }]}>{stats?.passRate ?? '--'}%</Text>
                <Text style={[typography.small, { color: colors.textSecondary }]}>Başarı</Text>
              </View>
              <View style={[s.kpi, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[typography.h2, { color: colors.primary, fontWeight: '800' }]}>{stats?.totalRuns ?? 0}</Text>
                <Text style={[typography.small, { color: colors.textSecondary }]}>Toplam Koşum</Text>
              </View>
            </View>
          </Card>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={handleRunAll} disabled={running}>
              {running ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>▶ Tüm Testleri Çalıştır</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.warning }]} onPress={handleHealthCheck}>
              <Text style={s.btnText}>🏥 Sağlık Kontrolü</Text>
            </TouchableOpacity>
          </View>

          {/* System Health */}
          {health && Object.keys(health).length > 0 && (
            <Card accentColor={colors.success} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>💚 Sistem Sağlığı</Text>
              {Object.entries(health).map(([svc, h]: [string, any]) => (
                <View key={svc} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={[typography.body, { color: colors.text }]}>{svc.toUpperCase()}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <View style={[s.dot, { backgroundColor: h.status === 'healthy' ? '#10B981' : h.status === 'degraded' ? '#F59E0B' : '#EF4444' }]} />
                    <Text style={[typography.small, { color: colors.textSecondary }]}>{h.responseTimeMs}ms</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Test Runs History */}
          {runs.length > 0 && (
            <>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>📋 Son Test Koşumları</Text>
              {runs.slice(0, 10).map((run: any) => (
                <Card key={run.id} accentColor={run.status === 'passed' ? colors.success : colors.danger} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{run.name?.substring(0, 40)}</Text>
                      <Text style={[typography.small, { color: colors.textSecondary }]}>
                        {run.passedTests}/{run.totalTests} geçti • {run.durationSeconds?.toFixed(1)}s
                      </Text>
                    </View>
                    <Text style={[typography.h3, { color: run.status === 'passed' ? colors.success : colors.danger }]}>
                      {run.status === 'passed' ? '✅' : '❌'}
                    </Text>
                  </View>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kpi: { flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
