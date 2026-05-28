import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticSuccess } from '../../utils/haptic';
import Card from '../../components/shared/Card';

const REASONS = [
  { value: 'not_as_described', label: 'Açıklamadan farklı' },
  { value: 'damaged', label: 'Hasarlı geldi' },
  { value: 'wrong_item', label: 'Yanlış ürün' },
  { value: 'not_received', label: 'Teslim edilmedi' },
  { value: 'other', label: 'Diğer' },
];

export default function PartDisputeScreen({ navigation, route }: any) {
  const { transactionId } = route.params || {};
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { Alert.alert('Uyarı', 'Lütfen bir sebep seçin.'); return; }
    setSaving(true);
    try {
      await apiClient.post('/part-market/disputes', { transactionId, reason, description });
      hapticSuccess();
      Alert.alert('✅', 'Sorun bildiriminiz alındı. 48 saat içinde incelenecektir.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Bildirim yapılamadı.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>Sorun Bildir</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.lg }]}>Ürünle ilgili bir sorun yaşadıysanız buradan bildirebilirsiniz.</Text>

      <Card accentColor={colors.danger} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Sebep</Text>
        {REASONS.map((r) => (
          <TouchableOpacity key={r.value} style={[styles.reasonItem, { borderColor: colors.border, backgroundColor: reason === r.value ? colors.danger + '15' : 'transparent' }]} onPress={() => setReason(r.value)}>
            <Text style={[typography.body, { color: reason === r.value ? colors.danger : colors.text, fontWeight: reason === r.value ? '700' : '400' }]}>{reason === r.value ? '● ' : '○ '}{r.label}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card accentColor={colors.warning}>
        <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Açıklama</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={description} onChangeText={setDescription} placeholder="Sorunu detaylı açıklayın..." placeholderTextColor={colors.textTertiary} multiline />
      </Card>

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.danger }]} onPress={handleSubmit} disabled={saving}>
        <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>{saving ? 'Gönderiliyor...' : '⚠️ Sorun Bildir'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  reasonItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.xs },
  input: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  submitBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
});
