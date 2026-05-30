import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { usePermission } from '../hooks/usePermission';
import { apiClient } from '../services/api';
import { hapticLight, hapticMedium } from '../utils/haptic';
import { showToast } from '../utils/toast';
import Card from '../components/shared/Card';
import ErrorState from '../components/shared/ErrorState';
import { spacing, radius, typography } from '../theme';

interface PermissionDef {
  id: string;
  key: string;
  label: string;
  group: string;
}

interface RoleData {
  id: string;
  key: string;
  label: string;
  description?: string;
  permissions?: { permission: PermissionDef }[];
}

const CHECKBOX = { on: '☑', off: '☐', partial: '▣' };

export default function PermissionMatrixScreen() {
  const { colors } = useTheme();
  const { can } = usePermission();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedPerms = useMemo(() => {
    const groups: Record<string, PermissionDef[]> = {};
    for (const p of permissions) {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    }
    return groups;
  }, [permissions]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/admin/roles'),
        apiClient.get('/admin/roles/permissions'),
      ]);
      const roleList = rolesRes.data?.data || [];
      setRoles(roleList);
      setPermissions(permsRes.data?.data || []);
      if (roleList.length > 0 && !selectedRole) {
        setSelectedRole(roleList[0].key);
        const rp = roleList[0].permissions?.map((rp: any) => rp.permission?.key) || [];
        setRolePerms(new Set(rp));
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleRoleSelect = (roleKey: string) => {
    hapticLight();
    setSelectedRole(roleKey);
    const role = roles.find((r) => r.key === roleKey);
    const rp = role?.permissions?.map((rp: any) => rp.permission?.key) || [];
    setRolePerms(new Set(rp));
  };

  const togglePerm = (key: string) => {
    hapticLight();
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    hapticLight();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
    const groupPerms = groupedPerms[group] || [];
    const allSelected = groupPerms.every((p) => rolePerms.has(p.key));
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (allSelected) groupPerms.forEach((p) => next.delete(p.key));
      else groupPerms.forEach((p) => next.add(p.key));
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    hapticMedium();
    setSaving(true);
    try {
      await apiClient.post(`/admin/roles/${selectedRole}/permissions`, {
        permissionKeys: [...rolePerms],
      });
      showToast('Yetkiler kaydedildi', 'success');
    } catch { showToast('Kaydedilemedi', 'error'); }
    finally { setSaving(false); }
  };

  const handleClone = () => {
    if (!selectedRole) return;
    Alert.alert('Yetki Kopyala', `"${selectedRole}" rolündeki yetkileri başka bir role kopyalamak için hedef rol anahtarını girin:`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kopyala',
        onPress: async () => {
          Alert.alert('Hedef Rol', 'Hedef rol anahtarını yazın (örn: yuk_veren):', [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Onayla',
              onPress: async () => {
                try {
                  await apiClient.post('/admin/roles/permissions/clone', {
                    fromRoleKey: selectedRole,
                    toRoleKey: selectedRole,
                  });
                  showToast('Yetkiler klonlandı', 'success');
                } catch { showToast('Klonlama başarısız', 'error'); }
              },
            },
          ]);
        },
      },
    ]);
  };

  if (!can('admin:view_panel')) {
    return <ErrorState message="Bu sayfayı görüntülemek için admin yetkisi gerekiyor." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Role Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.roleTabs, { borderBottomColor: colors.border }]}>
        {roles.map((r) => (
          <TouchableOpacity key={r.key} style={[s.roleTab, { backgroundColor: selectedRole === r.key ? colors.primary : 'transparent' }]} onPress={() => handleRoleSelect(r.key)}>
            <Text style={[typography.small, { color: selectedRole === r.key ? '#FFF' : colors.text, fontWeight: '700' }]}>{r.label || r.key}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.btnText}>💾 Kaydet ({rolePerms.size})</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.warning }]} onPress={handleClone}>
              <Text style={s.btnText}>📋 Klonla</Text>
            </TouchableOpacity>
          </View>

          <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>🔐 Yetki Matrisi</Text>

          {/* Permission Groups (Accordion) */}
          {Object.entries(groupedPerms).map(([group, perms]) => {
            const selectedCount = perms.filter((p) => rolePerms.has(p.key)).length;
            const allSelected = selectedCount === perms.length;
            const partial = selectedCount > 0 && selectedCount < perms.length;
            const isExpanded = expandedGroups.has(group);

            return (
              <Card key={group} accentColor={allSelected ? colors.success : partial ? colors.warning : colors.border} style={{ marginBottom: spacing.sm }}>
                <TouchableOpacity onPress={() => toggleGroup(group)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={[s.checkIcon, { color: allSelected ? colors.success : partial ? colors.warning : colors.textTertiary }]}>
                      {allSelected ? CHECKBOX.on : partial ? CHECKBOX.partial : CHECKBOX.off}
                    </Text>
                    <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{group}</Text>
                  </View>
                  <View style={[s.countBadge, { backgroundColor: allSelected ? colors.success + '20' : partial ? colors.warning + '20' : colors.border + '40' }]}>
                    <Text style={[typography.small, { color: allSelected ? colors.success : partial ? colors.warning : colors.textTertiary }]}>{selectedCount}/{perms.length}</Text>
                  </View>
                  <Text style={{ color: colors.textTertiary, marginLeft: spacing.sm }}>{isExpanded ? '▾' : '▸'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={{ marginTop: spacing.sm, marginLeft: spacing.xl }}>
                    {perms.map((p) => (
                      <TouchableOpacity key={p.key} onPress={() => togglePerm(p.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={[s.checkIcon, { color: rolePerms.has(p.key) ? colors.success : colors.textTertiary }]}>
                          {rolePerms.has(p.key) ? CHECKBOX.on : CHECKBOX.off}
                        </Text>
                        <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{p.label}</Text>
                        <Text style={[typography.small, { color: colors.textTertiary, fontSize: 10 }]}>{p.key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  roleTabs: { flexDirection: 'row', borderBottomWidth: 1, maxHeight: 48 },
  roleTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  checkIcon: { fontSize: 22, marginRight: spacing.sm, width: 28, textAlign: 'center' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
