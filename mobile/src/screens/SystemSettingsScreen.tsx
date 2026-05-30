import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { usePermission } from '../hooks/usePermission';
import { apiClient } from '../services/api';
import { hapticMedium } from '../utils/haptic';
import { showToast } from '../utils/toast';
import Card from '../components/shared/Card';
import ErrorState from '../components/shared/ErrorState';
import ListSkeleton from '../components/shared/ListSkeleton';
import { spacing, radius, typography } from '../theme';

export default function SystemSettingsScreen() {
  const { colors } = useTheme();
  const { can } = usePermission();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/settings');
      const data = res.data?.data?.settings || {};
      setSettings(data);
      setEditing({ ...data });
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchSettings(); }, []));

  const handleSave = async () => {
    hapticMedium();
    setSaving(true);
    try {
      await apiClient.put('/admin/settings', editing);
      showToast('Ayarlar kaydedildi', 'success');
      setSettings({ ...editing });
    } catch { showToast('Kaydedilemedi', 'error'); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setEditing({ ...settings });
    showToast('Degisiklikler sifirlandi', 'info');
  };

  if (!can('admin:view_panel')) {
    return <ErrorState message="Bu sayfayı görüntülemek için admin yetkisi gerekiyor." />;
  }

  const editableKeys = Object.keys(editing).filter(k => !k.startsWith('_'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>⚙️ Sistem Ayarları</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Uygulama yapılandırması ve parametreler</Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.btnText}>💾 Kaydet</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.border }]} onPress={handleReset}>
              <Text style={[s.btnText, { color: colors.text }]}>🔄 Sıfırla</Text>
            </TouchableOpacity>
          </View>

          {editableKeys.length === 0 ? (
            <Card accentColor={colors.textTertiary}><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Henuz sistem ayari tanimlanmamis. Veritabaninda system_settings tablosuna kayit ekleyin.</Text></Card>
          ) : (
            editableKeys.map((key) => (
              <Card key={key} accentColor={editing[key] !== settings[key] ? colors.warning : colors.border} style={{ marginBottom: spacing.sm }}>
                <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.xs }]}>{key}</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={editing[key] || ''}
                  onChangeText={(t) => setEditing({ ...editing, [key]: t })}
                  placeholderTextColor={colors.textTertiary}
                />
                {editing[key] !== settings[key] && (
                  <Text style={[typography.small, { color: colors.warning, marginTop: 4 }]}>⚠ Degisti (orijinal: {settings[key]})</Text>
                )}
              </Card>
            ))
          )}

          <TouchableOpacity style={[s.testBtn, { borderColor: colors.primary }]} onPress={async () => {
            try {
              const res = await apiClient.get('/admin/settings/public');
              const pub = res.data?.data || {};
              Alert.alert('Public Ayarlar', JSON.stringify(pub, null, 2).substring(0, 500));
            } catch { showToast('Alinamadi', 'error'); }
          }}>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>📋 Public Ayarlari Goruntule</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, minHeight: 42, marginTop: 4 },
  testBtn: { paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', marginTop: spacing.lg },
});
