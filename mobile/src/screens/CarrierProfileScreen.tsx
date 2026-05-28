import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { useCarrierStore } from '../store/carrierStore';
import { VEHICLE_OPTIONS } from '../types/carrier';
import OfflineBar from '../components/shared/OfflineBar';
import CarrierScoreBadge from '../components/CarrierScoreBadge';
import OcrResultCard from '../components/shared/OcrResultCard';
import { PhoneInput } from '../components/shared/PhoneInput';
import { TCInput, isValidTC } from '../components/shared/TCInput';
import { carrierScoreService, CarrierScorecardFull } from '../services/carrierScoreService';
import { financeService } from '../services/financeService';
import * as ImagePicker from 'expo-image-picker';
import { hapticLight } from '../utils/haptic';
import { apiClient } from '../services/api';

interface Props {
  navigation: any;
}

export default function CarrierProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile, loadProfile, saveProfile, completionPercent, missingFields } = useCarrierStore();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showAccountant, setShowAccountant] = useState(false);
  const [scorecard, setScorecard] = useState<CarrierScorecardFull | null>(null);
  const [ocrLicenseResult, setOcrLicenseResult] = useState<any>(null);
  const [ocrSrcResult, setOcrSrcResult] = useState<any>(null);
  const [scanningDoc, setScanningDoc] = useState<string | null>(null);

  const [walletData, setWalletData] = useState<{ balance: number; blockedBalance: number } | null>(null);

  useEffect(() => {
    loadProfile();
    // Yeni kalite skoru API'si (rozetler + skor dağılımı)
    apiClient.get('/carrier-quality/scorecard/current').then((res) => {
      setScorecard(res.data?.data || res.data);
    }).catch(() => {
      // Fallback: eski skor kartı
      carrierScoreService.getMyScorecard().then(setScorecard).catch(() => {});
    });
    // Cuzdan bakiyesini escrow API'den cek
    apiClient.get('/escrow/wallet').then((res) => {
      const w = res.data?.data || res.data;
      if (w) {
        setWalletData({
          balance: w.availableBalance || 0,
          blockedBalance: w.escrowBalance || 0,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const completion = completionPercent;
  const canBid = completion >= 80;

  const updateField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  /** EX-017: Scan a document image and run OCR */
  const handleScanDocument = async (type: 'driver_license' | 'src_document') => {
    hapticLight();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera izni verilmedi. Belgeleri taramak için kamera erişimi gereklidir.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setScanningDoc(type);
    try {
      const uploadFn = type === 'driver_license'
        ? financeService.uploadOcrDriverLicense
        : financeService.uploadOcrSrcDocument;
      const ocrResponse = await uploadFn(result.assets[0].uri, 'image/jpeg');

      if (type === 'driver_license') setOcrLicenseResult(ocrResponse);
      else setOcrSrcResult(ocrResponse);

      // Auto-fill extracted fields
      if (ocrResponse.parsedData) {
        const d = ocrResponse.parsedData;
        if (type === 'driver_license') {
          if (d.tcKimlikNo) updateField('tcKimlikNo', d.tcKimlikNo);
          if (d.licenseNo) updateField('licenseNumber', d.licenseNo);
        } else {
          if (d.srcNo) updateField('srcBelgesi', d.srcNo);
        }
      }
      Alert.alert('OCR Tamamlandı', `${type === 'driver_license' ? 'Ehliyet' : 'SRC belgesi'} başarıyla tarandı. Okunan alanlar forma aktarıldı.`);
    } catch {
      Alert.alert('Hata', 'Belge okunamadı. Lütfen tekrar deneyin veya bilgileri manuel giriniz.');
    } finally {
      setScanningDoc(null);
    }
  };

  const handleSave = async () => {
    if (form.tcKimlikNo && !isValidTC(form.tcKimlikNo)) {
      Alert.alert('Geçersiz T.C. Kimlik No', 'Lütfen geçerli bir T.C. Kimlik Numarası giriniz.');
      return;
    }
    hapticLight();
    setSaving(true);
    try {
      await saveProfile(form);
      Alert.alert('Başarılı', 'Profil bilgileriniz kaydedildi.');
    } catch (err) {
      Alert.alert('Hata', 'Kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDocs = async () => {
    hapticLight();
    setVerifying(true);
    try {
      if (form.tcKimlikNo && !form.isIdentityVerified) {
        await apiClient.post('/users/verification/identity', {
          tcKimlikNo: form.tcKimlikNo,
          firstName: profile?.user?.fullName?.split(' ')[0] || 'A',
          lastName: profile?.user?.fullName?.split(' ')[1] || 'B',
          birthYear: 1990
        });
      }
      
      await apiClient.post('/users/verification/carrier-docs', {
        plateNumber: form.plateNumber,
        srcBelgeNo: form.srcBelgesi,
        kBelgesiNo: form.kBelgesi
      });
      
      Alert.alert('Başarılı', 'Girdiğiniz belgeler başarıyla doğrulandı.');
      loadProfile(); // Reload from server
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Doğrulama işlemi başarısız oldu.');
    } finally {
      setVerifying(false);
    }
  };

  const renderProgressBar = () => (
    <View style={[styles.progressSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.progressHeader}>
        <Text style={[typography.h3, { color: colors.text }]}>Profil Tamamlama</Text>
        <Text style={[typography.h2, { color: canBid ? colors.success : colors.warning, fontWeight: '700' }]}>
          %{completion}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${completion}%`,
              backgroundColor: canBid ? colors.success : colors.warning,
            },
          ]}
        />
      </View>
      {!canBid && missingFields.length > 0 && (
        <View style={styles.missingFields}>
          <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.xs }]}>
            Eksik alanlar ({missingFields.length}):
          </Text>
          {missingFields.map((f, i) => (
            <Text key={i} style={[typography.caption, { color: colors.textTertiary }]}>
              - {f}
            </Text>
          ))}
        </View>
      )}
      {canBid && (
        <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '15' }]}>
          <Text style={[typography.label, { color: colors.success, fontWeight: '600' }]}>
            ✓ Teklif vermeye uygun
          </Text>
        </View>
      )}
    </View>
  );

  const renderField = (label: string, field: string, opts?: { keyboard?: string; placeholder?: string; multiline?: boolean; options?: string[] }) => (
    <View style={styles.fieldGroup}>
      <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>
        {label}
      </Text>
      {opts?.options ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {opts.options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionChip,
                form[field] === opt && { backgroundColor: colors.primary, borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => { hapticLight(); updateField(field, opt); }}
            >
              <Text style={[typography.caption, { color: form[field] === opt ? colors.white : colors.text }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
              minHeight: opts?.multiline ? 80 : 48,
            },
          ]}
          value={form[field]?.toString() || ''}
          onChangeText={(t) => updateField(field, opts?.keyboard === 'numeric' ? parseFloat(t) || 0 : t)}
          placeholder={opts?.placeholder || ''}
          placeholderTextColor={colors.textTertiary}
          keyboardType={opts?.keyboard === 'numeric' ? 'numeric' : 'default'}
          multiline={opts?.multiline}
        />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OfflineBar />


        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={[styles.walletCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.primary }]}>
                Cüzdan ve Hak Ediş
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Detay →</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <View>
                <Text style={[typography.label, { color: colors.textTertiary }]}>Kullanılabilir</Text>
                <Text style={[typography.h2, { color: colors.success }]}>{(walletData?.balance || 0).toLocaleString('tr-TR')} ₺</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.label, { color: colors.textTertiary }]}>Escrow'da Bloke</Text>
                <Text style={[typography.h2, { color: colors.warning }]}>{(walletData?.blockedBalance || 0).toLocaleString('tr-TR')} ₺</Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Teslimat tamamlandığında bloke bakiye kullanılabilir bakiyenize aktarılır.
            </Text>
          </View>

          {renderProgressBar()}

          {/* EX-008: Carrier Scorecard */}
          {scorecard && (
            <View style={[styles.scorecardSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <Text style={[typography.h3, { color: colors.text }]}>Taşıyıcı Skor Kartı</Text>
                <CarrierScoreBadge
                  score={{
                    overallScore: scorecard.overallScore,
                    scoreTier: scorecard.scoreTier as any,
                    tierLabel: scorecard.tierLabel,
                    tierColor: scorecard.tierColor,
                    totalCompletedLoads: scorecard.metrics.totalCompletedLoads,
                  }}
                  size="lg"
                />
              </View>

              {/* Score metrics grid */}
              <View style={styles.scoreMetricsGrid}>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: scorecard.metrics.onTimeDeliveryPct >= 80 ? colors.success : colors.warning }]}>
                    %{scorecard.metrics.onTimeDeliveryPct.toFixed(0)}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Zamanında Teslim</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: scorecard.metrics.claimsRatio < 10 ? colors.success : colors.danger }]}>
                    %{scorecard.metrics.claimsRatio.toFixed(1)}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Hasar Oranı</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: scorecard.metrics.cancellationRate < 20 ? colors.success : colors.warning }]}>
                    %{scorecard.metrics.cancellationRate.toFixed(0)}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>İptal Oranı</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: scorecard.metrics.avgResponseTimeMinutes <= 15 ? colors.success : colors.warning }]}>
                    {scorecard.metrics.avgResponseTimeMinutes}dk
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Ort. Yanıt</Text>
                </View>
              </View>

              {/* Second row */}
              <View style={styles.scoreMetricsGrid}>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: colors.text }]}>
                    {scorecard.metrics.totalCompletedLoads}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Tamamlanan Yük</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: colors.success }]}>
                    {(scorecard.metrics.totalRevenue / 1000).toFixed(0)}k ₺
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Toplam Gelir</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: colors.warning }]}>
                    ★ {scorecard.metrics.averageRating.toFixed(1)}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Puan ({scorecard.metrics.totalRatings})</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={[typography.h3, { color: colors.info }]}>
                    %{scorecard.metrics.acceptanceRate}
                  </Text>
                  <Text style={[typography.small, { color: colors.textTertiary }]}>Kabul Oranı</Text>
                </View>
              </View>

              {/* Restrictions warning */}
              {scorecard.restrictions.escrowRequired && (
                <View style={[styles.restrictionBox, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
                  <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                    ⚠️ Skorunuz %60'ın altında olduğu için Escrow (Güvenli Ödeme) zorunludur.
                  </Text>
                </View>
              )}
              {scorecard.restrictions.isRestricted && (
                <View style={[styles.restrictionBox, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
                  <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                    🚫 Hesabınız kısıtlanmıştır. Günlük {scorecard.restrictions.bidLimitPerDay} teklif limitiniz bulunmaktadır.
                  </Text>
                </View>
              )}
              {!scorecard.restrictions.escrowRequired && !scorecard.restrictions.isRestricted && (
                <View style={[styles.restrictionBox, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                  <Text style={[typography.caption, { color: colors.success, fontWeight: '600' }]}>
                    ✅ Herhangi bir kısıtlamanız bulunmamaktadır.
                  </Text>
                </View>
              )}

              {/* Rozetler */}
              {(scorecard as any).badges?.length > 0 && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>🏅 Kazanılan Rozetler</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {(scorecard as any).badges.map((b: any) => (
                      <View key={b.id} style={{ backgroundColor: colors.primary + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary + '30' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{b.icon} {b.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Skor Dağılımı */}
              {(scorecard as any).scoreBreakdown && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>📊 Skor Dağılımı</Text>
                  {Object.entries((scorecard as any).scoreBreakdown).map(([key, val]: any) => (
                    <View key={key} style={{ marginBottom: spacing.xs }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' }}>
                          {key === 'safety' ? '🛡️ Güvenlik' : key === 'performance' ? '⚡ Performans' : key === 'reliability' ? '🤝 Güvenilirlik' : key === 'financial' ? '💰 Finansal' : '⭐ Puan'}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: val > 70 ? colors.success : val > 50 ? colors.warning : colors.danger }}>%{Math.round(val)}</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                        <View style={{ height: 4, backgroundColor: val > 70 ? colors.success : val > 50 ? colors.warning : colors.danger, borderRadius: 2, width: `${Math.min(100, val)}%` }} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
              Firma Bilgileri
            </Text>
            {renderField('Firma Adı', 'companyName', { placeholder: 'Firma adınız' })}
            <View style={styles.fieldGroup}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Telefon</Text>
              <PhoneInput
                value={form.phone?.toString() || ''}
                onChangeText={(t) => updateField('phone', t)}
              />
            </View>
            {renderField('E-posta', 'email', { placeholder: 'ornek@firma.com' })}
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
              Araç Bilgileri
            </Text>
            {renderField('Ehliyet Bilgisi', 'licenseNumber', { placeholder: 'Ehliyet no' })}
            <TouchableOpacity
              style={[styles.scanBtn, { borderColor: colors.primary }]}
              onPress={() => handleScanDocument('driver_license')}
              disabled={scanningDoc === 'driver_license'}
            >
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                {scanningDoc === 'driver_license' ? '⏳ Taranıyor...' : '📸 Kameradan Ehliyet Tara'}
              </Text>
            </TouchableOpacity>
            {ocrLicenseResult && (
              <OcrResultCard documentType="driver_license" confidenceScore={ocrLicenseResult.confidenceScore} status={ocrLicenseResult.status} parsedData={ocrLicenseResult.parsedData} />
            )}
            {renderField('Araç Plakası', 'plateNumber', { placeholder: '34 ABC 123' })}
            {renderField('Araç Tipi', 'vehicleType', { options: VEHICLE_OPTIONS })}
            {renderField('Araç Kapasitesi', 'vehicleCapacity', { placeholder: 'Örn: 24 Ton' })}
            {renderField('Tonaj Kapasitesi (Ton)', 'tonnageCapacity', { keyboard: 'numeric', placeholder: 'Örn: 24' })}
            {renderField('Hacim Kapasitesi (m³)', 'volumeCapacity', { keyboard: 'numeric', placeholder: 'Örn: 90' })}
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
              Araç Ölçüleri (Kamyon Navigasyon)
            </Text>
            <Text style={[typography.caption, { color: colors.warning, marginBottom: spacing.md }]}>
              ⚠️ Bu ölçüler rota hesaplamasında köprü yükseklik ve tonaj kontrolü için kullanılır. Doğru girin.
            </Text>
            {renderField('Araç Yüksekliği (cm)', 'vehicleHeight', { keyboard: 'numeric', placeholder: 'Örn: 400 (standart TIR)' })}
            {renderField('Araç Genişliği (cm)', 'vehicleWidth', { keyboard: 'numeric', placeholder: 'Örn: 250' })}
            {renderField('Araç Uzunluğu (cm)', 'vehicleLength', { keyboard: 'numeric', placeholder: 'Örn: 1650' })}
            {renderField('Toplam Ağırlık (kg)', 'totalWeight', { keyboard: 'numeric', placeholder: 'Örn: 25000' })}
            {renderField('Dingil Ağırlığı (kg)', 'axleWeight', { keyboard: 'numeric', placeholder: 'Örn: 11500' })}
            {renderField('ADR Sınıfı', 'adrClass', { placeholder: 'Boş bırakın veya 1-9 arası tehlike sınıfı' })}
            {renderField('Dorse Tipi', 'trailerType', { options: ['Tenteli', 'Mega', 'Frigo', 'Damper', 'Konteyner', 'Lowbed', 'Tanker', 'Silobas'] })}
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.lg }]}>
              Belge ve Ödeme Bilgileri
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>T.C. Kimlik No</Text>
              <TCInput
                value={form.tcKimlikNo?.toString() || ''}
                onChangeText={(t) => updateField('tcKimlikNo', t)}
              />
            </View>
            {renderField('K Belgesi Numarası', 'kBelgesi', { placeholder: 'K belge no' })}
            {renderField('SRC Belgesi Numarası', 'srcBelgesi', { placeholder: 'SRC belge no' })}
            <TouchableOpacity
              style={[styles.scanBtn, { borderColor: colors.warning }]}
              onPress={() => handleScanDocument('src_document')}
              disabled={scanningDoc === 'src_document'}
            >
              <Text style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}>
                {scanningDoc === 'src_document' ? '⏳ Taranıyor...' : '📸 Kameradan SRC Tara'}
              </Text>
            </TouchableOpacity>
            {ocrSrcResult && (
              <OcrResultCard documentType="src_document" confidenceScore={ocrSrcResult.confidenceScore} status={ocrSrcResult.status} parsedData={ocrSrcResult.parsedData} />
            )}
            {renderField('IBAN', 'iban', { placeholder: 'TR00 0000 0000 0000 0000 0000' })}
            {renderField('Vergi Numarası', 'taxNumber', { placeholder: 'Vergi no' })}
            {renderField('Vergi Dairesi', 'taxOffice', { placeholder: 'Vergi dairesi adı' })}
            
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: form.isIdentityVerified ? colors.success : colors.info, marginTop: spacing.md }]}
              onPress={handleVerifyDocs}
              disabled={verifying}
            >
              <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>
                {form.isIdentityVerified ? '✓ Belgeler Doğrulandı' : (verifying ? 'Doğrulanıyor...' : '🛡️ Resmi Kurumdan Doğrula')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Muhasebeci / e-Fatura Entegrasyonu */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ marginBottom: showAccountant ? spacing.lg : 0 }}>
              <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.sm }]}>
                Muhasebeci
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                GİB e-Fatura ve irsaliyelerinizin mali müşavirinize otomatik iletilmesi için ekleyin.
              </Text>
            </View>

            {showAccountant && (
              <>
                {renderField('Muhasebeci Ad Soyad', 'accountantName', { placeholder: 'Mali Müşavirinizin Adı Soyadı' })}
                {renderField('Muhasebeci E-posta', 'accountantEmail', { placeholder: 'muhasebe@firma.com' })}
                <View style={styles.fieldGroup}>
                  <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Muhasebeci Telefon</Text>
                  <PhoneInput
                    value={form.accountantPhone?.toString() || ''}
                    onChangeText={(t) => updateField('accountantPhone', t)}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => setShowAccountant(!showAccountant)}
              style={{
                marginTop: showAccountant ? spacing.md : spacing.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.primary,
                alignItems: 'center',
                alignSelf: 'flex-start',
                minWidth: 140,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {showAccountant ? 'Kapat' : '+ Muhasebeci Ekle'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={[typography.label, { color: colors.white, fontWeight: '700' }]}>
              {saving ? 'Kaydediliyor...' : 'Profili Kaydet'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  content: { padding: spacing.lg },
  progressSection: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  missingFields: {
    marginTop: spacing.md,
  },
  verifiedBadge: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  walletCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  input: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 15,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  scanBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  saveBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  scorecardSection: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  scoreMetricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scoreMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restrictionBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
});
