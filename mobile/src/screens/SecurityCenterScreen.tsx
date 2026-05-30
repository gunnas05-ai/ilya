import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { usePermission } from '../hooks/usePermission';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';
import { hapticMedium } from '../utils/haptic';
import { showToast } from '../utils/toast';
import Card from '../components/shared/Card';
import ErrorState from '../components/shared/ErrorState';
import ListSkeleton from '../components/shared/ListSkeleton';
import { spacing, radius, typography } from '../theme';

export default function SecurityCenterScreen() {
  const { colors } = useTheme();
  const { can } = usePermission();
  const { user } = useAuthStore();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, secRes, healthRes] = await Promise.all([
        apiClient.get('/admin/security/audit-logs?limit=20'),
        apiClient.get('/admin/security/security-events?limit=20'),
        apiClient.get('/admin/tests/health'),
      ]);
      setAuditLogs(logRes.data?.logs || []);
      setSecurityEvents(secRes.data?.events || []);
      setHealth(healthRes.data?.data || healthRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleBackup = async () => {
    hapticMedium();
    try {
      const res = await apiClient.post('/admin/security/backup');
      if (res.data?.success) {
        showToast(`Yedek alindi: ${res.data.data.path}`, 'success');
      } else {
        showToast(res.data?.message || 'Yedekleme basarisiz', 'error');
      }
    } catch { showToast('Yedekleme basarisiz', 'error'); }
  };

  if (!can('admin:view_panel')) {
    return <ErrorState message="Bu sayfayı görüntülemek için admin yetkisi gerekiyor." />;
  }

  const criticalEvents = securityEvents.filter((e: any) =>
    e.eventType === 'suspicious_activity' || e.eventType === 'privilege_escalation_attempt',
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>🛡️ Güvenlik Merkezi</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Sistem güvenliği, olay takibi ve denetim</Text>

      {loading ? <ListSkeleton count={3} /> : (
        <>
          {/* Hızlı Durum */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <Card accentColor={criticalEvents.length > 0 ? colors.danger : colors.success} style={{ flex: 1 }}>
              <Text style={[typography.h2, { color: criticalEvents.length > 0 ? colors.danger : colors.success, fontWeight: '800', textAlign: 'center' }]}>{criticalEvents.length}</Text>
              <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center' }]}>Kritik Olay</Text>
            </Card>
            <Card accentColor={colors.primary} style={{ flex: 1 }}>
              <Text style={[typography.h2, { color: colors.primary, fontWeight: '800', textAlign: 'center' }]}>{auditLogs.length}</Text>
              <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center' }]}>Islem Logu</Text>
            </Card>
            <Card accentColor={colors.warning} style={{ flex: 1 }}>
              <Text style={[typography.h2, { color: colors.warning, fontWeight: '800', textAlign: 'center' }]}>{securityEvents.length}</Text>
              <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center' }]}>Guvenlik</Text>
            </Card>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.warning }]} onPress={handleBackup}>
              <Text style={s.btnText}>💾 Yedek Al</Text>
            </TouchableOpacity>
          </View>

          {/* System Health */}
          {health && Object.keys(health).length > 0 && (
            <Card accentColor={colors.success} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>💚 Sistem Sağlığı</Text>
              {Object.entries(health).map(([svc, h]: [string, any]) => (
                <View key={svc} style={s.healthRow}>
                  <Text style={[typography.body, { color: colors.text }]}>{svc === 'api' ? 'API Sunucu' : svc === 'database' ? 'Veritabanı' : svc === 'redis' ? 'Redis' : svc === 'ws' ? 'WebSocket' : svc === 'payment' ? 'Ödeme' : svc}</Text>
                  <View style={[s.dot, { backgroundColor: h.status === 'healthy' ? '#10B981' : h.status === 'degraded' ? '#F59E0B' : '#EF4444' }]} />
                  <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.xs }]}>{h.responseTimeMs}ms</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Son Güvenlik Olayları */}
          {securityEvents.length > 0 && (
            <>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm }]}>🔒 Son Güvenlik Olayları</Text>
              {securityEvents.slice(0, 10).map((e: any) => (
                <Card key={e.id} accentColor={e.eventType.includes('suspicious') ? colors.danger : colors.warning} style={{ marginBottom: spacing.sm }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{e.description}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>IP: {e.ipAddress || '—'}</Text>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>{new Date(e.createdAt).toLocaleString('tr-TR')}</Text>
                  </View>
                </Card>
              ))}
            </>
          )}

          {/* Son Admin İşlemleri */}
          {auditLogs.length > 0 && (
            <>
              <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md }]}>📋 Son Admin İşlemleri</Text>
              {auditLogs.slice(0, 10).map((log: any) => (
                <View key={log.id} style={[s.logItem, { borderBottomColor: colors.border }]}>
                  <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>{log.description}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[typography.small, { color: colors.primary }]}>{log.adminEmail}</Text>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>{new Date(log.createdAt).toLocaleTimeString('tr-TR')}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  healthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  logItem: { paddingVertical: spacing.sm, borderBottomWidth: 1 },
});
