import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useAuthStore, UIRole } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';
import BottomSheet from '../components/shared/BottomSheet';
import { PhoneInput, isValidPhone, formatPhone } from '../components/shared/PhoneInput';

interface RoleCardData {
  id: UIRole;
  icon: string;
  title: string;
  description: string;
  authoritySummary: string;
}

const ROLE_CARDS: RoleCardData[] = [
  {
    id: 'FIRMA',
    icon: '🏢',
    title: 'Firma / Yük Sahibi',
    description: 'Yük oluşturabilen, taşıma talebi yayınlayabilen kurumsal kullanıcı.',
    authoritySummary: 'Yük ilanı • Teklif alma • E-İrsaliye • Escrow • QR teslim',
  },
  {
    id: 'TASIYICI',
    icon: '🚛',
    title: 'Taşıyıcı / Sürücü',
    description: 'Yük taşıyan, taşıma operasyonunu gerçekleştiren sürücü veya nakliyeci.',
    authoritySummary: 'Yük bulma • Teklif verme • GPS takip • E-Fatura • Cüzdan',
  },
  {
    id: 'ISLETME',
    icon: '🏪',
    title: 'İşletme Sahibi',
    description: 'Lokanta, akaryakıt istasyonu veya yol üzeri ticari nokta kaydı yapan işletme.',
    authoritySummary: 'İşletme yönetimi • Fiyat güncelleme • Kampanya • Yorumlar',
  },
  {
    id: 'GENEL',
    icon: '👤',
    title: 'Genel Kullanıcı',
    description: 'Platformu genel kullanan, alış/satış yapan, ilan yayınlayan standart üye.',
    authoritySummary: 'Marketplace • Finans • Harita • İlan verme • Escrow',
  },
];

