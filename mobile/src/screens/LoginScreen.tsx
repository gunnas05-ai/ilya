import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useAuthStore, UIRole } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';
import { apiClient } from '../services/api';
import { showToast } from '../utils/toast';
import BottomSheet from '../components/shared/BottomSheet';
import { PhoneInput, isValidPhone, formatPhone } from '../components/shared/PhoneInput';
import {
  loginSchema, step1Schema, step2Schema, otpSchema,
  step3FirmaSchema, step3TasiyiciSchema, step3IsletmeSchema,
  type LoginFormData, type Step2FormData,
} from '../validations/authSchema';

interface RoleCardData {
  id: UIRole;
  icon: string;
  title: string;
  description: string;
  authoritySummary: string;
}

const ROLE_CARDS: RoleCardData[] = [
  { id: 'FIRMA', icon: '🏢', title: 'Firma / Yük Sahibi', description: 'Yük oluşturabilen, taşıma talebi yayınlayabilen kurumsal kullanıcı.', authoritySummary: 'Yük ilanı • Teklif alma • E-İrsaliye • Escrow • QR teslim' },
  { id: 'TASIYICI', icon: '🚛', title: 'Taşıyıcı / Sürücü', description: 'Yük taşıyan, taşıma operasyonunu gerçekleştiren sürücü veya nakliyeci.', authoritySummary: 'Yük bulma • Teklif verme • GPS takip • E-Fatura • Cüzdan' },
  { id: 'ISLETME', icon: '🏪', title: 'İşletme Sahibi', description: 'Lokanta, akaryakıt istasyonu veya yol üzeri ticari nokta kaydı yapan işletme.', authoritySummary: 'İşletme yönetimi • Fiyat güncelleme • Kampanya • Yorumlar' },
  { id: 'GENEL', icon: '👤', title: 'Genel Kullanıcı', description: 'Platformu genel kullanan, alış/satış yapan, ilan yayınlayan standart üye.', authoritySummary: 'Marketplace • Finans • Harita • İlan verme • Escrow' },
];

const STEP_LABELS = ['Rol Seçimi', 'Bilgiler', 'Rol Detayı', 'Doğrulama'];

// ── Login Form ──────────────────────────────────────────

