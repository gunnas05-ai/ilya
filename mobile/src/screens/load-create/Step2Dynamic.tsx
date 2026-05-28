import { forwardRef, useImperativeHandle, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, typography } from '../../theme';
import { useLoadCreateStore } from '../../store/loadCreateStore';
import FormField from '../../components/load-create/FormField';
import DropdownSelect from '../../components/load-create/DropdownSelect';
import RadioGroup from '../../components/load-create/RadioGroup';

import {
  VEHICLE_TYPES_FULL,
  TRAILER_TYPES,
  PACKAGE_TYPES,
  URGENCY_LEVELS,
  HOME_VEHICLE_TYPES,
  HOME_TRAILER_TYPES,
  HOME_TRANSPORT_TYPES,
  CITY_VEHICLE_TYPES,
  CITY_TRAILER_TYPES,
  CITY_TRANSPORT_TYPES,
  DELIVERY_TIME_SLOTS,
  CITY_URGENCY,
  LOAD_SIZES,
} from '../../constants/loadConstants';
import { LoadType } from '../../types/load';

export interface Step2Handle {
  validateAndNext: () => void;
}

interface Step2Props {
  onNext: () => void;
}

function validateTamYuk(formData: any): string | null {
  if (!formData.vehicleType) return 'Araç tipi seçiniz';
  if (!formData.trailerType) return 'Dorse tipi seçiniz';
  if (!formData.totalWeight || formData.totalWeight <= 0) return 'Geçerli bir ağırlık giriniz';
  return null;
}

function validateKismiYuk(formData: any): string | null {
  if (!formData.vehicleType) return 'Araç tipi seçiniz';
  if (!formData.trailerType) return 'Dorse tipi seçiniz';
  if (!formData.partCount || formData.partCount <= 0) return 'Parça sayısı giriniz';
  if (!formData.volume || formData.volume <= 0) return 'Hacim giriniz';
  if (!formData.packageType) return 'Paket tipi seçiniz';
  if (!formData.urgency) return 'Aciliyet durumu seçiniz';
  return null;
}

function validateEvdenEve(formData: any): string | null {
  if (!formData.homeVehicleType) return 'Araç tipi seçiniz';
  if (!formData.homeTrailerType) return 'Dorse tipi seçiniz';
  if (!formData.transportType) return 'Taşıma tipi seçiniz';
  return null;
}

function validateSehirIci(formData: any): string | null {
  if (!formData.cityVehicleType) return 'Araç tipi seçiniz';
  if (!formData.cityTrailerType) return 'Dorse tipi seçiniz';
  if (!formData.cityTransportType) return 'Taşıma türü seçiniz';
  if (!formData.estimatedDistance || formData.estimatedDistance <= 0) return 'Geçerli bir mesafe giriniz';
  if (!formData.deliveryTimeSlot) return 'Teslimat saat aralığı seçiniz';
  if (!formData.cityUrgency) return 'Aciliyet durumu seçiniz';
  if (!formData.loadSize) return 'Yük boyutu seçiniz';
  return null;
}

function TamYukForm() {
  const { colors } = useTheme();
  const { formData, updateFormData } = useLoadCreateStore();

  return (
    <View>
      <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
        Tam Yük Detayları
      </Text>

      <DropdownSelect
        label="Araç Tipi"
        value={formData.vehicleType || ''}
        options={VEHICLE_TYPES_FULL}
        onChange={(v) => updateFormData({ vehicleType: v })}
        required
      />

      <DropdownSelect
        label="Dorse Tipi"
        value={formData.trailerType || ''}
        options={TRAILER_TYPES}
        onChange={(v) => updateFormData({ trailerType: v })}
        required
      />

      <FormField
        label="Toplam Ağırlık (Kg)"
        value={formData.totalWeight?.toString() || ''}
        onChangeText={(t) => updateFormData({ totalWeight: parseFloat(t) || undefined })}
        placeholder="Örn: 28000"
        keyboardType="numeric"
        required
      />

      <RadioGroup
        label="Soğuk Zincir Gerekiyor mu?"
        value={formData.coldChain === true ? 'evet' : formData.coldChain === false ? 'hayir' : null}
        options={[
          { value: 'evet', label: 'Evet' },
          { value: 'hayir', label: 'Hayır' },
        ]}
        onChange={(v) => updateFormData({ coldChain: v === 'evet' })}
      />

      <View style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.label, { color: colors.text }]}>Açıklama</Text>
        <FormField
          label=""
          value={formData.description || ''}
          onChangeText={(t) => updateFormData({ description: t })}
          placeholder="Ek bilgiler..."
          multiline
          maxLength={300}
        />
      </View>
    </View>
  );
}

