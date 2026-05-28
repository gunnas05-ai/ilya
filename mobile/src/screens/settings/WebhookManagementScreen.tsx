import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { integrationService, WebhookData } from '../../services/integrationService';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import ListSkeleton from '../../components/shared/ListSkeleton';
import Card from '../../components/shared/Card';

const AVAILABLE_EVENTS = [
  { key: 'load.created', label: '📦 Yük Oluşturuldu' },
  { key: 'load.status_changed', label: '🔄 Yük Durum Değişikliği' },
  { key: 'shipment.delivered', label: '✅ Teslimat Tamamlandı' },
];

export default function WebhookManagementScreen() {
  const { colors } = useTheme();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');

  useEffect(() => { fetchWebhooks(); }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const data = await integrationService.listWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch { setWebhooks([]); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormName(''); setFormUrl(''); setFormEvents([]); setFormSecret('');
    setEditingId(null); setShowForm(false);
  };

  const toggleEvent = (key: string) => {
    setFormEvents(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      Alert.alert('Eksik Bilgi', 'İsim, URL ve en az bir event seçiniz.');
      return;
    }
    try {
      if (editingId) {
        await integrationService.updateWebhook(editingId, { name: formName, url: formUrl, events: formEvents, secret: formSecret });
      } else {
        await integrationService.createWebhook({ name: formName, url: formUrl, events: formEvents, secret: formSecret });
      }
      hapticSuccess();
      resetForm();
      fetchWebhooks();
    } catch (err: any) {
      hapticError();
      Alert.alert('Hata', err.response?.data?.message || 'Kayıt başarısız.');
    }
  };

  const handleToggle = async (wh: WebhookData) => {
    hapticLight();
    try {
      await integrationService.toggleWebhook(wh.id!);
      fetchWebhooks();
    } catch { Alert.alert('Hata', 'Durum değiştirilemedi.'); }
  };

  const handleDelete = (wh: WebhookData) => {
    Alert.alert('Sil', `"${wh.name}" webhook'unu silmek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await integrationService.deleteWebhook(wh.id!); fetchWebhooks(); } catch {}
      }},
    ]);
  };

  if (loading) return <View style={{ flex:1, backgroundColor:colors.background }}><OfflineBar /><ListSkeleton /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>

        {/* Info banner */}
        <Card accentColor={colors.info} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>🔗 Webhook Entegrasyonu</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Yük oluşturma, durum değişikliği ve teslimat olaylarını kendi sisteminize anlık olarak iletin.
          </Text>
        </Card>

        {/* Webhook List */}
        {webhooks.length === 0 && !showForm ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ fontSize: 48 }}>🔗</Text>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Henüz webhook yok</Text>
          </View>
        ) : (
          webhooks.map(wh => (
            <Card key={wh.id} accentColor={wh.isActive ? colors.success : colors.textTertiary} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>{wh.name}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>{wh.url}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {wh.events.map(e => (
                      <View key={e} style={[styles.eventChip, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[typography.small, { color: colors.primary }]}>{e.split('.')[0]}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: 4 }}>
                    <Text style={[typography.small, { color: colors.success }]}>✅ {wh.successCount || 0}</Text>
                    <Text style={[typography.small, { color: colors.danger }]}>❌ {wh.failureCount || 0}</Text>
                  </View>
                </View>
                <Switch value={wh.isActive} onValueChange={() => handleToggle(wh)} trackColor={{ true: colors.success }} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.primary }]} onPress={() => {
                  setEditingId(wh.id!); setFormName(wh.name); setFormUrl(wh.url);
                  setFormEvents(wh.events); setFormSecret(wh.secret || ''); setShowForm(true);
                }}>
                  <Text style={[typography.small, { color: colors.primary }]}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { borderColor: colors.danger }]} onPress={() => handleDelete(wh)}>
                  <Text style={[typography.small, { color: colors.danger }]}>Sil</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card accentColor={colors.primary} style={{ marginTop: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md }]}>
              {editingId ? 'Webhook Düzenle' : 'Yeni Webhook'}
            </Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Webhook Adı" placeholderTextColor={colors.textTertiary} value={formName} onChangeText={setFormName} />
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="https://your-system.com/webhook" placeholderTextColor={colors.textTertiary} value={formUrl} onChangeText={setFormUrl} autoCapitalize="none" keyboardType="url" />
            {/* Event checkboxes */}
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>Event'ler:</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {AVAILABLE_EVENTS.map(ev => {
                const selected = formEvents.includes(ev.key);
                return (
                  <TouchableOpacity key={ev.key} style={[styles.eventCheckbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '15' : 'transparent' }]} onPress={() => toggleEvent(ev.key)}>
                    <Text style={[typography.small, { color: selected ? colors.primary : colors.textTertiary }]}>{selected ? '☑' : '☐'} {ev.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Secret (opsiyonel, HMAC imza)" placeholderTextColor={colors.textTertiary} value={formSecret} onChangeText={setFormSecret} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.success }]} onPress={handleSave}>
                <Text style={[typography.label, { color: colors.white }]}>{editingId ? 'Güncelle' : 'Kaydet'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { borderColor: colors.border, borderWidth: 1 }]} onPress={resetForm}>
                <Text style={[typography.label, { color: colors.textTertiary }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Add button */}
        {!showForm && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowForm(true); hapticLight(); }}>
            <Text style={[typography.label, { color: colors.white }]}>+ Yeni Webhook</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, minHeight: 44, fontSize: 14, marginBottom: spacing.sm, marginTop: spacing.xs },
  eventChip: { paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.sm },
  eventCheckbox: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1 },
  smallBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1 },
  formBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  addBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
});