function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { colors, isDark } = useTheme();
  const { login, continueAsGuest } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(false);
  const [voiceLoginMsg, setVoiceLoginMsg] = useState('');
  const [voiceLoginActive, setVoiceLoginActive] = useState(false);

  const { control, handleSubmit, setValue: setLoginValue, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Sesli giriş
  const startVoiceLogin = async () => {
    if (voiceLoginActive) return;
    setVoiceLoginActive(true);
    setVoiceLoginMsg('🎤 Dinleniyor... Email ve şifrenizi söyleyin.');
    try {
      const SR = require('expo-speech-recognition');
      if (SR?.default) {
        const r = await SR.default.start({ lang: 'tr-TR', interimResults: false });
        const text = r?.[0]?.transcript || '';
        if (text) {
          const em = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          const pw = text.match(/(?:[şs]ifre|parola|pw)\s*:?\s*(\S+)/i);
          if (em) setLoginValue('email', em[0]);
          if (pw) setLoginValue('password', pw[1]);
          setVoiceLoginMsg(em || pw ? '✅ Bilgiler alındı. Giriş yapabilirsiniz.' : '⚠️ Anlaşılamadı. Manuel girin.');
        }
      }
    } catch { setVoiceLoginMsg('⚠️ Ses tanıma hatası.'); }
    setVoiceLoginActive(false);
  };

  const onSubmit = async (data: LoginFormData) => {
    hapticLight();
    setAuthLoading(true);
    try {
      await login(data.email.trim(), data.password);
      hapticSuccess();
    } catch (err: any) {
      hapticError();
      showToast(err.response?.data?.message || err.message || 'Giriş yapılırken bir hata oluştu.', 'error');
    } finally { setAuthLoading(false); }
  };

  return (
    <View>
      <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' }]}>Giriş Yap</Text>

      {/* Sesli Giriş */}
      <TouchableOpacity style={[s.voiceBtnSm, { backgroundColor: voiceLoginActive ? '#EF4444' : colors.primary + '20', borderColor: colors.primary + '40' }]} onPress={startVoiceLogin} disabled={voiceLoginActive}>
        <Text style={{ fontSize: 16 }}>{voiceLoginActive ? '🔴' : '🎤'}</Text>
        <Text style={[s.voiceBtnTextSm, { color: voiceLoginActive ? '#EF4444' : colors.primary }]}>Sesli Giriş</Text>
      </TouchableOpacity>
      {voiceLoginMsg ? <Text style={[s.voiceMsgSmall, { color: voiceLoginMsg.startsWith('✅') ? '#10B981' : '#EF4444' }]}>{voiceLoginMsg}</Text> : null}

      <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.inputGroup}>
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>E-posta</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.email ? colors.danger : colors.border }]} placeholder="ornek@mail.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" onBlur={onBlur} onChangeText={onChange} value={value} />
          {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.inputGroup}>
          <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Şifre</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: errors.password ? colors.danger : colors.border }]} placeholder="••••••" placeholderTextColor={colors.textTertiary} secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} />
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
        </View>
      )} />

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: authLoading ? 0.7 : 1 }]} onPress={handleSubmit(onSubmit)} disabled={authLoading} activeOpacity={0.85}>
        {authLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Giriş Yap</Text>}
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.lg }}>
        <TouchableOpacity onPress={onSwitchToRegister}><Text style={[typography.body, { color: colors.primary, fontWeight: '700' }]}>Kayıt Ol</Text></TouchableOpacity>
        <TouchableOpacity onPress={continueAsGuest}><Text style={[typography.body, { color: colors.textTertiary, fontWeight: '600' }]}>Misafir Olarak Devam Et</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ── Register Wizard ─────────────────────────────────────