function KismiYukForm() {
  const { colors } = useTheme();
  const { formData, updateFormData } = useLoadCreateStore();

  return (
    <View>
      <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
        Kısmi Yük Detayları
      </Text>

      <DropdownSelect
        label="Araç Tipi"
        value={formData.vehicleType || ''}
        options={VEHICLE_TYPES_FULL}
        onChange={(v) => updateFormData({ vehicleType: v })}
        required
      />

      <DropdownSelect
        label="Dorse Tipi"
        value={formData.trailerType || ''}
        options={TRAILER_TYPES}
        onChange={(v) => updateFormData({ trailerType: v })}
        required
      />

      <FormField
        label="Parça Sayısı"
        value={formData.partCount?.toString() || ''}
        onChangeText={(t) => updateFormData({ partCount: parseInt(t) || undefined })}
        placeholder="Parça adedi"
        keyboardType="numeric"
        required
      />

      <FormField
        label="Toplam Ağırlık (Ton)"
        value={formData.totalTonnage?.toString() || ''}
        onChangeText={(t) => updateFormData({ totalTonnage: parseFloat(t) || undefined })}
        placeholder="Opsiyonel"
        keyboardType="numeric"
      />

      <FormField
        label="Hacim (m³)"
        value={formData.volume?.toString() || ''}
        onChangeText={(t) => updateFormData({ volume: parseFloat(t) || undefined })}
        placeholder="Metreküp cinsinden"
        keyboardType="numeric"
        required
      />

      <DropdownSelect
        label="Paket Tipi"
        value={formData.packageType || ''}
        options={PACKAGE_TYPES}
        onChange={(v) => updateFormData({ packageType: v })}
        required
      />

      <RadioGroup
        label="Paylaşımlı Taşıma İzni"
        value={formData.sharedTransport === true ? 'evet' : formData.sharedTransport === false ? 'hayir' : null}
        options={[
          { value: 'evet', label: 'Evet' },
          { value: 'hayir', label: 'Hayır' },
        ]}
        onChange={(v) => updateFormData({ sharedTransport: v === 'evet' })}
      />

      <RadioGroup
        label="Yük Aciliyeti"
        value={formData.urgency || ''}
        options={URGENCY_LEVELS.map((u) => ({ value: u, label: u }))}
        onChange={(v) => updateFormData({ urgency: v })}
        required
      />

      <View style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.label, { color: colors.text }]}>Açıklama</Text>
        <FormField
          label=""
          value={formData.description || ''}
          onChangeText={(t) => updateFormData({ description: t })}
          placeholder="Ek bilgiler..."
          multiline
          maxLength={300}
        />
      </View>
    </View>
  );
}

function EvdenEveForm() {
  const { colors } = useTheme();
  const { formData, updateFormData } = useLoadCreateStore();

  return (
    <View>
      <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
        Evden Eve Detayları
      </Text>

      <DropdownSelect
        label="Araç Tipi"
        value={formData.homeVehicleType || ''}
        options={HOME_VEHICLE_TYPES}
        onChange={(v) => updateFormData({ homeVehicleType: v })}
        required
      />

      <DropdownSelect
        label="Dorse Tipi"
        value={formData.homeTrailerType || ''}
        options={HOME_TRAILER_TYPES}
        onChange={(v) => updateFormData({ homeTrailerType: v })}
        required
      />

      <DropdownSelect
        label="Taşıma Tipi"
        value={formData.transportType || ''}
        options={HOME_TRANSPORT_TYPES}
        onChange={(v) => updateFormData({ transportType: v })}
        required
      />

      <FormField
        label="Eşya Listesi"
        value={formData.itemList || ''}
        onChangeText={(t) => updateFormData({ itemList: t })}
        placeholder="Taşınacak eşyaları listeleyin..."
        multiline
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <FormField
            label="Gönderen Kat"
            value={formData.senderFloor?.toString() || ''}
            onChangeText={(t) => updateFormData({ senderFloor: parseInt(t) || undefined })}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.half}>
          <FormField
            label="Alıcı Kat"
            value={formData.receiverFloor?.toString() || ''}
            onChangeText={(t) => updateFormData({ receiverFloor: parseInt(t) || undefined })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <RadioGroup
        label="Gönderende Asansör Var mı?"
        value={formData.senderElevator === true ? 'evet' : formData.senderElevator === false ? 'hayir' : null}
        options={[
          { value: 'evet', label: 'Evet' },
          { value: 'hayir', label: 'Hayır' },
        ]}
        onChange={(v) => updateFormData({ senderElevator: v === 'evet' })}
      />

      <RadioGroup
        label="Alıcıda Asansör Var mı?"
        value={formData.receiverElevator === true ? 'evet' : formData.receiverElevator === false ? 'hayir' : null}
        options={[
          { value: 'evet', label: 'Evet' },
          { value: 'hayir', label: 'Hayır' },
        ]}
        onChange={(v) => updateFormData({ receiverElevator: v === 'evet' })}
      />

      <RadioGroup
        label="Ambalaj Gerekiyor mu?"
        value={formData.packaging === true ? 'evet' : formData.packaging === false ? 'hayir' : null}
        options={[
          { value: 'evet', label: 'Evet' },
          { value: 'hayir', label: 'Hayır' },
        ]}
        onChange={(v) => updateFormData({ packaging: v === 'evet' })}
      />

      <FormField
        label="Açıklama"
        value={formData.description || ''}
        onChangeText={(t) => updateFormData({ description: t })}
        placeholder="Ek bilgiler..."
        multiline
        maxLength={300}
      />
    </View>
  );
}

