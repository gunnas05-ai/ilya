import { forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { useLoadCreateStore } from '../../store/loadCreateStore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step1Schema, Step1FormData } from '../../validations/loadSchema';
import LoadTypeSelector from '../../components/load-create/LoadTypeSelector';
import FormField from '../../components/load-create/FormField';
import { PhoneInput } from '../../components/shared/PhoneInput';
import CityDistrictPicker from '../../components/load-create/CityDistrictPicker';
import DateTimeFields from '../../components/load-create/DateTimeFields';

export interface Step1Handle {
  validateAndNext: () => void;
}

interface Step1Props {
  onNext: () => void;
}

export default forwardRef<Step1Handle, Step1Props>(function Step1Common({ onNext }, ref) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { formData, updateFormData } = useLoadCreateStore();

  const { control, handleSubmit, formState: { errors }, setValue, reset } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      loadType: (formData.loadType as string) || '',
      title: formData.title || '',
      fromCity: formData.fromCity || '',
      fromDistrict: formData.fromDistrict || '',
      fromAddress: formData.fromAddress || '',
      toCity: formData.toCity || '',
      toDistrict: formData.toDistrict || '',
      toAddress: formData.toAddress || '',
      contactName: formData.contactName || '',
      contactPhone: formData.contactPhone || '',
      pickupDate: formData.pickupDate || undefined,
      pickupTime: formData.pickupTime || '',
      deliveryDate: formData.deliveryDate || undefined,
      deliveryTime: formData.deliveryTime || '',
      description: formData.description || '',
    },
  });

  // AI asistan Store'u güncellediğinde form alanlarını tek tek doldur
  const syncFormFromStore = useCallback(() => {
    const d = formData as any;
    if (d.fromCity) setValue('fromCity', d.fromCity);
    if (d.fromDistrict) setValue('fromDistrict', d.fromDistrict);
    if (d.fromAddress) setValue('fromAddress', d.fromAddress);
    if (d.toCity) setValue('toCity', d.toCity);
    if (d.toDistrict) setValue('toDistrict', d.toDistrict);
    if (d.toAddress) setValue('toAddress', d.toAddress);
    if (d.title) setValue('title', d.title);
    if (d.loadType) setValue('loadType', d.loadType);
    if (d.contactName) setValue('contactName', d.contactName);
    if (d.contactPhone) setValue('contactPhone', d.contactPhone);
    if (d.pickupDate) setValue('pickupDate', new Date(d.pickupDate));
    if (d.deliveryDate) setValue('deliveryDate', new Date(d.deliveryDate));
    if (d.description) setValue('description', d.description);
  }, [formData, setValue]);

  // Ekran odaklandığında store'daki AI verilerini forma aktar
  useFocusEffect(useCallback(() => {
    syncFormFromStore();
  }, [syncFormFromStore]));

  // Store canlı değişirse de güncelle (arka planda AI güncellemesi vb.)
  useEffect(() => {
    syncFormFromStore();
  }, [formData.fromCity, formData.toCity, formData.title, formData.contactPhone, formData.pickupDate]);

  useImperativeHandle(ref, () => ({
    validateAndNext: handleSubmit((data) => {
      updateFormData(data as any);
      onNext();
    }),
  }), [handleSubmit, updateFormData, onNext]);

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
        <Controller
          control={control}
          name="loadType"
          render={({ field: { value, onChange } }) => (
            <LoadTypeSelector
              value={value}
              onChange={(v) => { onChange(v); updateFormData({ loadType: v as any }); }}
              error={errors.loadType?.message}
            />
          )}
        />

        {/* 🎤 Konuşarak Yük Ekle — yük türü seçildikten sonra */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary + '10', borderRadius: radius.md, padding: spacing.md,
            borderWidth: 1, borderColor: colors.primary + '30', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
          onPress={() => (navigation as any).navigate('AiDialog')}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 22 }}>🎤</Text>
          <View style={{ flex: 1 }}>
            <Text style={[typography.label, { color: colors.primary, fontWeight: '700', fontSize: 13 }]}>
              Konuşarak Yük Ekleyebilirsiniz
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary, fontSize: 10 }]}>
              Sesli komutla tüm alanları otomatik doldurun
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 16 }}>→</Text>
        </TouchableOpacity>

        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange } }) => (
            <FormField
              label="Başlık"
              value={value}
              onChangeText={(t) => { onChange(t); updateFormData({ title: t }); }}
              placeholder="Örn: 28 Ton Kömür"
              error={errors.title?.message}
              maxLength={20}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="fromCity"
          render={({ field: { value: cityValue, onChange: onCityChange } }) => (
            <Controller
              control={control}
              name="fromDistrict"
              render={({ field: { value: districtValue, onChange: onDistrictChange } }) => (
                <CityDistrictPicker
                  label="Nereden"
                  cityValue={cityValue}
                  districtValue={districtValue}
                  onCityChange={(id) => {
                    onCityChange(id);
                    setValue('fromDistrict', '');
                    updateFormData({ fromCity: id, fromDistrict: '' });
                  }}
                  onDistrictChange={(id) => {
                    onDistrictChange(id);
                    updateFormData({ fromDistrict: id });
                  }}
                  cityError={errors.fromCity?.message}
                  districtError={errors.fromDistrict?.message}
                  onLocationFound={(result) => {
                    if (result.address) {
                      setValue('fromAddress', result.address);
                      updateFormData({ fromAddress: result.address });
                    }
                  }}
                />
              )}
            />
          )}
        />

        <Controller
          control={control}
          name="fromAddress"
          render={({ field: { value, onChange } }) => (
            <FormField
              label="Yükleme Adresi"
              value={value}
              onChangeText={(t) => { onChange(t); updateFormData({ fromAddress: t }); }}
              placeholder="Mahalle, Sokak, Bina No"
              error={errors.fromAddress?.message}
              multiline
              required
            />
          )}
        />

        <Controller
          control={control}
          name="toCity"
          render={({ field: { value: cityValue, onChange: onCityChange } }) => (
            <Controller
              control={control}
              name="toDistrict"
              render={({ field: { value: districtValue, onChange: onDistrictChange } }) => (
                <CityDistrictPicker
                  label="Nereye"
                  cityValue={cityValue}
                  districtValue={districtValue}
                  onCityChange={(id) => {
                    onCityChange(id);
                    setValue('toDistrict', '');
                    updateFormData({ toCity: id, toDistrict: '' });
                  }}
                  onDistrictChange={(id) => {
                    onDistrictChange(id);
                    updateFormData({ toDistrict: id });
                  }}
                  cityError={errors.toCity?.message}
                  districtError={errors.toDistrict?.message}
                  onLocationFound={(result) => {
                    if (result.address) {
                      setValue('toAddress', result.address);
                      updateFormData({ toAddress: result.address });
                    }
                  }}
                />
              )}
            />
          )}
        />

        <Controller
          control={control}
          name="toAddress"
          render={({ field: { value, onChange } }) => (
            <FormField
              label="Teslimat Adresi"
              value={value}
              onChangeText={(t) => { onChange(t); updateFormData({ toAddress: t }); }}
              placeholder="Mahalle, Sokak, Bina No"
              error={errors.toAddress?.message}
              multiline
              required
            />
          )}
        />

        <Controller
          control={control}
          name="contactName"
          render={({ field: { value, onChange } }) => (
            <FormField
              label="İrtibat Kişisi Ad Soyad"
              value={value}
              onChangeText={(t) => { onChange(t); updateFormData({ contactName: t }); }}
              placeholder="Adınız ve Soyadınız"
              error={errors.contactName?.message}
              required
            />
          )}
        />

        <Controller
          control={control}
          name="contactPhone"
          render={({ field: { value, onChange } }) => (
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.label, { color: colors.text }]}>
                İrtibat Telefonu <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <PhoneInput
                value={value}
                onChangeText={(t) => {
                  onChange(t);
                  updateFormData({ contactPhone: t });
                }}
                error={errors.contactPhone?.message}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="pickupDate"
          render={({ field: { value, onChange } }) => (
            <DateTimeFields
              dateLabel="Yükleme Tarihi"
              timeLabel="Saat (opsiyonel)"
              dateValue={value ?? null}
              timeValue={formData.pickupTime || ''}
              onDateChange={(d) => { onChange(d); updateFormData({ pickupDate: d }); }}
              onTimeChange={(t) => updateFormData({ pickupTime: t })}
              dateError={errors.pickupDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="deliveryDate"
          render={({ field: { value, onChange } }) => (
            <DateTimeFields
              dateLabel="Teslim Tarihi"
              timeLabel="Saat (opsiyonel)"
              dateValue={value ?? null}
              timeValue={formData.deliveryTime || ''}
              onDateChange={(d) => { onChange(d); updateFormData({ deliveryDate: d }); }}
              onTimeChange={(t) => updateFormData({ deliveryTime: t })}
              dateError={errors.deliveryDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange } }) => (
            <FormField
              label="Açıklama"
              value={value || ''}
              onChangeText={(t) => { onChange(t); updateFormData({ description: t }); }}
              placeholder="Yük ile ilgili ek bilgiler..."
              error={errors.description?.message}
              multiline
              maxLength={300}
            />
          )}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
});
