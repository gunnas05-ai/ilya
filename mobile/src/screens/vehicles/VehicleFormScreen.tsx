import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { vehicleService } from '../../services/vehicleService';
import { hapticLight } from '../../utils/haptic';
import Card from '../../components/shared/Card';
import OfflineBar from '../../components/shared/OfflineBar';

const FUEL_OPTIONS = ['benzin', 'dizel', 'lpg', 'elektrik', 'hibrit'];
const FUEL_LABELS: Record<string, string> = { benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG', elektrik: 'Elektrik', hibrit: 'Hibrit' };
const TRANS_OPTIONS = ['manuel', 'otomatik', 'yari_otomatik'];
const TRANS_LABELS: Record<string, string> = { manuel: 'Manuel', otomatik: 'Otomatik', yari_otomatik: 'Yarı Otomatik' };

export default function VehicleFormScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const editMode = route.params?.editMode;
  const existingVehicle = route.params?.vehicle ? JSON.parse(route.params.vehicle) : null;
  const missingFields: string[] = route.params?.missingFields || [];

  const [form, setForm] = useState<any>(existingVehicle || { brand: '', model: '', year: '', mileage: '', fuelType: 'dizel', transmission: 'manuel', color: '', plate: '', description: '', hasAccident: false, accidentDetail: '', hasServiceRecord: false, serviceDetail: '' });
  const [photos, setPhotos] = useState<any[]>((existingVehicle?.photos) || []);
  const [saving, setSaving] = useState(false);

  const isMissing = (field: string) => missingFields.includes(field) || missingFields.some(m => m.toLowerCase().includes(field.toLowerCase()));

  const pickPhoto = async () => {
    if (photos.length >= 5) { Alert.alert('Limit', 'En fazla 5 fotograf yukleyebilirsiniz.'); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Izin Gerekli', 'Kamera izni gereklidir.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    // If editing existing vehicle, upload immediately; otherwise store locally
    if (existingVehicle?.id) {
      try {
        const resp = await vehicleService.uploadPhoto(existingVehicle.id, result.assets[0].uri, 'image/jpeg');
        if (resp?.url) setPhotos([...photos, resp]);
        else setPhotos([...photos, { url: result.assets[0].uri, id: Date.now().toString(), vehicleId: existingVehicle.id }]);
      } catch { setPhotos([...photos, { url: result.assets[0].uri, id: Date.now().toString() }]); }
    } else {
      setPhotos([...photos, { url: result.assets[0].uri, id: `local_${Date.now()}`, vehicleId: null }]);
    }
  };

  const handleSave = async () => {
    hapticLight();
    if (!form.brand || !form.model || !form.year || !form.mileage) { Alert.alert('Eksik Bilgi', 'Marka, model, yil ve kilometre zorunludur.'); return; }
    setSaving(true);
    try {
      const data = { ...form, year: parseInt(form.year), mileage: parseInt(form.mileage) };
      if (editMode && existingVehicle?.id) {
        await vehicleService.update(existingVehicle.id, data);
      } else {
        const saved = await vehicleService.create(data);
        // Upload pending photos for new vehicle
        const pendingPhotos = photos.filter((p: any) => !p.vehicleId || p.id?.toString().startsWith('local_'));
        for (const p of pendingPhotos) {
          try { await vehicleService.uploadPhoto(saved.id, p.url, 'image/jpeg'); } catch {}
        }
      }
      Alert.alert('Basarili', editMode ? 'Arac guncellendi.' : 'Arac eklendi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch { Alert.alert('Hata', 'Kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBar />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        {missingFields.length > 0 && (
          <Card accentColor={colors.danger} style={{ marginBottom: spacing.md }}>
            <Text style={[typography.body, { color: colors.danger, fontWeight: '700' }]}>⚠️ Aracınızı satışa çıkarmak için lütfen aşağıdaki bilgileri tamamlayın:</Text>
            {missingFields.map((m, i) => <Text key={i} style={[typography.small, { color: colors.danger, marginTop: 2 }]}>• {m}</Text>)}
          </Card>
        )}

        {(['brand', 'model', 'year', 'mileage', 'color', 'plate'] as const).map(f => (
          <View key={f} style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>{f === 'brand' ? 'Marka *' : f === 'model' ? 'Model *' : f === 'year' ? 'Yıl *' : f === 'mileage' ? 'Kilometre *' : f === 'plate' ? 'Plaka *' : 'Renk *'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: isMissing(f) ? colors.danger : colors.border, color: colors.text }]} value={form[f]?.toString()} onChangeText={v => setForm({...form, [f]: v})} placeholder={f === 'year' ? '2020' : f === 'mileage' ? '50000' : f} placeholderTextColor={colors.textTertiary} keyboardType={['year', 'mileage'].includes(f) ? 'numeric' : 'default'} />
          </View>
        ))}

        {/* Yakıt & Şanzıman */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.text }]}>Yakıt *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {FUEL_OPTIONS.map(o => (
                <TouchableOpacity key={o} style={[styles.chip, { backgroundColor: form.fuelType === o ? colors.primary : colors.card, borderColor: form.fuelType === o ? colors.primary : colors.border }]} onPress={() => setForm({...form, fuelType: o})}>
                  <Text style={[typography.caption, { color: form.fuelType === o ? colors.white : colors.text }]}>{FUEL_LABELS[o]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={[typography.label, { color: colors.text }]}>Şanzıman *</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {TRANS_OPTIONS.map(o => (
              <TouchableOpacity key={o} style={[styles.chip, { backgroundColor: form.transmission === o ? colors.primary : colors.card, borderColor: form.transmission === o ? colors.primary : colors.border }]} onPress={() => setForm({...form, transmission: o})}>
                <Text style={[typography.caption, { color: form.transmission === o ? colors.white : colors.text }]}>{TRANS_LABELS[o]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Açıklama */}
        <Text style={[typography.label, { color: colors.text }]}>Açıklama (min 50 kara.)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: isMissing('Açıklama') ? colors.danger : colors.border, color: colors.text, minHeight: 80 }]} value={form.description} onChangeText={v => setForm({...form, description: v})} multiline placeholderTextColor={colors.textTertiary} />

        {/* Kaza & Servis */}
        {(['hasAccident', 'hasServiceRecord'] as const).map(f => (
          <View key={f} style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label, { color: colors.text }]}>{f === 'hasAccident' ? 'Kaza Geçmişi *' : 'Servis Kaydı *'}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={[styles.chip, { backgroundColor: form[f] === false ? colors.success : colors.card, borderColor: form[f] === false ? colors.success : colors.border }]} onPress={() => setForm({...form, [f]: false})}>
                <Text style={[typography.caption, { color: form[f] === false ? colors.white : colors.text }]}>Yok</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, { backgroundColor: form[f] === true ? colors.danger : colors.card, borderColor: form[f] === true ? colors.danger : colors.border }]} onPress={() => setForm({...form, [f]: true})}>
                <Text style={[typography.caption, { color: form[f] === true ? colors.white : colors.text }]}>Var</Text>
              </TouchableOpacity>
            </View>
            {form[f] && <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: spacing.xs }]} value={form[f === 'hasAccident' ? 'accidentDetail' : 'serviceDetail']} onChangeText={v => setForm({...form, [f === 'hasAccident' ? 'accidentDetail' : 'serviceDetail']: v})} placeholder="Detay..." placeholderTextColor={colors.textTertiary} />}
          </View>
        ))}

        {/* Fotoğraflar */}
        <Text style={[typography.label, { color: colors.text }]}>Fotoğraflar ({photos.length}/5)</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {photos.map((p: any, i: number) => (
            <View key={p.id || i}><Image source={{ uri: p.url }} style={styles.photo} /></View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={[styles.photo, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }]} onPress={pickPhoto}>
              <Text style={{ fontSize: 24, color: colors.primary }}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: spacing.xl }]} onPress={handleSave} disabled={saving}>
          <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>{saving ? 'Kaydediliyor...' : editMode ? 'Güncelle' : 'Aracı Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: 4, fontSize: 15 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  photo: { width: 80, height: 60, borderRadius: radius.sm },
  saveBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
});