function RegisterWizard({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { colors, isDark } = useTheme();
  const { register, verifyOtp, resendOtp, kvkkText } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showKvkkSheet, setShowKvkkSheet] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const otpRef = useRef<TextInput>(null);

  // Sesli kayıt — konuşmayı dinle ve formu doldur
  const startVoiceRegistration = async () => {
    if (voiceProcessing) return;
    setVoiceActive(true);
    setVoiceListening(true);
    setVoiceMsg('🎤 Dinleniyor... Rolünüzü, adınızı, telefon ve email bilgilerinizi söyleyin.');
    hapticLight();

    try {
      const SpeechRecognition = require('expo-speech-recognition');
      if (SpeechRecognition?.default) {
        const result = await SpeechRecognition.default.start({ lang: 'tr-TR', interimResults: false });
        const text = result?.[0]?.transcript || '';
        if (text.trim()) {
          setVoiceListening(false);
          setVoiceProcessing(true);
          setVoiceMsg('⏳ Bilgiler analiz ediliyor...');
          await processVoiceRegData(text);
        } else {
          setVoiceMsg('⚠️ Ses algılanamadı. Lütfen tekrar deneyin veya manuel giriş yapın.');
          setVoiceListening(false);
        }
      } else {
        setVoiceMsg('⚠️ Ses tanıma kullanılamıyor. Lütfen manuel giriş yapın.');
        setVoiceListening(false);
      }
    } catch {
      setVoiceMsg('⚠️ Ses tanıma hatası. Lütfen manuel giriş yapın.');
      setVoiceListening(false);
    }
  };

  // Ses verisini analiz et ve form alanlarını doldur
  const processVoiceRegData = async (text: string) => {
    try {
      const res = await apiClient.post('/voice/ai-dialog', { message: text, context: { conversationState: 'REGISTRATION', collected: {} } });
      const data = res.data?.data?.data || res.data?.data || res.data || {};
      const fields = data.params?.collected || data.extracted || {};
      const response = data.response || '';

      // Form alanlarını doldur
      if (fields.role && ['FIRMA','TASIYICI','ISLETME','GENEL'].includes(fields.role)) {
        setRole('selectedRole', fields.role as UIRole, { shouldValidate: true });
      }
      if (fields.fullName) setC2Value('fullName', fields.fullName);
      if (fields.phone) setC2Value('phone', fields.phone);
      if (fields.email) setC2Value('email', fields.email);
      if (fields.password) setC2Value('password', fields.password);
      if (fields.companyTitle) firmaForm.setValue('companyTitle', fields.companyTitle);
      if (fields.licenseType) tasiyiciForm.setValue('licenseType', fields.licenseType);

      // Eksik bilgileri kontrol et
      const missing: string[] = [];
      if (!fields.fullName) missing.push('ad soyad');
      if (!fields.phone) missing.push('telefon');
      if (!fields.email) missing.push('email');

      if (missing.length > 0) {
        setVoiceMsg(`📝 ${response || 'Bazı bilgiler eksik: ' + missing.join(', ')}. 2 saniye sonra tekrar dinleyeceğim...`);
        setVoiceProcessing(false);
        // 2 saniye sonra otomatik tekrar dinle
        setTimeout(() => { startVoiceRegistration(); }, 2500);
      } else {
        setVoiceMsg(`✅ ${response || 'Bilgiler alındı! Devam edebilirsiniz.'}`);
        setVoiceProcessing(false);
        hapticSuccess();
        // Otomatik step 2'ye geç
        if (step === 1 && selectedRole) setStep(2);
        setTimeout(() => setVoiceMsg(''), 3000);
      }
    } catch {
      setVoiceMsg('⚠️ Analiz hatası. Lütfen manuel giriş yapın.');
      setVoiceProcessing(false);
    }
  };

  // Step 1: Role selection
  const { control: c1, watch: w1, setValue: setRole, formState: { errors: e1 } } = useForm({ resolver: zodResolver(step1Schema), defaultValues: { selectedRole: undefined as UIRole | undefined } });
  const selectedRole = w1('selectedRole');

  // Step 2: Common info
  const { control: c2, handleSubmit: hs2, setValue: setC2Value, formState: { errors: e2 } } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: { fullName: '', phone: '', email: '', password: '', kvkkAccepted: false as any },
  });

  // Step 3 role-specific fields
  const firmaForm = useForm({ resolver: zodResolver(step3FirmaSchema), defaultValues: { companyTitle: '', taxNo: '', taxOfficeName: '', authorizedPerson: '' } });
  const tasiyiciForm = useForm({ resolver: zodResolver(step3TasiyiciSchema), defaultValues: { licenseType: '', vehicleType: '', plateNumber: '', srcBelgesi: '' } });
  const isletmeForm = useForm({ resolver: zodResolver(step3IsletmeSchema), defaultValues: { businessType: '', businessAddress: '' } });
  const genelForm = useForm({ defaultValues: { inviteCode: '' } });

  // OTP
  const { control: otpControl, handleSubmit: hsOtp, formState: { errors: otpErrors } } = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otpCode: '' } });

  const goToStep = (target: number) => {
    if (target === 2 && selectedRole) { hapticLight(); setStep(2); }
    else if (target === 3) {
      hs2((data) => { hapticLight(); setStep(3); })();
    }
  };

  const handleRegister = async () => {
    // Build payload from all steps
    const s2 = hs2;
    const s2Data: any = {};
    // We need to collect all form data. Since useForm doesn't expose values easily across forms,
    // we use a combined approach: validate step 2, then manually collect step 3 fields.

    // Validate step 2
    let step2Valid = false;
    let step2Data: any = {};
    await hs2((d) => { step2Valid = true; step2Data = d; })();
    if (!step2Valid) return;

    // Validate step 3 based on role
    let step3Data: any = {};
    if (selectedRole === 'FIRMA') {
      const { control: _, ...rest } = firmaForm;
      let valid = false;
      await firmaForm.handleSubmit((d) => { valid = true; step3Data = d; })();
      if (!valid) return;
    } else if (selectedRole === 'TASIYICI') {
      let valid = false;
      await tasiyiciForm.handleSubmit((d) => { valid = true; step3Data = d; })();
      if (!valid) return;
    } else if (selectedRole === 'ISLETME') {
      let valid = false;
      await isletmeForm.handleSubmit((d) => { valid = true; step3Data = d; })();
      if (!valid) return;
    } else {
      step3Data = genelForm.getValues();
    }

    setLoading(true);
    try {
      const result = await register({
        email: step2Data.email.trim().toLowerCase(),
        phone: step2Data.phone,
        password: step2Data.password,
        fullName: step2Data.fullName,
        uiRole: selectedRole!,
        kvkkAccepted: true,
        termsAccepted: true,
        ...step3Data,
      });
      hapticSuccess();
      setPendingUserId(result.userId);
      setStep(4);
      setTimeout(() => otpRef.current?.focus(), 400);
    } catch (err: any) {
      hapticError();
      showToast(err.response?.data?.message || err.message || 'Kayıt oluşturulurken bir hata oluştu.', 'error');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    let otpData: any = {};
    let valid = false;
    await hsOtp((d) => { valid = true; otpData = d; })();
    if (!valid || !pendingUserId) return;

    setAuthLoading(true);
    try {
      await verifyOtp(pendingUserId, otpData.otpCode.trim());
      hapticSuccess();
    } catch (err: any) {
      hapticError();
      showToast(err.response?.data?.message || err.message || 'Doğrulama kodu hatalı.', 'error');
    } finally { setAuthLoading(false); }
  };

  const handleResend = async () => {
    if (!pendingUserId) return;
    try { await resendOtp(pendingUserId); hapticLight(); showToast('Doğrulama kodu tekrar gönderildi.', 'success'); }
    catch { hapticError(); showToast('Kod gönderilemedi.', 'error'); }
  };

  // ── Render ──
  const inputStyle = (hasError: boolean) => [styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: hasError ? colors.danger : colors.border }] as const;

  return (
    <View>
      {/* Sesli Kayıt Butonu */}
      <TouchableOpacity
        style={[s.voiceBtn, { backgroundColor: voiceListening ? '#EF4444' : voiceProcessing ? '#F59E0B' : voiceActive ? '#10B981' : colors.primary, opacity: voiceProcessing ? 0.8 : 1 }]}
        onPress={startVoiceRegistration}
        disabled={voiceListening || voiceProcessing}
        activeOpacity={0.8}
      >
        <Text style={s.voiceBtnIcon}>{voiceListening ? '🔴' : voiceProcessing ? '⏳' : '🎤'}</Text>
        <Text style={s.voiceBtnText}>
          {voiceListening ? 'Dinleniyor...' : voiceProcessing ? 'İşleniyor...' : 'Sesli Kayıt'}
        </Text>
      </TouchableOpacity>

      {/* Sesli kayıt mesajı */}
      {voiceMsg ? (
        <View style={[s.voiceMsgBox, { backgroundColor: voiceMsg.startsWith('✅') ? '#10B98115' : voiceMsg.startsWith('⚠️') ? '#EF444415' : '#FF6B0015', borderColor: voiceMsg.startsWith('✅') ? '#10B981' : voiceMsg.startsWith('⚠️') ? '#EF4444' : '#FF6B00' }]}>
          <Text style={[s.voiceMsgText, { color: voiceMsg.startsWith('✅') ? '#10B981' : voiceMsg.startsWith('⚠️') ? '#EF4444' : '#FF6B00' }]}>{voiceMsg}</Text>
        </View>
      ) : null}

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const active = step === s;
          return (
            <TouchableOpacity key={i} onPress={() => s < step && goToStep(s)} style={styles.stepItem} disabled={s >= step}>
              <View style={[styles.stepDot, { backgroundColor: active ? colors.primary : step > s ? colors.primary : colors.border, opacity: s > step + 1 ? 0.4 : 1 }]}>
                {step > s ? <Text style={styles.stepCheck}>✓</Text> : <Text style={[styles.stepNum, { color: active ? '#FFF' : colors.textTertiary }]}>{s}</Text>}
              </View>
              <Text style={[typography.small, { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '700' : '500', marginTop: 4, fontSize: 10 }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Step 1: Role */}
      {step === 1 && (
        <View>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' }]}>Rolünüzü Seçin</Text>
          {e1.selectedRole && <Text style={styles.fieldErrorCenter}>{e1.selectedRole.message}</Text>}
          {ROLE_CARDS.map((card) => {
            const isActive = selectedRole === card.id;
            return (
              <TouchableOpacity key={card.id} style={[styles.roleCard, { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border }]} onPress={() => setRole('selectedRole', card.id, { shouldValidate: true })} activeOpacity={0.85}>
                <Text style={styles.roleIcon}>{card.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{card.title}</Text>
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: 2 }]}>{card.description}</Text>
                  <Text style={[typography.small, { color: colors.primary, marginTop: 4, fontWeight: '600' }]}>{card.authoritySummary}</Text>
                </View>
                <View style={[styles.radio, { borderColor: isActive ? colors.primary : colors.border }]}>{isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}</View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: selectedRole ? 1 : 0.5 }]} onPress={() => goToStep(2)} disabled={!selectedRole}>
            <Text style={styles.primaryBtnText}>Devam Et</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Common Info */}
      {step === 2 && (
        <View>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg, textAlign: 'center' }]}>Bilgileriniz</Text>
          <Controller control={c2} name="fullName" render={({ field }) => (
            <View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Ad Soyad</Text><TextInput style={inputStyle(!!e2.fullName)} placeholder="Ad Soyad" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />
            {e2.fullName && <Text style={styles.fieldError}>{e2.fullName.message}</Text>}</View>
          )} />
          <Controller control={c2} name="phone" render={({ field }) => (
            <View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Telefon</Text><PhoneInput value={field.value} onChangeText={field.onChange} />
            {e2.phone && <Text style={styles.fieldError}>{e2.phone.message}</Text>}</View>
          )} />
          <Controller control={c2} name="email" render={({ field }) => (
            <View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>E-posta</Text><TextInput style={inputStyle(!!e2.email)} placeholder="ornek@mail.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" onChangeText={field.onChange} value={field.value} />
            {e2.email && <Text style={styles.fieldError}>{e2.email.message}</Text>}</View>
          )} />
          <Controller control={c2} name="password" render={({ field }) => (
            <View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Şifre</Text><TextInput style={inputStyle(!!e2.password)} placeholder="En az 3 karakter" placeholderTextColor={colors.textTertiary} secureTextEntry onChangeText={field.onChange} value={field.value} />
            {e2.password && <Text style={styles.fieldError}>{e2.password.message}</Text>}</View>
          )} />
          <Controller control={c2} name="kvkkAccepted" render={({ field }) => (
            <TouchableOpacity style={styles.kvkkRow} onPress={() => setShowKvkkSheet(true)}>
              <View style={[styles.checkbox, { borderColor: e2.kvkkAccepted ? colors.danger : colors.border, backgroundColor: field.value ? colors.primary : 'transparent' }]}>
                {field.value && <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={[typography.small, { color: colors.textSecondary, flex: 1 }]}>KVKK ve Gizlilik Sözleşmesini okudum, onaylıyorum.</Text>
            </TouchableOpacity>
          )} />
          {e2.kvkkAccepted && <Text style={styles.fieldError}>{e2.kvkkAccepted.message}</Text>}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setStep(1)}><Text style={[typography.body, { color: colors.textSecondary }]}>Geri</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={() => goToStep(3)}><Text style={styles.primaryBtnText}>Devam Et</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Role-specific */}
      {step === 3 && (
        <View>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.lg, textAlign: 'center' }]}>{ROLE_CARDS.find(r => r.id === selectedRole)?.title} — Detaylar</Text>
          {selectedRole === 'FIRMA' && (
            <>
              <Controller control={firmaForm.control} name="companyTitle" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Firma Unvanı</Text><TextInput style={inputStyle(!!firmaForm.formState.errors.companyTitle)} placeholder="Şirket unvanı" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{firmaForm.formState.errors.companyTitle && <Text style={styles.fieldError}>{firmaForm.formState.errors.companyTitle.message}</Text>}</View>)} />
              <Controller control={firmaForm.control} name="taxNo" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Vergi No</Text><TextInput style={inputStyle(!!firmaForm.formState.errors.taxNo)} placeholder="Vergi numarası" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{firmaForm.formState.errors.taxNo && <Text style={styles.fieldError}>{firmaForm.formState.errors.taxNo.message}</Text>}</View>)} />
              <Controller control={firmaForm.control} name="taxOfficeName" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Vergi Dairesi</Text><TextInput style={inputStyle(!!firmaForm.formState.errors.taxOfficeName)} placeholder="Vergi dairesi adı" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{firmaForm.formState.errors.taxOfficeName && <Text style={styles.fieldError}>{firmaForm.formState.errors.taxOfficeName.message}</Text>}</View>)} />
              <Controller control={firmaForm.control} name="authorizedPerson" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Yetkili Kişi (opsiyonel)</Text><TextInput style={inputStyle(false)} placeholder="Yetkili kişi adı" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} /></View>)} />
            </>
          )}
          {selectedRole === 'TASIYICI' && (
            <>
              <Controller control={tasiyiciForm.control} name="licenseType" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Ehliyet Tipi</Text><TextInput style={inputStyle(!!tasiyiciForm.formState.errors.licenseType)} placeholder="örn: E Sınıfı" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{tasiyiciForm.formState.errors.licenseType && <Text style={styles.fieldError}>{tasiyiciForm.formState.errors.licenseType.message}</Text>}</View>)} />
              <Controller control={tasiyiciForm.control} name="vehicleType" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Araç Tipi</Text><TextInput style={inputStyle(!!tasiyiciForm.formState.errors.vehicleType)} placeholder="örn: TIR, Kamyon" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{tasiyiciForm.formState.errors.vehicleType && <Text style={styles.fieldError}>{tasiyiciForm.formState.errors.vehicleType.message}</Text>}</View>)} />
              <Controller control={tasiyiciForm.control} name="plateNumber" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Plaka</Text><TextInput style={inputStyle(!!tasiyiciForm.formState.errors.plateNumber)} placeholder="örn: 34 ABC 123" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{tasiyiciForm.formState.errors.plateNumber && <Text style={styles.fieldError}>{tasiyiciForm.formState.errors.plateNumber.message}</Text>}</View>)} />
              <Controller control={tasiyiciForm.control} name="srcBelgesi" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>SRC Belgesi (opsiyonel)</Text><TextInput style={inputStyle(false)} placeholder="SRC belge no" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} /></View>)} />
            </>
          )}
          {selectedRole === 'ISLETME' && (
            <>
              <Controller control={isletmeForm.control} name="businessType" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>İşletme Türü</Text><TextInput style={inputStyle(!!isletmeForm.formState.errors.businessType)} placeholder="örn: Lokanta, Akaryakıt" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{isletmeForm.formState.errors.businessType && <Text style={styles.fieldError}>{isletmeForm.formState.errors.businessType.message}</Text>}</View>)} />
              <Controller control={isletmeForm.control} name="businessAddress" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Adres</Text><TextInput style={inputStyle(!!isletmeForm.formState.errors.businessAddress)} placeholder="İşletme adresi" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} />{isletmeForm.formState.errors.businessAddress && <Text style={styles.fieldError}>{isletmeForm.formState.errors.businessAddress.message}</Text>}</View>)} />
            </>
          )}
          {selectedRole === 'GENEL' && (
            <Controller control={genelForm.control} name="inviteCode" render={({ field }) => (<View style={styles.inputGroup}><Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>Davet Kodu (opsiyonel)</Text><TextInput style={inputStyle(false)} placeholder="Davet kodunuz varsa girin" placeholderTextColor={colors.textTertiary} onChangeText={field.onChange} value={field.value} /></View>)} />
          )}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setStep(2)}><Text style={[typography.body, { color: colors.textSecondary }]}>Geri</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Kayıt Ol</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 4: OTP */}
      {step === 4 && (
        <View>
          <Text style={[typography.h2, { color: colors.text, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' }]}>Doğrulama</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>Telefonunuza gönderilen 6 haneli kodu girin</Text>
          <Controller control={otpControl} name="otpCode" render={({ field }) => (
            <View style={styles.inputGroup}><TextInput ref={otpRef} style={[styles.otpInput, { backgroundColor: colors.card, color: colors.text, borderColor: otpErrors.otpCode ? colors.danger : colors.border }]} placeholder="000000" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" maxLength={6} onChangeText={field.onChange} value={field.value} />
            {otpErrors.otpCode && <Text style={styles.fieldError}>{otpErrors.otpCode.message}</Text>}</View>
          )} />
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: authLoading ? 0.7 : 1 }]} onPress={handleVerifyOtp} disabled={authLoading}>
            {authLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Doğrula</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleResend} style={{ marginTop: spacing.md, alignItems: 'center' }}><Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>Kodu Tekrar Gönder</Text></TouchableOpacity>
        </View>
      )}

      {/* KVKK BottomSheet */}
      <BottomSheet visible={showKvkkSheet} onClose={() => setShowKvkkSheet(false)}>
        <Text style={[typography.h3, { color: colors.text, fontWeight: '800', marginBottom: spacing.md }]}>KVKK Aydınlatma Metni</Text>
        <ScrollView style={{ maxHeight: 300, marginBottom: spacing.md }}><Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{kvkkText}</Text></ScrollView>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => { setC2Value('kvkkAccepted', true, { shouldValidate: true }); setShowKvkkSheet(false); }}>
          <Text style={styles.primaryBtnText}>Onaylıyorum</Text>
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const { continueAsGuest } = useAuthStore();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 20, marginBottom: spacing.md }} />
          <Text style={[typography.display, { color: colors.text, fontWeight: '900', letterSpacing: 3, fontSize: 36 }]}>KAPTAN</Text>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 2, marginTop: 4 }]}>AKILLI LOJİSTİK PORTALI</Text>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.tab, { backgroundColor: !isRegister ? colors.primary : 'transparent' }]} onPress={() => setIsRegister(false)}>
            <Text style={[typography.body, { color: !isRegister ? '#FFF' : colors.text, fontWeight: '700' }]}>Giriş</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: isRegister ? colors.primary : 'transparent' }]} onPress={() => setIsRegister(true)}>
            <Text style={[typography.body, { color: isRegister ? '#FFF' : colors.text, fontWeight: '700' }]}>Kayıt</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          {isRegister ? (
            <RegisterWizard onSwitchToLogin={() => setIsRegister(false)} />
          ) : (
            <LoginForm onSwitchToRegister={() => setIsRegister(true)} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing['2xl'], paddingBottom: spacing['3xl'] },
  tabRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.lg },
  formContainer: { paddingHorizontal: spacing.xs },
  inputGroup: { marginBottom: spacing.md },
  input: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, minHeight: 48 },
  fieldError: { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' },
  fieldErrorCenter: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: spacing.sm, fontWeight: '600' },
  primaryBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 50, marginTop: spacing.md },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', minHeight: 50, marginTop: spacing.md },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, marginBottom: spacing.sm },
  roleIcon: { fontSize: 32, marginRight: spacing.md },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepCheck: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  stepNum: { fontSize: 13, fontWeight: '700' },
  kvkkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  otpInput: { borderWidth: 2, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 28, minHeight: 60, textAlign: 'center', letterSpacing: 8, fontWeight: '800' },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, gap: spacing.sm, marginBottom: spacing.md },
  voiceBtnIcon: { fontSize: 20 },
  voiceBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  voiceMsgBox: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  voiceMsgText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  voiceBtnSm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, gap: spacing.xs, marginBottom: spacing.sm, alignSelf: 'center' },
  voiceBtnTextSm: { fontSize: 13, fontWeight: '700' },
  voiceMsgSmall: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: spacing.sm },
});
