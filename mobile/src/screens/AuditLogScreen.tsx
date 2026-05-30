import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { usePermission } from '../hooks/usePermission';
import { apiClient } from '../services/api';
import { hapticLight } from '../utils/haptic';
import Card from '../components/shared/Card';
import ErrorState from '../components/shared/ErrorState';
import EmptyState from '../components/shared/EmptyState';
import { spacing, radius, typography } from '../theme';

const ACTION_LABELS: Record<string, { icon: string; color: string }> = {
  role_change: { icon: '🔄', color: '#3B82F6' },
  user_block: { icon: '🚫', color: '#EF4444' },
  user_unblock: { icon: '✅', color: '#10B981' },
  permission_update: { icon: '🔐', color: '#F59E0B' },
  backup_created: { icon: '💾', color: '#8B5CF6' },
};

export default function AuditLogScreen() {
  const { colors } = useTheme();
  const { can } = usePermission();
  const [logs, setLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'audit' | 'security'>('audit');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, secRes] = await Promise.all([
        apiClient.get('/admin/security/audit-logs?limit=50'),
        apiClient.get('/admin/security/security-events?limit=50'),
      ]);
      setLogs(logRes.data?.logs || logRes.data?.data || []);
      setEvents(secRes.data?.events || secRes.data?.data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  if (!can('admin:view_panel')) {
    return <ErrorState message="Bu sayfayı görüntülemek için admin yetkisi gerekiyor." />;
  }

  const data = tab === 'audit' ? logs : events;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', margin: spacing.md }}>
        {[
          { key: 'audit' as const, label: 'Admin Logları' },
          { key: 'security' as const, label: 'Güvenlik Olayları' },
        ].map((t) => (
          <TouchableOpacity key={t.key} style={[s.tab, { backgroundColor: tab === t.key ? colors.primary : colors.card, borderColor: colors.border }]} onPress={() => { hapticLight(); setTab(t.key); }}>
            <Text style={[typography.body, { color: tab === t.key ? '#FFF' : colors.text, fontWeight: '700' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState emoji="📋" message={tab === 'audit' ? 'Henüz admin logu yok' : 'Güvenlik olayı bulunamadı'} />}
          renderItem={({ item }: any) => {
            const meta = tab === 'audit' ? (ACTION_LABELS[item.action] || { icon: '📝', color: colors.textSecondary }) : { icon: '🔒', color: '#EF4444' };
            return (
              <Card accentColor={meta.color} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 20, marginRight: spacing.sm }}>{meta.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{item.description}</Text>
                    {item.adminEmail && <Text style={[typography.small, { color: colors.primary }]}>{item.adminEmail}</Text>}
                    {item.ipAddress && <Text style={[typography.small, { color: colors.textTertiary }]}>IP: {item.ipAddress}</Text>}
                    <Text style={[typography.small, { color: colors.textTertiary, marginTop: 2 }]}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, marginHorizontal: 4 },
});
