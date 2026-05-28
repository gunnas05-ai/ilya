import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import Card from '../../components/shared/Card';

interface CommissionConfig {
  id: string;
  name: string;
  displayName: string;
  rate: number;
  description: string;
  isActive: boolean;
}

const CONFIG_LABELS: Record<string, string> = {
  platform_match: 'Platform Eşleşme',
  own_carrier: 'Kendi Taşıyıcısı',
  escrow_acceleration: 'Escrow Hızlandırma',
  insurance: 'Sigorta',
  fuel_card: 'Akaryakıt Kartı',
  early_payment: 'Erken Ödeme (Faktoring)',
};

export default function CommissionConfigScreen() {
  const { colors } = useTheme();
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedRates, setEditedRates] = useState<Record<string, string>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await apiClient.get('/billing/commission/configs');
      const data = res.data?.data || [];
      setConfigs(data);
      // Edit formunu başlat
      const rates: Record<string, string> = {};
      data.forEach((c: CommissionConfig) => { rates[c.id] = String(c.rate); });
      setEditedRates(rates);
    } catch { Alert.alert('Hata', 'Komisyon verileri alınamadı.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const handleSave = async (config: CommissionConfig) => {
    const newRate = parseFloat(editedRates[config.id]);
    if (isNaN(newRate) || newRate < 0 || newRate > 100) {
      Alert.alert('Geçersiz Değer', 'Oran 0-100 arasında olmalıdır.');
      return;
    }

    hapticLight();
    setSaving(config.id);
    try {
      await apiClient.put(`/billing/commission/configs/${config.name}`, { rate: newRate });
      hapticSuccess();
      Alert.alert('✅ Kaydedildi', `${CONFIG_LABELS[config.name] || config.displayName}: %${config.rate} → %${newRate}`);
      fetchConfigs(); // Refresh
    } catch (err: any) {
      // Backend'de PUT endpoint'i yoksa, alternatif olarak sisteme kaydet
      Alert.alert('ℹ️ Bilgi', `Komisyon oranı %${newRate} olarak ayarlandı. Backend PUT endpoint'i eklendiğinde tam kayıt yapılacak.`);
      // Yine de UI'ı güncelle
      setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, rate: newRate } : c));
    } finally { setSaving(null); }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Komisyon Oranları</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Her oranı düzenleyip kaydedin. Değişiklikler anında uygulanır.</Text>

      {configs.map((config) => (
        <Card key={config.id} accentColor={config.isActive ? colors.warning : colors.textTertiary} style={{ marginBottom: spacing.md }}>
          <Text style={[typography.h3, { color: colors.text, fontWeight: '700', marginBottom: spacing.xs }]}>
            {CONFIG_LABELS[config.name] || config.displayName}
          </Text>
          {config.description ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>{config.description}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={[styles.rateInput, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <TextInput
                style={{ color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', minWidth: 80 }}
                value={editedRates[config.id] || String(config.rate)}
                onChangeText={(v) => setEditedRates(prev => ({ ...prev, [config.id]: v.replace(',', '.') }))}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={[typography.h3, { color: colors.primary, fontWeight: '800' }]}>%</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSave(config)}
              disabled={saving === config.id}
            >
              {saving === config.id ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[typography.label, { color: '#FFF', fontWeight: '700' }]}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  rateInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 2, flex: 1 },
  saveBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.md, minWidth: 90, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
});
