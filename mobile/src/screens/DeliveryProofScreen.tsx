import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import SignaturePad from '../components/shared/SignaturePad';
import Card from '../components/shared/Card';
import { Ionicons } from '@expo/vector-icons';
import { podService } from '../services/podService';
import { hapticLight, hapticMedium } from '../utils/haptic';

// ── Types ──────────────────────────────────

type RootStackParamList = {
  DeliveryProof: { loadId: string };
  LoadDetails: { id: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeliveryProof'>;

type DeliveryMode = 'normal' | 'damage';

const DAMAGE_TYPE_OPTIONS = [
  { key: 'hasarli', label: 'Hasarlı', icon: 'warning-outline' as const, color: '#EF4444' },
  { key: 'eksik', label: 'Eksik Teslimat', icon: 'remove-circle-outline' as const, color: '#F59E0B' },
  { key: 'yanlis_urun', label: 'Yanlış Ürün', icon: 'swap-horizontal-outline' as const, color: '#3B82F6' },
  { key: 'gecikme', label: 'Gecikme', icon: 'time-outline' as const, color: '#8B5CF6' },
  { key: 'evrak_eksik', label: 'Evrak Eksikliği', icon: 'document-text-outline' as const, color: '#EC4899' },
  { key: 'diger', label: 'Diğer', icon: 'ellipsis-horizontal-outline' as const, color: '#6B7280' },
];

const MAX_PHOTOS = 5;

// ── Component ──────────────────────────────

const DeliveryProofScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { loadId } = route.params || { loadId: 'mock-load-id' };

  // Flows
  const [mode, setMode] = useState<DeliveryMode | null>(null);

  // Normal flow
  const [stepNormal, setStepNormal] = useState(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [verifyingGPS, setVerifyingGPS] = useState(false);

  // Damage flow
  const [stepDamage, setStepDamage] = useState(0);
  const [damageTypes, setDamageTypes] = useState<string[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [driverNote, setDriverNote] = useState('');

  // Shared
  const [submitting, setSubmitting] = useState(false);

  // ── Normal Flow Handlers ──────────────────

  const handleVerifyLocation = async () => {
    setVerifyingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Reddedildi', 'Konum izni verilmedi.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
      hapticLight();
      setStepNormal(1);
    } catch {
      Alert.alert('Hata', 'Konum alınamadı. Tekrar deneyin.');
    } finally {
      setVerifyingGPS(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Reddedildi', 'Kamera izni verilmedi.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const confirmPhoto = () => {
    if (!photoUri) {
      Alert.alert('Uyarı', 'Lütfen irsaliye veya yük fotoğrafı çekin.');
      return;
    }
    hapticLight();
    setStepNormal(2);
  };

  const handleSignatureOK = async (signData: string) => {
    setSubmitting(true);
    try {
      await podService.uploadSignature(loadId, {
        signatureImageBase64: signData,
        signerName: 'Alıcı',
        signerRole: 'buyer',
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
      });
      if (photoUri) {
        await podService.uploadPhoto(loadId, {
          photoUrl: photoUri,
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        });
      }
      hapticMedium();

      // Backend'e teslimat doğrulaması gönder → otomatik backhaul tetiklenir
      try {
        const api = require('../services/api').apiClient;
        await api.post(`/tracking/${loadId}/verify-delivery`, {
          driverId: 'current-user',
          method: 'photo',
          metadata: {
            driverName: 'Taşıyıcı',
            deliveryLat: location?.coords.latitude,
            deliveryLng: location?.coords.longitude,
            hasSignature: true,
            hasPhoto: !!photoUri,
          },
        });
      } catch (e) {
        // Backend kapalıysa sessizce devam et
      }

      // WebSocket AUTOMATED_RELOAD event'ini dinle (3 saniye timeout)
      let backhaulTimeout: any;
      try {
        const { getSocket } = require('../services/websocket');
        const socket = getSocket();
        if (socket) {
          const handler = (data: any) => {
            clearTimeout(backhaulTimeout);
            socket.off('AUTOMATED_RELOAD', handler);
            const count = data?.backhaulCount || data?.backhaulLoads?.length || 0;
            const earnings = data?.totalEarnings || 0;
            const lat = data?.deliveryLat || location?.coords.latitude;
            const lng = data?.deliveryLng || location?.coords.longitude;

            Alert.alert(
              '🎯 Geri Dönüş Yükü Bulundu!',
              `Boşaltma noktana yakın ${count} uygun yük var.\n\nToplam ek kazanç: ${Number(earnings).toLocaleString('tr-TR')} ₺\n\nRezerve etmek ister misin?`,
              [
                { text: 'Sonra', style: 'cancel', onPress: () => navigation.goBack() },
                {
                  text: 'Yükleri Gör',
                  onPress: () => (navigation as any).navigate('ReturnLoad', { deliveryLat: lat, deliveryLng: lng }),
                },
              ],
            );
          };
          socket.on('AUTOMATED_RELOAD', handler);
          backhaulTimeout = setTimeout(() => {
            socket.off('AUTOMATED_RELOAD', handler);
          }, 5000);
        }
      } catch (e) { /* WebSocket yoksa sessizce devam */ }

      Alert.alert('✅ Teslimat Tamam', 'Teslimat kanıtı kaydedildi. Ödeme onay süreci başlatıldı.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Hata', 'Teslimat kanıtı gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Damage Flow Handlers ──────────────────

  const toggleDamageType = (key: string) => {
    hapticLight();
    setDamageTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleTakeDamagePhoto = async () => {
    if (damagePhotos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Doldu', `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Reddedildi', 'Kamera izni verilmedi.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setDamagePhotos((prev) => [...prev, result.assets[0].uri]);
      hapticLight();
    }
  };

  const removeDamagePhoto = (index: number) => {
    setDamagePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmDamageStep1 = () => {
    if (damageTypes.length === 0) {
      Alert.alert('Seçim Zorunlu', 'En az bir hasar/eksiklik türü seçmelisiniz.');
      return;
    }
    hapticLight();
    setStepDamage(1);
  };

  const confirmDamageStep2 = () => {
    if (damagePhotos.length === 0) {
      Alert.alert('Fotoğraf Zorunlu', 'En az bir fotoğraf çekmelisiniz.');
      return;
    }
    hapticLight();
    setStepDamage(2);
  };

  const submitDamageReport = async () => {
    if (!driverNote.trim()) {
      Alert.alert('Açıklama Zorunlu', 'Lütfen hasar/eksiklik ile ilgili kısa bir açıklama yazın.');
      return;
    }
    setSubmitting(true);
    try {
      const currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      }).catch(() => undefined);
      const result = await podService.submitDamageReport(loadId, {
        damageTypes,
        driverNote: driverNote.trim(),
        photoUrls: damagePhotos,
        latitude: currentLoc?.coords.latitude,
        longitude: currentLoc?.coords.longitude,
      });
      hapticMedium();
      Alert.alert(
        'Hasar Bildirimi Alındı',
        `Dispute kaydı oluşturuldu (ID: ${result.disputeId}). Ödeme bloke edildi. Operasyon ekibi en kısa sürede inceleyecektir.`,
        [{ text: 'Tamam', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Hata', 'Hasar bildirimi gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared back handler ──────────────────

  const handleBack = useCallback(() => {
    if (mode === 'damage') {
      if (stepDamage > 0) {
        setStepDamage((s) => s - 1);
        return;
      }
      setMode(null);
      return;
    }
    if (mode === 'normal') {
      if (stepNormal > 0) {
        setStepNormal((s) => s - 1);
        return;
      }
      setMode(null);
      return;
    }
    navigation.goBack();
  }, [mode, stepNormal, stepDamage, navigation]);

  // ── Render: Mode Selection ────────────────

  if (mode === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Header title="Teslimat Kanıtı (ePOD)" onBack={handleBack} colors={colors} />
        <ScrollView contentContainerStyle={styles.modeContainer}>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing['2xl'] }]}>
            Teslimat türünü seçin. Hasar veya eksiklik varsa mutlaka "Hasarlı Bildir" seçeneğini kullanın.
          </Text>

          {/* Normal Delivery Card */}
          <Card accentColor={colors.primary} style={styles.modeCard}>
            <TouchableOpacity onPress={() => { hapticLight(); setMode('normal'); }} style={styles.modeInner} activeOpacity={0.7}>
              <View style={[styles.modeIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
              </View>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Normal Teslimat</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                Yük eksiksiz ve hasarsız teslim edildi.{'\n'}GPS doğrulama → Fotoğraf → İmza
              </Text>
            </TouchableOpacity>
          </Card>

          {/* Damage Report Card */}
          <Card accentColor="#EF4444" style={styles.modeCard}>
            <TouchableOpacity onPress={() => { hapticLight(); setMode('damage'); }} style={styles.modeInner} activeOpacity={0.7}>
              <View style={[styles.modeIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning" size={40} color="#EF4444" />
              </View>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Hasarlı / Eksik Teslimat Bildir</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>
                Yükte hasar, eksiklik veya sorun var.{'\n'}Fotoğraf → Hasar Türü → Açıklama → Dispute
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Normal Flow ───────────────────

  if (mode === 'normal') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Header title="Normal Teslimat" onBack={handleBack} colors={colors} />
        <StepIndicator total={3} current={stepNormal} colors={colors} />

        {/* Step 0: GPS */}
        {stepNormal === 0 && (
          <View style={styles.stepCenter}>
            <Ionicons name="location-outline" size={64} color={colors.primary} style={styles.stepIcon} />
            <Text style={[typography.h2, { color: colors.text }]}>Adres Doğrulama</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl }]}>
              Teslimat adresinde olduğunuzu doğrulamak için konumunuz kontrol edilecektir.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleVerifyLocation}
              disabled={verifyingGPS}
              activeOpacity={0.8}
            >
              {verifyingGPS ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Hedefe Vardım</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Photo */}
        {stepNormal === 1 && (
          <ScrollView contentContainerStyle={styles.stepScroll}>
            <Ionicons name="camera-outline" size={56} color={colors.primary} style={styles.stepIcon} />
            <Text style={[typography.h2, { color: colors.text }]}>İrsaliye / Yük Fotoğrafı</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl }]}>
              Teslim edilen yükün veya imzalı irsaliyenin fotoğrafını sisteme yükleyin.
            </Text>
            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoLarge} />
                <TouchableOpacity onPress={handleTakePhoto} style={styles.retakeBtn}>
                  <Text style={[typography.label, { color: colors.primary }]}>Yeniden Çek</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.photoBox, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={48} color={colors.textSecondary} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>Fotoğraf Çek</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: spacing.xl }]} onPress={confirmPhoto} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Devam Et</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Step 2: Signature */}
        {stepNormal === 2 && (
          <View style={styles.sigContainer}>
            <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginVertical: spacing.md }]}>Alıcı İmzası</Text>
            {submitting ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>Teslimat belgesi oluşturuluyor...</Text>
              </View>
            ) : (
              <SignaturePad
                onOK={handleSignatureOK}
                onEmpty={() => Alert.alert('Uyarı', 'Lütfen imza atın.')}
                descriptionText="Lütfen teslim aldığınıza dair imzanızı atın."
              />
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Render: Damage Flow ───────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title="Hasarlı / Eksik Teslimat" onBack={handleBack} colors={colors} />
      <StepIndicator total={3} current={stepDamage} colors={colors} overrideColor="#EF4444" />

      {/* Damage Step 0: Type Selection */}
      {stepDamage === 0 && (
        <ScrollView contentContainerStyle={styles.damageStepScroll}>
          <Ionicons name="warning" size={56} color="#EF4444" style={styles.stepIcon} />
          <Text style={[typography.h2, { color: colors.text }]}>Hasar / Eksiklik Türü</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            Aşağıdakilerden uygun olanları seçin (birden fazla seçilebilir).
          </Text>
          <View style={styles.chipGrid}>
            {DAMAGE_TYPE_OPTIONS.map((opt) => {
              const selected = damageTypes.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? opt.color + '18' : colors.card,
                      borderColor: selected ? opt.color : colors.border,
                    },
                  ]}
                  onPress={() => toggleDamageType(opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon} size={22} color={selected ? opt.color : colors.textSecondary} />
                  <Text style={[typography.label, { color: selected ? opt.color : colors.text, marginLeft: spacing.sm }]}>
                    {opt.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={opt.color} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#EF4444', marginTop: spacing.xl }]}
            onPress={confirmDamageStep1}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Devam Et</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Damage Step 1: Multi-Photo */}
      {stepDamage === 1 && (
        <ScrollView contentContainerStyle={styles.damageStepScroll}>
          <Ionicons name="camera" size={56} color="#EF4444" style={styles.stepIcon} />
          <Text style={[typography.h2, { color: colors.text }]}>Hasar Fotoğrafları</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            Hasarlı/eksik ürünlerin fotoğraflarını çekin. En fazla {MAX_PHOTOS} adet.
          </Text>
          <View style={styles.photoGrid}>
            {damagePhotos.map((uri, i) => (
              <View key={i} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeDamagePhoto(i)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {damagePhotos.length < MAX_PHOTOS && (
              <TouchableOpacity
                style={[styles.addPhotoBox, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={handleTakeDamagePhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={36} color={colors.textSecondary} />
                <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                  {damagePhotos.length === 0 ? 'Fotoğraf Ekle' : `${damagePhotos.length}/${MAX_PHOTOS}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#EF4444', marginTop: spacing.xl }]}
            onPress={confirmDamageStep2}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Devam Et</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Damage Step 2: Note & Submit */}
      {stepDamage === 2 && (
        <ScrollView contentContainerStyle={styles.damageStepScroll} keyboardShouldPersistTaps="handled">
          <Ionicons name="create-outline" size={56} color="#EF4444" style={styles.stepIcon} />
          <Text style={[typography.h2, { color: colors.text }]}>Açıklama</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            Hasar veya eksiklikle ilgili kısa bir açıklama yazın. Bu not operasyon ekibi ve alıcı tarafından görülecektir.
          </Text>

          {/* Summary Card */}
          <Card accentColor="#EF4444" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="flag" size={18} color="#EF4444" />
              <Text style={[typography.label, { color: colors.text, marginLeft: spacing.sm }]}>
                Seçilen türler: {damageTypes.map((t) => DAMAGE_TYPE_OPTIONS.find((o) => o.key === t)?.label).join(', ')}
              </Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
              <Ionicons name="images" size={18} color="#EF4444" />
              <Text style={[typography.label, { color: colors.text, marginLeft: spacing.sm }]}>
                {damagePhotos.length} adet fotoğraf eklendi
              </Text>
            </View>
          </Card>

          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Hasar/eksiklik açıklaması yazın..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={driverNote}
            onChangeText={setDriverNote}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#EF4444', marginTop: spacing.xl }]}
            onPress={submitDamageReport}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Hasar Bildirimi Gönder</Text>
            )}
          </TouchableOpacity>
          <Text style={[typography.small, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md }]}>
            Bu işlem dispute kaydı oluşturacak ve escrow ödemesi bloke edilecektir.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ── Sub-components ──────────────────────────

function Header({ title, onBack, colors }: { title: string; onBack: () => void; colors: any }) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <View style={[styles.backPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={20} color="#FF6B00" />
        </View>
      </TouchableOpacity>
      <Text style={[typography.h3, { color: colors.text }]}>{title}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

function StepIndicator({
  total,
  current,
  colors,
  overrideColor,
}: {
  total: number;
  current: number;
  colors: any;
  overrideColor?: string;
}) {
  const activeColor = overrideColor || colors.primary;
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <View
            style={[
              styles.stepDot,
              { backgroundColor: i <= current ? activeColor : colors.border },
            ]}
          />
          {i < total - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: i < current ? activeColor : colors.border },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Styles ──────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  backPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },

  // Mode selection
  modeContainer: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  modeCard: { marginBottom: spacing.lg },
  modeInner: { alignItems: 'center', paddingVertical: spacing.xl },
  modeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },

  // Step content
  stepCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  stepScroll: { alignItems: 'center', padding: spacing.xl },
  stepIcon: { marginBottom: spacing.md },

  // Buttons
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', ...typography.button },

  // Photo
  photoBox: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreviewWrap: { width: '100%', alignItems: 'center' as const },
  photoLarge: { width: '100%', height: 300, borderRadius: radius.md, resizeMode: 'cover' as const },
  retakeBtn: { marginTop: spacing.md, padding: spacing.sm },

  // Signature
  sigContainer: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Damage flow
  damageStepScroll: { alignItems: 'center', padding: spacing.xl, paddingBottom: spacing['3xl'] },

  // Chips
  chipGrid: { width: '100%', marginTop: spacing.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    minHeight: 52,
  },

  // Damage photo grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 100, height: 100, borderRadius: radius.md },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: radius.round },
  addPhotoBox: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary
  summaryCard: { width: '100%', marginTop: spacing.xl },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },

  // Note input
  noteInput: {
    width: '100%',
    minHeight: 120,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...typography.body,
  },
});

export default DeliveryProofScreen;
