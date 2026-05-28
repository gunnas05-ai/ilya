import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { gibService } from '../../services/gibService';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptic';
import OfflineBar from '../../components/shared/OfflineBar';
import { TCInput, isValidTC } from '../../components/shared/TCInput';
import CityDistrictPicker from '../../components/load-create/CityDistrictPicker';

const INVOICE_TYPES = [
  { key: 'e_fatura', label: 'E-Fatura' },
  { key: 'e_arsiv', label: 'E-Arşiv' },
  { key: 'proforma', label: 'Proforma' },
  { key: 'temel', label: 'Temel' },
  { key: 'ticari', label: 'Ticari' },
  { key: 'irsaliyeli', label: 'İrsaliyeli' },
  { key: 'istisna', label: 'İstisna' },
  { key: 'ihracat', label: 'İhracat' },
  { key: 'tevkifatli', label: 'Tevkifatlı' },
  { key: 'kdv_muaf', label: 'KDV Muaf' },
];

const UNITS = ['adet', 'kg', 'ton', 'm3', 'lt', 'mt', 'saat', 'm2', 'paket', 'palet', 'koli', 'kutu'];

interface LineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
  discountPct: string;
  withholdingRate: string;
}

function emptyItem(): LineItem {
  return {
    description: '',
    quantity: '1',
    unit: 'adet',
    unitPrice: '0',
    vatRate: '20',
    discountPct: '0',
    withholdingRate: '0',
  };
}