function SehirIciForm() {
  const { colors } = useTheme();
  const { formData, updateFormData } = useLoadCreateStore();

  return (
    <View>
      <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
        Şehir İçi Detayları
      </Text>

      <DropdownSelect
        label="Araç Tipi"
        value={formData.cityVehicleType || ''}
        options={CITY_VEHICLE_TYPES}
        onChange={(v) => updateFormData({ cityVehicleType: v })}
        required
      />

      <DropdownSelect
        label="Dorse Tipi"
        value={formData.cityTrailerType || ''}
        options={CITY_TRAILER_TYPES}
        onChange={(v) => updateFormData({ cityTrailerType: v })}
        required
      />

      <DropdownSelect
        label="Taşıma Türü"
        value={formData.cityTransportType || ''}
        options={CITY_TRANSPORT_TYPES}
        onChange={(v) => updateFormData({ cityTransportType: v })}
        required
      />

      <FormField
        label="Tahmini Mesafe (Km)"
        value={formData.estimatedDistance?.toString() || ''}
        onChangeText={(t) => updateFormData({ estimatedDistance: parseFloat(t) || undefined })}
        placeholder="Örn: 25"
        keyboardType="numeric"
        required
      />

      <DropdownSelect
        label="Teslimat Saat Aralığı"
        value={formData.deliveryTimeSlot || ''}
        options={DELIVERY_TIME_SLOTS}
        onChange={(v) => updateFormData({ deliveryTimeSlot: v })}
        required
      />

      <RadioGroup
        label="Aciliyet Durumu"
        value={formData.cityUrgency || ''}
        options={CITY_URGENCY.map((u) => ({ value: u, label: u }))}
        onChange={(v) => updateFormData({ cityUrgency: v })}
        required
      />

      <DropdownSelect
        label="Yük Boyutu"
        value={formData.loadSize || ''}
        options={LOAD_SIZES}
        onChange={(v) => updateFormData({ loadSize: v })}
        required
      />

      <FormField
        label="Açıklama"
        value={formData.description || ''}
        onChangeText={(t) => updateFormData({ description: t })}
        placeholder="Ek bilgiler..."
        multiline
        maxLength={300}
      />
    </View>
  );
}

export default forwardRef<Step2Handle, Step2Props>(function Step2Dynamic({ onNext }, ref) {
  const { colors } = useTheme();
  const { formData } = useLoadCreateStore();

  const loadType: LoadType | null = formData.loadType as LoadType;

  const validateAndNext = useCallback(() => {
    let error: string | null = null;
    switch (loadType) {
      case 'tam_yuk': error = validateTamYuk(formData); break;
      case 'kismi_yuk': error = validateKismiYuk(formData); break;
      case 'evden_eve': error = validateEvdenEve(formData); break;
      case 'sehir_ici': error = validateSehirIci(formData); break;
    }
    if (error) {
      Alert.alert('Uyarı', error);
      return;
    }
    onNext();
  }, [loadType, formData, onNext]);

  useImperativeHandle(ref, () => ({ validateAndNext }), [validateAndNext]);

  if (!loadType) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.body, { color: colors.danger }]}>
          Lütfen önce yük türü seçiniz.
        </Text>
      </View>
    );
  }

  const renderForm = () => {
    switch (loadType) {
      case 'tam_yuk': return <TamYukForm />;
      case 'kismi_yuk': return <KismiYukForm />;
      case 'evden_eve': return <EvdenEveForm />;
      case 'sehir_ici': return <SehirIciForm />;
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderForm()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
