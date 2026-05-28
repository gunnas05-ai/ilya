import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import { hapticSuccess } from '../../utils/haptic';
import Card from '../../components/shared/Card';

const CONDITIONS = [
  { value: 'new', label: 'Sıfır' }, { value: 'like_new', label: 'Az Kullanılmış' },
  { value: 'used', label: 'Kullanılmış' }, { value: 'refurbished', label: 'Tadilatlı' }, { value: 'for_parts', label: 'Çıkma' },
];

export default function PartListingCreateScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [condition, setCondition] = useState('used');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [warranty, setWarranty] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState('3');
  const [shipping, setShipping] = useState(false);
  const [shippingPrice, setShippingPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !price) { Alert.alert('Eksik Bilgi', 'Başlık ve fiyat zorunludur.'); return; }
    setSaving(true);
    try {
      await apiClient.post('/part-market/listings', {
        title, description, brand, model, partNumber, condition,
        price: parseFloat(price), city,
        warranty, warrantyMonths: warranty ? parseInt(warrantyMonths) : null,
        shippingAvailable: shipping, shippingPrice: shipping ? parseFloat(shippingPrice) : null,
      });
      hapticSuccess();
      Alert.alert('✅ Başarılı', 'İlanınız yayınlandı!', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'İlan oluşturulamadı.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg }]}>Yeni İlan Ver</Text>

      <Card accentColor={colors.primary} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Başlık *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={title} onChangeText={setTitle} placeholder="Örn: Orijinal Turboşarj DAF XF105" placeholderTextColor={colors.textTertiary} />

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Açıklama</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 80 }]} value={description} onChangeText={setDescription} placeholder="Ürün detayları..." placeholderTextColor={colors.textTertiary} multiline />

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Fiyat (₺) *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.text }]} value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
      </Card>

      <Card accentColor={colors.info} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Marka</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={brand} onChangeText={setBrand} placeholder="DAF, Mercedes, Scania..." placeholderTextColor={colors.textTertiary} />

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Model</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={model} onChangeText={setModel} placeholder="XF105, Actros..." placeholderTextColor={colors.textTertiary} />

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Parça No (OEM)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={partNumber} onChangeText={setPartNumber} placeholder="1234-567-890" placeholderTextColor={colors.textTertiary} />
      </Card>

      <Card accentColor={colors.warning} style={{ marginBottom: spacing.md }}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Durum</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity key={c.value} style={[styles.chip, { backgroundColor: condition === c.value ? colors.warning : colors.surface, borderColor: condition === c.value ? colors.warning : colors.border }]} onPress={() => setCondition(c.value)}>
              <Text style={[typography.caption, { color: condition === c.value ? '#FFF' : colors.text, fontWeight: '600' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Şehir</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={city} onChangeText={setCity} placeholder="İstanbul, Ankara..." placeholderTextColor={colors.textTertiary} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
          <Text style={[typography.caption, { color: colors.text }]}>Garanti</Text>
          <Switch value={warranty} onValueChange={setWarranty} trackColor={{ false: colors.border, true: colors.success }} />
        </View>
        {warranty && (
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginTop: spacing.sm }]} value={warrantyMonths} onChangeText={setWarrantyMonths} placeholder="Kaç ay?" placeholderTextColor={colors.textTertiary} keyboardType="numeric" />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
          <Text style={[typography.caption, { color: colors.text }]}>Kargo ile gönderim</Text>
          <Switch value={shipping} onValueChange={setShipping} trackColor={{ false: colors.border, true: colors.info }} />
        </View>
        {shipping && (
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginTop: spacing.sm }]} value={shippingPrice} onChangeText={setShippingPrice} placeholder="Kargo ücreti (₺)" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
        )}
      </Card>

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleCreate} disabled={saving}>
        <Text style={[typography.h3, { color: '#FFF', fontWeight: '800' }]}>{saving ? 'Yayınlanıyor...' : '📢 İlanı Yayınla'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 15, minHeight: 48 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  submitBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
});