export default function InvoiceCreateScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Type
  const [invoiceType, setInvoiceType] = useState('e_fatura');
  const [scenario, setScenario] = useState('Temel');

  // Step 1: Customer
  const [receiverName, setReceiverName] = useState('');
  const [receiverType, setReceiverType] = useState<'bireysel' | 'kurumsal'>('kurumsal');
  const [receiverVkn, setReceiverVkn] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverTaxOffice, setReceiverTaxOffice] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverDistrict, setReceiverDistrict] = useState('');

  // Step 2: Items
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  // Step 3: Logistics
  const [plateNumber, setPlateNumber] = useState('');
  const [driverTcNo, setDriverTcNo] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');

  const senderJson = JSON.stringify({
    name: 'KAPTAN Lojistik A.Ş.',
    vkn: '1234567890',
    taxOffice: 'Kadıköy VD',
    address: 'İçerenköy Mah. Kayışdağı Cad. No:123 Ataşehir/İstanbul',
    city: 'İstanbul',
    district: 'Ataşehir',
  });

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    hapticLight();
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (index: number) => {
    hapticLight();
    if (items.length > 1) setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    hapticLight();
    if (step === 0 && !invoiceType) {
      Alert.alert('Uyarı', 'Lütfen bir belge türü seçin.');
      return;
    }
    if (step === 1 && (!receiverName || !receiverVkn)) {
      Alert.alert('Uyarı', 'Alıcı bilgilerini eksiksiz doldurun.');
      return;
    }
    if (step === 1 && receiverType === 'bireysel' && !isValidTC(receiverVkn)) {
      Alert.alert('Geçersiz TCKN', 'Lütfen geçerli bir T.C. Kimlik Numarası giriniz.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    hapticLight();
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = async () => {
    hapticLight();
    if (!receiverName || !receiverVkn) {
      Alert.alert('Uyarı', 'Alıcı bilgilerini giriniz.');
      return;
    }
    if (receiverType === 'bireysel' && !isValidTC(receiverVkn)) {
      Alert.alert('Geçersiz TCKN', 'Lütfen geçerli bir T.C. Kimlik Numarası giriniz.');
      return;
    }
    if (driverTcNo && !isValidTC(driverTcNo)) {
      Alert.alert('Geçersiz Sürücü TC', 'Lütfen geçerli bir T.C. Kimlik Numarası giriniz.');
      return;
    }
    if (items.some((i) => !i.description || Number(i.quantity) <= 0 || Number(i.unitPrice) <= 0)) {
      Alert.alert('Uyarı', 'Tüm kalemleri eksiksiz doldurunuz.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoiceType,
        scenario,
        senderJson,
        receiverJson: JSON.stringify({
          name: receiverName,
          type: receiverType,
          vknTckn: receiverVkn,
          address: receiverAddress,
          taxOffice: receiverTaxOffice,
          city: receiverCity,
          district: receiverDistrict,
        }),
        issueDate,
        dueDate: dueDate || undefined,
        plateNumber,
        driverTcNo,
        orderNo,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
          discountPct: Number(item.discountPct) || 0,
          withholdingRate: Number(item.withholdingRate) || 0,
        })),
      };

      await gibService.create(payload);
      hapticSuccess();
      Alert.alert('Başarılı', 'Belge oluşturuldu.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      hapticError();
      Alert.alert('Hata', err.response?.data?.message || 'Belge oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Belge Türü', 'Alıcı', 'Kalemler', 'Teslimat'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBar />



      {/* Step Indicator */}
      <View style={[styles.stepRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {steps.map((label, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.step, i <= step && { backgroundColor: colors.primary + '15' }]}
            onPress={() => i < step && (hapticLight(), setStep(i))}
          >
            <Text
              style={[
                typography.caption,
                { color: i <= step ? colors.primary : colors.textTertiary, fontWeight: '600' },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Belge Türü
            </Text>
            <View style={styles.typeGrid}>
              {INVOICE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: invoiceType === t.key ? colors.primary + '15' : colors.surface,
                      borderColor: invoiceType === t.key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => { hapticLight(); setInvoiceType(t.key); }}
                >
                  <Text
                    style={[
                      typography.label,
                      { color: invoiceType === t.key ? colors.primary : colors.text },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md }]}>
              Senaryo
            </Text>
            {['Temel', 'Ticari', 'İhracat', 'İstisna'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.radioRow,
                  { borderColor: scenario === s ? colors.primary : colors.border },
                ]}
                onPress={() => { hapticLight(); setScenario(s); }}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: scenario === s ? colors.primary : colors.border },
                  ]}
                >
                  {scenario === s && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[typography.body, { color: colors.text }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Alıcı Bilgileri
            </Text>

            <Text style={[typography.label, { color: colors.textSecondary }]}>Alıcı Tipi</Text>
            <View style={[styles.typeRow, { marginBottom: spacing.md }]}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: receiverType === 'kurumsal' ? colors.primary + '15' : colors.surface,
                    borderColor: receiverType === 'kurumsal' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { hapticLight(); setReceiverType('kurumsal'); }}
              >
                <Text style={[typography.label, { color: receiverType === 'kurumsal' ? colors.primary : colors.text }]}>
                  Kurumsal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: receiverType === 'bireysel' ? colors.primary + '15' : colors.surface,
                    borderColor: receiverType === 'bireysel' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { hapticLight(); setReceiverType('bireysel'); }}
              >
                <Text style={[typography.label, { color: receiverType === 'bireysel' ? colors.primary : colors.text }]}>
                  Bireysel
                </Text>
              </TouchableOpacity>
            </View>

            <Field label="Ad / Ünvan" value={receiverName} onChange={setReceiverName} colors={colors} />
            {receiverType === 'kurumsal' ? (
              <Field
                label="VKN"
                value={receiverVkn}
                onChange={setReceiverVkn}
                colors={colors}
                keyboardType="number-pad"
              />
            ) : (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>TCKN</Text>
                <TCInput
                  value={receiverVkn}
                  onChangeText={setReceiverVkn}
                />
              </View>
            )}
            <Field label="Adres" value={receiverAddress} onChange={setReceiverAddress} colors={colors} multiline />
            <CityDistrictPicker
              cityValue={receiverCity}
              districtValue={receiverDistrict}
              onCityChange={setReceiverCity}
              onDistrictChange={setReceiverDistrict}
              label="İl / İlçe"
            />
            <Field label="Vergi Dairesi" value={receiverTaxOffice} onChange={setReceiverTaxOffice} colors={colors} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Fatura Kalemleri
            </Text>

            {items.map((item, i) => (
              <View key={i} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.itemHeader}>
                  <Text style={[typography.h3, { color: colors.text }]}>Kalem #{i + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(i)}>
                      <Text style={{ color: colors.danger, fontSize: 16 }}>Sil</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Field label="Açıklama" value={item.description} onChange={(v) => updateItem(i, 'description', v)} colors={colors} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Miktar" value={item.quantity} onChange={(v) => updateItem(i, 'quantity', v)} colors={colors} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Birim</Text>
                    <TouchableOpacity
                      style={[styles.unitPicker, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      onPress={() => {
                        hapticLight();
                        const idx = (UNITS.indexOf(item.unit) + 1) % UNITS.length;
                        updateItem(i, 'unit', UNITS[idx]);
                      }}
                    >
                      <Text style={[typography.body, { color: colors.text }]}>{item.unit}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Field
                  label="Birim Fiyat (₺)"
                  value={item.unitPrice}
                  onChange={(v) => updateItem(i, 'unitPrice', v)}
                  colors={colors}
                  keyboardType="decimal-pad"
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="KDV %" value={item.vatRate} onChange={(v) => updateItem(i, 'vatRate', v)} colors={colors} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="İskonto %" value={item.discountPct} onChange={(v) => updateItem(i, 'discountPct', v)} colors={colors} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Tevkifat %"
                      value={item.withholdingRate}
                      onChange={(v) => updateItem(i, 'withholdingRate', v)}
                      colors={colors}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addItemBtn, { borderColor: colors.primary }]}
              onPress={addItem}
              activeOpacity={0.7}
            >
              <Text style={[typography.label, { color: colors.primary }]}>+ Kalem Ekle</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Teslimat Bilgileri
            </Text>

            <Field label="Plaka" value={plateNumber} onChange={setPlateNumber} colors={colors} />
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Sürücü TC No</Text>
              <TCInput
                value={driverTcNo}
                onChangeText={setDriverTcNo}
              />
            </View>
            <Field label="İrsaliye / Sipariş No" value={orderNo} onChange={setOrderNo} colors={colors} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Düzenleme Tarihi" value={issueDate} onChange={setIssueDate} colors={colors} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Vade Tarihi" value={dueDate} onChange={setDueDate} colors={colors} />
              </View>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>Özet</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Tür: {INVOICE_TYPES.find((t) => t.key === invoiceType)?.label}
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Alıcı: {receiverName}
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Kalem: {items.length} adet
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Toplam (ham): {items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0).toLocaleString('tr-TR')} ₺
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: colors.border, borderWidth: 1 }]}
            onPress={handlePrev}
            activeOpacity={0.7}
          >
            <Text style={[typography.label, { color: colors.text }]}>Geri</Text>
          </TouchableOpacity>
        )}
        {step < steps.length - 1 ? (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[typography.label, { color: colors.white }]}>İleri</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={[typography.label, { color: colors.white }]}>
              {submitting ? 'Oluşturuluyor...' : 'Belgeyi Oluştur'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: any;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
          multiline && { minHeight: 60, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + spacing.sm : spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  stepRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginHorizontal: 2,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  itemCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  unitPicker: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  addItemBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  summaryCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  footerBtnPrimary: {
    borderWidth: 0,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
});
