import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { integrationService, ApiKeyData } from '../../services/integrationService';
import { handleError } from '../../services/errorService';
import ErrorState from '../../components/shared/ErrorState';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import Card from '../../components/shared/Card';

const PERMISSION_OPTIONS = [
  { key: 'loads:read', label: 'Yük Okuma' },
  { key: 'loads:create', label: 'Yük Oluşturma' },
  { key: 'tracking:read', label: 'Takip Okuma' },
  { key: 'bids:read', label: 'Teklif Okuma' },
  { key: 'webhooks:manage', label: 'Webhook Yönetimi' },
];

export default function ApiKeyManagementScreen() {
  const { colors } = useTheme();
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>(['loads:read']);
  const [formRateLimit, setFormRateLimit] = useState('1000');
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await integrationService.listApiKeys();
      setKeys(Array.isArray(data) ? data : []);
    } catch (e) {
      handleError(e, { screen: 'ApiKeyManagement', action: 'fetch' });
      setError('API anahtarları yüklenirken bir hata oluştu.');
    }
    finally { setLoading(false); }
  };

  const togglePerm = (key: string) => {
    setFormPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const handleGenerate = async () => {
    if (!formName.trim()) { Alert.alert('Uyarı', 'Anahtar adı giriniz.'); return; }
    try {
      const res = await integrationService.generateApiKey({ name: formName, permissions: formPerms, rateLimitPerHour: parseInt(formRateLimit) || 1000 });
      hapticSuccess();
      setNewKey(res.key);
      setFormName(''); setFormPerms(['loads:read']); setFormRateLimit('1000'); setShowForm(false);
      fetchKeys();
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Oluşturma başarısız.'); }
  };

  const handleRevoke = (key: ApiKeyData) => {
    Alert.alert('İptal Et', `"${key.name}" anahtarını iptal etmek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: async () => {
        try { await integrationService.revokeApiKey(key.id!); fetchKeys(); } catch (e) { handleError(e, { screen: 'ApiKeyManagement', action: 'revoke' }); }
      }},
    ]);
  };

  const copyKey = () => {
    Alert.alert('Anahtar', 'Yukarıdaki anahtarı seçip kopyalayın. Bu anahtar bir daha gösterilmeyecek!', [
      { text: 'Anladım', onPress: () => setNewKey(null) },
    ]);
  };

  if (loading) return <View style={{ flex:1, backgroundColor:colors.background }}><OfflineBar /><ListSkeleton /></View>;

  if (error) return <View style={{ flex: 1, backgroundColor: colors.background }}><ErrorState message={error} onRetry={fetchKeys} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>

        {/* New key reveal */}
        {newKey && (
          <Card accentColor={colors.success} style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: colors.success, fontWeight: '700' }]}>🔑 Yeni API Anahtarı</Text>
            <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>Bu anahtar sadece BİR KEZ gösterilir. Hemen kopyalayın!</Text>
            <Text style={[typography.body, { color: colors.text, fontFamily: 'monospace', backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm }]} selectable>{newKey}</Text>
            <TouchableOpacity style={[styles.copyBtn, { backgroundColor: colors.primary }]} onPress={copyKey}>
              <Text style={[typography.label, { color: colors.white }]}>📋 Anahtarı Onayla ve Kapat</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Info */}
        <Card accentColor={colors.info} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>🔐 API Anahtarları</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            TMS/WMS entegrasyonları için REST API anahtarları. Her anahtar saatlik istek limitine tabidir.
          </Text>
        </Card>

        {/* Key List */}
        {keys.length === 0 && !showForm ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ fontSize: 48 }}>🔐</Text>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Henüz API anahtarı yok</Text>
          </View>
        ) : (
          keys.map(k => (
            <Card key={k.id} accentColor={k.isActive ? colors.primary : colors.textTertiary} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{k.name}</Text>
                  <Text style={[typography.small, { color: colors.textTertiary, fontFamily: 'monospace' }]}>{k.keyPrefix}...</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    {k.permissions?.map(p => (
                      <View key={p} style={[styles.permChip, { backgroundColor: colors.primary + '10' }]}>
                        <Text style={[typography.small, { color: colors.primary }]}>{p.split(':')[0]}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 4 }}>
                    <Text style={[typography.small, { color: colors.textTertiary }]}>{k.usageCount || 0}/{k.rateLimitPerHour || 1000} istek/saat</Text>
                    <Text style={[typography.small, { color: k.isActive ? colors.success : colors.danger }]}>{k.isActive ? 'Aktif' : 'İptal'}</Text>
                  </View>
                </View>
              </View>
              {k.isActive && (
                <TouchableOpacity style={[styles.revokeBtn, { borderColor: colors.danger, marginTop: spacing.sm }]} onPress={() => handleRevoke(k)}>
                  <Text style={[typography.small, { color: colors.danger }]}>İptal Et</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))
        )}

        {/* Generate Form */}
        {showForm && (
          <Card accentColor={colors.primary} style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>Yeni API Anahtarı</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Anahtar Adı (örn: TMS Entegrasyonu)" placeholderTextColor={colors.textTertiary} value={formName} onChangeText={setFormName} />
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>İzinler:</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {PERMISSION_OPTIONS.map(p => {
                const selected = formPerms.includes(p.key);
                return (
                  <TouchableOpacity key={p.key} style={[styles.permCheckbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '10' : 'transparent' }]} onPress={() => togglePerm(p.key)}>
                    <Text style={[typography.small, { color: selected ? colors.primary : colors.textTertiary }]}>{selected ? '☑' : '☐'} {p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Saatlik Limit (varsayılan 1000)" placeholderTextColor={colors.textTertiary} value={formRateLimit} onChangeText={setFormRateLimit} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.success }]} onPress={handleGenerate}>
                <Text style={[typography.label, { color: colors.white }]}>Oluştur</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={() => setShowForm(false)}>
                <Text style={[typography.label, { color: colors.textTertiary }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {!showForm && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowForm(true); hapticLight(); }}>
            <Text style={[typography.label, { color: colors.white }]}>+ Yeni API Anahtarı</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, minHeight: 44, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.xs },
  permChip: { paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.sm },
  permCheckbox: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1 },
  formBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  addBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  copyBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  revokeBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, alignSelf: 'flex-start' },
});