const STEP_LABELS = ['Rol Seçimi', 'Bilgiler', 'Rol Detayı', 'Doğrulama'];

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { login, register, verifyOtp, resendOtp, kvkkText, continueAsGuest } = useAuthStore();

  // Tab state
  const [isRegister, setIsRegister] = useState(false);

  // Registration step
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UIRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [showKvkkSheet, setShowKvkkSheet] = useState(false);

  // Step 3 - Role-specific fields
  const [companyTitle, setCompanyTitle] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [taxOfficeName, setTaxOfficeName] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [srcBelgesi, setSrcBelgesi] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const otpRef = useRef<TextInput>(null);

  const shadowStyle = {
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.35 : 0.20,
    shadowRadius: 3.5,
    elevation: 4,
  };

  const activeGlowStyle = {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  };

  // Reset registration state
  const resetRegister = () => {
    setStep(1);
    setSelectedRole(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setKvkkAccepted(false);
    setCompanyTitle('');
    setTaxNo('');
    setTaxOfficeName('');
    setAuthorizedPerson('');
    setLicenseType('');
    setVehicleType('');
    setPlateNumber('');
    setSrcBelgesi('');
    setBusinessType('');
    setBusinessAddress('');
    setInviteCode('');
    setOtpCode('');
    setPendingUserId(null);
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      hapticError();
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }
    if (!password) {
      hapticError();
      Alert.alert('Hata', 'Lütfen şifrenizi girin.');
      return;
    }
    setAuthLoading(true);
    try {
      await login(email.trim(), password);
      hapticSuccess();
    } catch (err: any) {
      hapticError();
      const msg = err.response?.data?.message || err.message || 'Giriş yapılırken bir hata oluştu.';
      Alert.alert('Hata', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const validateStep1 = (): boolean => {
    if (!selectedRole) {
      hapticError();
      Alert.alert('Rol Seçimi', 'Lütfen bir kullanıcı rolü seçin.');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!fullName.trim()) {
      hapticError();
      Alert.alert('Eksik Bilgi', 'Lütfen ad soyad girin.');
      return false;
    }
    if (!isValidPhone(phone)) {
      hapticError();
      Alert.alert('Geçersiz Telefon', 'Telefon numarası 0(5xx) xxx xx xx formatında olmalıdır.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      hapticError();
      Alert.alert('Eksik Bilgi', 'Lütfen geçerli bir e-posta adresi girin.');
      return false;
    }
    if (!password.trim() || password.length < 3) {
      hapticError();
      Alert.alert('Eksik Bilgi', 'Lütfen en az 3 karakterli bir şifre belirleyin.');
      return false;
    }
    if (!kvkkAccepted) {
      hapticError();
      Alert.alert('KVKK Onayı', 'Devam etmek için KVKK ve Gizlilik Sözleşmesi\'ni onaylamanız gerekmektedir.');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (selectedRole === 'FIRMA') {
      if (!companyTitle.trim()) {
        hapticError();
        Alert.alert('Eksik Bilgi', 'Lütfen firma unvanı girin.');
        return false;
      }
    }
    if (selectedRole === 'TASIYICI') {
      if (!plateNumber.trim()) {
        hapticError();
        Alert.alert('Eksik Bilgi', 'Lütfen plaka numarası girin.');
        return false;
      }
    }
    if (selectedRole === 'ISLETME') {
      if (!businessType.trim()) {
        hapticError();
        Alert.alert('Eksik Bilgi', 'Lütfen işletme tipi seçin.');
        return false;
      }
    }
    return true;
  };

  const handleRegisterSubmit = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const result = await register({
        email: email.trim(),
        phone: phone.trim(),
        password,
        fullName: fullName.trim(),
        uiRole: selectedRole!,
        kvkkAccepted,
        termsAccepted: true,
        // FIRMA
        companyTitle: companyTitle.trim() || undefined,
        taxNo: taxNo.trim() || undefined,
        taxOfficeName: taxOfficeName.trim() || undefined,
        authorizedPerson: authorizedPerson.trim() || undefined,
        // TASIYICI
        licenseType: licenseType.trim() || undefined,
        vehicleType: vehicleType.trim() || undefined,
        plateNumber: plateNumber.trim() || undefined,
        srcBelgesi: srcBelgesi.trim() || undefined,
        // ISLETME
        businessType: businessType.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        // GENEL
        inviteCode: selectedRole === 'GENEL' ? inviteCode.trim() || undefined : undefined,
      });

      hapticSuccess();
      setPendingUserId(result.userId);
      setStep(4);
      setTimeout(() => otpRef.current?.focus(), 400);
    } catch (err: any) {
      hapticError();
      const msg = err.response?.data?.message || err.message || 'Kayıt oluşturulurken bir hata oluştu.';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 4) {
      hapticError();
      Alert.alert('Eksik Kod', 'Lütfen telefonunuza gelen doğrulama kodunu girin.');
      return;
    }
    if (!pendingUserId) return;

    setAuthLoading(true);
    try {
      await verifyOtp(pendingUserId, otpCode.trim());
      hapticSuccess();
      // User is now authenticated — navigation will auto-switch to MainTabs
    } catch (err: any) {
      hapticError();
      const msg = err.response?.data?.message || err.message || 'Doğrulama kodu hatalı.';
      Alert.alert('Hata', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUserId) return;
    try {
      await resendOtp(pendingUserId);
      hapticLight();
      Alert.alert('Başarılı', 'Doğrulama kodu tekrar gönderildi.');
    } catch {
      hapticError();
      Alert.alert('Hata', 'Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const goToStep = (targetStep: number) => {
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }
    if (targetStep === 2 && validateStep1()) {
      hapticLight();
      setStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (targetStep === 3 && validateStep2()) {
      hapticLight();
      setStep(3);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const switchToRegister = (val: boolean) => {
    hapticLight();
    setIsRegister(val);
    resetRegister();
  };

  const renderStepIndicator = () => {
    if (!isRegister) return null;
    return (
      <View style={styles.stepIndicator}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          const isClickable = stepNum < step;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => isClickable && goToStep(stepNum)}
              style={styles.stepItem}
              activeOpacity={isClickable ? 0.7 : 1}
              disabled={!isClickable}
            >
              <View style={[
                styles.stepDot,
                {
                  backgroundColor: isActive ? colors.primary : isCompleted ? colors.primary : colors.border,
                  borderColor: isActive ? colors.primary : colors.border,
                  opacity: stepNum > step + 1 ? 0.4 : 1,
                },
              ]}>
                {isCompleted ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : (
                  <Text style={[styles.stepNum, { color: isActive ? '#FFF' : colors.textTertiary }]}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                { color: isActive ? colors.primary : colors.textTertiary },
              ]}>
                {label}
              </Text>
              {i < STEP_LABELS.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: isCompleted ? colors.primary : colors.border }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderRoleCard = (role: RoleCardData) => {
    const isActive = selectedRole === role.id;
    return (
      <TouchableOpacity
        key={role.id}
        onPress={() => { hapticLight(); setSelectedRole(role.id); }}
        activeOpacity={0.8}
        style={[
          styles.roleCard,
          {
            backgroundColor: colors.card,
            borderColor: isActive ? colors.primary : colors.border,
          },
          shadowStyle,
          isActive && activeGlowStyle,
          isActive && { backgroundColor: colors.card },
        ]}
      >
        <View style={styles.roleCardInner}>
          {/* Left accent bar for active role */}
          {isActive && <View style={[styles.roleAccent, { backgroundColor: colors.primary }]} />}

          <View style={[styles.roleCardContent, isActive && { paddingLeft: spacing.md }]}>
            <View style={styles.roleCardHeader}>
              <Text style={styles.roleIcon}>{role.icon}</Text>
              <View style={styles.roleCardTitleArea}>
                <Text style={[typography.h3, { color: colors.text, fontWeight: '700', fontSize: 15 }]}>
                  {role.title}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, lineHeight: 16 }]}>
                  {role.description}
                </Text>
              </View>
              {isActive && (
                <View style={styles.roleCheck}>
                  <Text style={styles.roleCheckIcon}>✓</Text>
                </View>
              )}
            </View>

            {isActive && (
              <View style={[styles.roleBadgeRow, { backgroundColor: colors.primary + '12' }]}>
                <Text style={[typography.small, { color: colors.primary, fontWeight: '600', fontSize: 11 }]}>
                  {role.authoritySummary}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLoginTab = () => (
    <>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        E-Posta Adresi
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="ornek@email.com"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>
        Şifre
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="******"
        placeholderTextColor={colors.textTertiary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
        onPress={handleLogin}
        disabled={authLoading}
      >
        {authLoading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={[typography.label, { color: colors.white, fontWeight: '800' }]}>Giriş Yap</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderStep1 = () => (
    <>
      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
        Hesap türünüzü seçerek platform deneyiminizi kişiselleştirin.
      </Text>
      {ROLE_CARDS.map(renderRoleCard)}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: spacing.lg }]}
        onPress={() => goToStep(2)}
      >
        <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Devam Et →</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
        {ROLE_CARDS.find(r => r.id === selectedRole)?.icon}{' '}
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {ROLE_CARDS.find(r => r.id === selectedRole)?.title}
        </Text>
        {' '}— Temel bilgilerinizi girin.
      </Text>

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Ad Soyad</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Ad Soyad"
        placeholderTextColor={colors.textTertiary}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Telefon Numarası</Text>
      <PhoneInput
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>E-Posta Adresi</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="ornek@email.com"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Şifre</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="En az 3 karakter"
        placeholderTextColor={colors.textTertiary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* KVKK */}
      <View style={styles.kvkkRow}>
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: colors.border, backgroundColor: kvkkAccepted ? colors.primary : 'transparent' }]}
          onPress={() => { hapticLight(); setKvkkAccepted(!kvkkAccepted); }}
        >
          {kvkkAccepted && <Text style={{ color: colors.white, fontSize: 10, fontWeight: '900' }}>✓</Text>}
        </TouchableOpacity>
        <Text style={[typography.caption, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Kullanıcı kaydı oluşturarak{' '}
          <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontWeight: '700' }} onPress={() => setShowKvkkSheet(true)}>
            KVKK ve Gizlilik Sözleşmesi
          </Text>
          'ni okuduğumu ve onayladığımı kabul ediyorum.
        </Text>
      </View>

      <View style={styles.stepNavRow}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={() => goToStep(1)}
        >
          <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>← Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 2 }]}
          onPress={() => goToStep(3)}
        >
          <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Devam Et →</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep3 = () => {
    if (!selectedRole) return null;

    return (
      <>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Rolünüze özel ek bilgileri tamamlayın.
        </Text>

        {/* FIRMA-specific fields */}
        {selectedRole === 'FIRMA' && (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Firma Unvanı *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Firma unvanı"
              placeholderTextColor={colors.textTertiary}
              value={companyTitle}
              onChangeText={setCompanyTitle}
            />
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>Vergi Numarası</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Vergi no"
              placeholderTextColor={colors.textTertiary}
              value={taxNo}
              onChangeText={setTaxNo}
              keyboardType="number-pad"
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Vergi Dairesi</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Vergi dairesi"
                  placeholderTextColor={colors.textTertiary}
                  value={taxOfficeName}
                  onChangeText={setTaxOfficeName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Yetkili Kişi</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Yetkili ad soyad"
                  placeholderTextColor={colors.textTertiary}
                  value={authorizedPerson}
                  onChangeText={setAuthorizedPerson}
                />
              </View>
            </View>
          </>
        )}

        {/* TASIYICI-specific fields */}
        {selectedRole === 'TASIYICI' && (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Ehliyet Tipi</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="B, C, E"
                  placeholderTextColor={colors.textTertiary}
                  value={licenseType}
                  onChangeText={setLicenseType}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Araç Tipi</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="Tır, kamyon"
                  placeholderTextColor={colors.textTertiary}
                  value={vehicleType}
                  onChangeText={setVehicleType}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Plaka *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="34 ABC 123"
                  placeholderTextColor={colors.textTertiary}
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>SRC Belgesi</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="SRC no"
                  placeholderTextColor={colors.textTertiary}
                  value={srcBelgesi}
                  onChangeText={setSrcBelgesi}
                />
              </View>
            </View>
          </>
        )}

        {/* ISLETME-specific fields */}
        {selectedRole === 'ISLETME' && (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>İşletme Tipi *</Text>
            <View style={styles.businessTypeRow}>
              {['Lokanta', 'Akaryakıt', 'Kafe', 'Motel', 'Lastikçi', 'Servis', 'Market', 'Diger'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.businessTypeChip,
                    { borderColor: colors.border },
                    businessType === type && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => { hapticLight(); setBusinessType(businessType === type ? '' : type); }}
                >
                  <Text style={[typography.small, { color: businessType === type ? colors.primary : colors.text, fontWeight: businessType === type ? '700' : '500' }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }]}>İşletme Adresi</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="İl/ilçe, açık adres"
              placeholderTextColor={colors.textTertiary}
              value={businessAddress}
              onChangeText={setBusinessAddress}
            />
          </>
        )}

        {/* GENEL-specific fields */}
        {selectedRole === 'GENEL' && (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Davet Kodu (varsa)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.primary, borderStyle: 'dashed' }]}
              placeholder="Örn: KPTN100"
              placeholderTextColor={colors.textTertiary}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
              Davet kodu girerek bütçe ve analiz modülünü anında ücretsiz kullanabilirsiniz.
            </Text>
          </>
        )}

        <View style={styles.stepNavRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => goToStep(2)}
          >
            <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>← Geri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 2 }]}
            onPress={handleRegisterSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderStep4 = () => (
    <>
      <View style={styles.otpContainer}>
        <Text style={[typography.h3, { color: colors.primary, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm }]}>
          📱 Telefon Doğrulama
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{formatPhone(phone)}</Text> adresine gönderilen{'\n'}doğrulama kodunu girin.
        </Text>

        <TextInput
          ref={otpRef}
          style={[styles.otpInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.primary }]}
          placeholder="000000"
          placeholderTextColor={colors.textTertiary}
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleVerifyOtp}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>Doğrula</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' }}
          onPress={handleResendOtp}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            Kod gelmedi mi? Yeniden gönder
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderRegisterForm = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={[typography.display, { color: colors.primary, textAlign: 'center', fontWeight: '800', fontSize: 30 }]}>
            KAPTAN
          </Text>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
            Lojistik & Taşıyıcı Platformu
          </Text>
        </View>

        <View style={[styles.card, shadowStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Tabs */}
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tabBtn, !isRegister && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
              onPress={() => switchToRegister(false)}
            >
              <Text style={[typography.h3, { color: !isRegister ? colors.primary : colors.textTertiary, fontWeight: '700' }]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, isRegister && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
              onPress={() => switchToRegister(true)}
            >
              <Text style={[typography.h3, { color: isRegister ? colors.primary : colors.textTertiary, fontWeight: '700' }]}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>

          {/* Step Indicator (register only) */}
          {renderStepIndicator()}

          {/* Form content */}
          <View style={styles.form}>
            {!isRegister ? renderLoginTab() : renderRegisterForm()}
          </View>

          {/* Guest button — only show on login tab or step 1 of register */}
          {(!isRegister || (isRegister && step === 1)) && (
            <TouchableOpacity
              style={[styles.guestBtn, { borderColor: colors.primary }]}
              onPress={() => { hapticLight(); continueAsGuest(); }}
              activeOpacity={0.8}
            >
              <Text style={[typography.label, { color: colors.primary, fontWeight: '800' }]}>
                Misafir Olarak Devam Et
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* KVKK Bottom Sheet */}
      <BottomSheet visible={showKvkkSheet} onClose={() => setShowKvkkSheet(false)}>
        <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md, fontWeight: '800' }]}>
          KVKK ve Gizlilik Sözleşmesi
        </Text>
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={true}>
          <Text style={[typography.body, { color: colors.text, paddingBottom: spacing.xl, lineHeight: 22 }]}>
            {kvkkText}
          </Text>
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: spacing.xl,
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCheck: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    right: -8,
    width: '100%',
    height: 2,
    zIndex: -1,
  },

  // Role Cards
  roleCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  roleCardInner: {
    flexDirection: 'row',
  },
  roleAccent: {
    width: 4,
  },
  roleCardContent: {
    flex: 1,
    padding: spacing.md,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  roleIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  roleCardTitleArea: {
    flex: 1,
  },
  roleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCheckIcon: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  roleBadgeRow: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },

  // Form
  form: {
    gap: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    minHeight: 44,
  },
  kvkkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.md,
  },
  secondaryBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1.5,
    flex: 1,
  },
  stepNavRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  guestBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    borderWidth: 1.5,
  },
  sheetScroll: { maxHeight: 400, paddingVertical: spacing.md },

  // Business type chips
  businessTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  businessTypeChip: {
    borderWidth: 1,
    borderRadius: radius.pill || 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
  },

  // OTP
  otpContainer: {
    paddingVertical: spacing.md,
  },
  otpInput: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 24,
    minHeight: 56,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
});
