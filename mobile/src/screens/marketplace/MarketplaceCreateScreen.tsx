import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { marketplaceService } from '../../services/marketplaceService';
import { hapticLight, hapticSuccess } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import Card from '../../components/shared/Card';

const CATEGORIES = [
  { id: 1, name: 'Çekici', icon: '🚛' },
  { id: 2, name: 'Dorse', icon: '📦' },
  { id: 3, name: 'Kamyon', icon: '🚚' },
  { id: 4, name: 'Yedek Parça', icon: '🔧' },
];

const VEHICLE_TYPES = ['cekici', 'dorse', 'kamyon', 'tir'];
const TRAILER_TYPES = ['Tenteli', 'Mega', 'Frigo', 'Damper', 'Lowbed', 'Tanker', 'Silobas', 'Konteyner'];

export default function MarketplaceCreateScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [isBarter, setBarter] = useState(false);
  const [vehicleType, setVehicleType] = useState('cekici');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [kingPin, setKingPin] = useState('');
  const [axleCap, setAxleCap] = useState('');
  const [trailerType, setTrailerType] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title || !price || !city) { Alert.alert('Eksik', 'Başlık, fiyat ve şehir zorunludur.'); return; }
    setSaving(true);
    try {
      await marketplaceService.createListing({
        title, categoryId, price: parseFloat(price), description, fullAddress: `${city} / ${district}`, city, district,
        isBarterAvailable: isBarter,
        vehicleDetail: {
          vehicleType, brand, model,
          modelYear: modelYear ? parseInt(modelYear) : undefined,
          kingPinDiameter: kingPin ? parseFloat(kingPin) : undefined,
          axleCapacityKg: axleCap ? parseFloat(axleCap) : undefined,
          trailerType: trailerType || undefined,
        },
      });
      hapticSuccess();
      Alert.alert('Başarılı', 'İlan oluşturuldu.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.message || 'Oluşturma başarısız.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>Yeni İlan</Text>

        <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>Kategori</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.id} style={[styles.chip, { backgroundColor: categoryId === c.id ? colors.primary : colors.surface, borderColor: categoryId === c.id ? colors.primary : colors.border }]} onPress={() => { hapticLight(); setCategoryId(c.id); }}>
              <Text style={[typography.caption, { color: categoryId === c.id ? colors.white : colors.text }]}>{c.icon} {c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Başlık" value={title} onChange={setTitle} colors={colors} />
        <Field label="Fiyat (₺)" value={price} onChange={setPrice} colors={colors} keyboard="numeric" />
        <Field label="Açıklama" value={description} onChange={setDescription} colors={colors} multiline />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Field label="Şehir" value={city} onChange={setCity} colors={colors} /></View>
          <View style={{ flex: 1 }}><Field label="İlçe" value={district} onChange={setDistrict} colors={colors} /></View>
        </View>

        <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: isBarter ? colors.info + '15' : colors.surface, borderColor: isBarter ? colors.info : colors.border }]} onPress={() => { hapticLight(); setBarter(!isBarter); }}>
          <Text style={[typography.body, { color: isBarter ? colors.info : colors.textTertiary }]}>{isBarter ? '🔄 Takas Açık' : '🔄 Takas Kapalı'}</Text>
        </TouchableOpacity>

        {/* Vehicle Details */}
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>🚛 Araç Detayları</Text>

        <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>Araç Tipi</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {VEHICLE_TYPES.map(vt => (
            <TouchableOpacity key={vt} style={[styles.chip, { backgroundColor: vehicleType === vt ? colors.primary : colors.surface, borderColor: vehicleType === vt ? colors.primary : colors.border }]} onPress={() => { hapticLight(); setVehicleType(vt); }}>
              <Text style={[typography.caption, { color: vehicleType === vt ? colors.white : colors.text }]}>{vt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Field label="Marka" value={brand} onChange={setBrand} colors={colors} /></View>
          <View style={{ flex: 1 }}><Field label="Model" value={model} onChange={setModel} colors={colors} /></View>
        </View>
        <Field label="Model Yılı" value={modelYear} onChange={setModelYear} colors={colors} keyboard="numeric" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Field label='King Pin (")' value={kingPin} onChange={setKingPin} colors={colors} keyboard="numeric" /></View>
          <View style={{ flex: 1 }}><Field label="Aks Kap. (kg)" value={axleCap} onChange={setAxleCap} colors={colors} keyboard="numeric" /></View>
        </View>

        {vehicleType === 'dorse' && (
          <>
            <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>Dorse Tipi</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              {TRAILER_TYPES.map(tt => (
                <TouchableOpacity key={tt} style={[styles.chip, { backgroundColor: trailerType === tt ? colors.primary : colors.surface, borderColor: trailerType === tt ? colors.primary : colors.border }]} onPress={() => { hapticLight(); setTrailerType(trailerType === tt ? '' : tt); }}>
                  <Text style={[typography.caption, { color: trailerType === tt ? colors.white : colors.text }]}>{tt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.success }]} onPress={handleCreate} disabled={saving}>
          <Text style={[typography.label, { color: colors.white }]}>{saving ? 'Oluşturuluyor...' : 'İlanı Yayınla'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, colors, keyboard, multiline }: any) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput style={[fieldStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, minHeight: multiline ? 72 : 44 }]} value={value} onChangeText={onChange} keyboardType={keyboard || 'default'} multiline={multiline} placeholderTextColor={colors.textTertiary} />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  input: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 14 },
});

const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  toggleBtn: { paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', marginTop: spacing.sm },
  submitBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.lg },
});
