'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  LogIn, Eye, EyeOff, ArrowLeft, ArrowRight,
  Building2, Truck, Briefcase, User, ShieldCheck, Check,
} from 'lucide-react';
import {
  FormInput, PhoneInput, DropdownSelect,
} from '@/components/shared';

/* ===================================================== */
/*  Login / Register — Mobile app ile aynı akış           */
/* ===================================================== */

const ROLES = [
  { value: 'FIRMA', label: 'Firma (Yük Veren)', desc: 'Yüklerinizi taşıtın, lojistik operasyonlarınızı yönetin', icon: Building2 },
  { value: 'TASIYICI', label: 'Taşıyıcı / Sürücü', desc: 'Yükleri bulun, filonuzu büyütün, kazancınızı artırın', icon: Truck },
  { value: 'ISLETME', label: 'İşletme / Tesis', desc: 'Akaryakıt, restoran, depo hizmetleri verin', icon: Briefcase },
  { value: 'GENEL', label: 'Genel Kullanıcı', desc: 'Platformu keşfedin, tüm özelliklere erişin', icon: User },
];

const VEHICLE_TYPES = [
  { value: 'kamyon', label: 'Kamyon' },
  { value: 'tir', label: 'TIR' },
  { value: 'cekip_kamyon', label: 'Çekici + Kamyon' },
  { value: 'kamyonet', label: 'Kamyonet' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'panelvan', label: 'Panelvan' },
];

const BUSINESS_TYPES = [
  { value: 'akaryakit', label: 'Akaryakıt İstasyonu' },
  { value: 'restoran', label: 'Restoran / Lokanta' },
  { value: 'depo', label: 'Depo / Antrepo' },
  { value: 'tamirhane', label: 'Tamirhane / Servis' },
  { value: 'lojistik', label: 'Lojistik Firması' },
  { value: 'diger', label: 'Diğer' },
];

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const router = useRouter();

  /* ── Login state ── */
  const [email, setEmail] = useState('ilyas_duran@hotmail.com');
  const [password, setPassword] = useState('Alp5326741416');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Forgot password state ── */
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  /* ── Register state ── */
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showKvkk, setShowKvkk] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Step 3 fields
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
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [userId, setUserId] = useState('');

  /* ── Login handler ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const d = res.data?.data;
      const token = d?.accessToken;
      if (token) {
        localStorage.setItem('admin_token', token);
        if (d?.refreshToken) localStorage.setItem('admin_refresh', d.refreshToken);
        if (d?.user) localStorage.setItem('admin_user', JSON.stringify(d.user));
        router.push('/admin');
      } else {
        setError('Token alınamadı.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Forgot password handler ── */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes('@')) { setError('Geçerli bir e-posta girin'); return; }
    setError('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Şifre sıfırlama başarısız. Lütfen tekrar deneyin.');
    } finally {
      setForgotLoading(false);
    }
  };

  /* ── Register: Step 1 → Step 2 ── */
  const goStep2 = () => {
    if (!selectedRole) { setRegError('Lütfen bir rol seçin'); return; }
    setRegError('');
    setStep(2);
  };

  /* ── Register: Step 2 → Step 3 ── */
  const goStep3 = () => {
    if (!fullName.trim()) { setRegError('Ad Soyad zorunlu'); return; }
    if (phone.length !== 11) { setRegError('Geçerli bir telefon numarası girin (05xx)'); return; }
    if (!regEmail.includes('@')) { setRegError('Geçerli bir e-posta girin'); return; }
    if (regPassword.length < 8) { setRegError('Şifre en az 8 karakter olmalı'); return; }
    if (!/[A-Z]/.test(regPassword)) { setRegError('Şifre en az bir büyük harf içermeli'); return; }
    if (!/[0-9]/.test(regPassword)) { setRegError('Şifre en az bir rakam içermeli'); return; }
    setRegError('');
    if (selectedRole === 'GENEL') { handleRegister(); return; }
    setStep(3);
  };

  /* ── Register: Step 3 → Submit ── */
  const goStep4 = () => {
    if (selectedRole === 'FIRMA') {
      if (!companyTitle.trim()) { setRegError('Firma ünvanı zorunlu'); return; }
      if (!taxNo.trim()) { setRegError('Vergi numarası zorunlu'); return; }
    }
    if (selectedRole === 'TASIYICI') {
      if (!licenseType.trim()) { setRegError('Ehliyet tipi zorunlu'); return; }
      if (!vehicleType.trim()) { setRegError('Araç tipi zorunlu'); return; }
      if (!plateNumber.trim()) { setRegError('Plaka zorunlu'); return; }
    }
    if (selectedRole === 'ISLETME') {
      if (!businessType.trim()) { setRegError('İşletme tipi zorunlu'); return; }
      if (!businessAddress.trim()) { setRegError('İşletme adresi zorunlu'); return; }
    }
    setRegError('');
    handleRegister();
  };

  /* ── Register API ── */
  const handleRegister = async () => {
    setRegLoading(true);
    setRegError('');
    try {
      const body: any = {
        email: regEmail,
        password: regPassword,
        fullName,
        phone,
        uiRole: selectedRole,
        kvkkAccepted: true,
        termsAccepted: true,
      };
      if (selectedRole === 'FIRMA') {
        body.companyTitle = companyTitle;
        body.taxNumber = taxNo;
        body.taxOffice = taxOfficeName;
        if (authorizedPerson) body.authorizedPerson = authorizedPerson;
      }
      if (selectedRole === 'TASIYICI') {
        body.licenseType = licenseType;
        body.vehicleType = vehicleType;
        body.plateNumber = plateNumber;
        if (srcBelgesi) body.srcBelgeNo = srcBelgesi;
      }
      if (selectedRole === 'ISLETME') {
        body.businessType = businessType;
        body.businessAddress = businessAddress;
      }
      if (selectedRole === 'GENEL' && inviteCode) body.inviteCode = inviteCode;

      const res = await api.post('/auth/register', body);
      const uid = res.data?.data?.userId || res.data?.userId;
      if (uid) {
        setUserId(uid);
        setStep(4);
      } else {
        const token = res.data?.data?.accessToken;
        if (token) {
          localStorage.setItem('admin_token', token);
          if (res.data?.data?.refreshToken) localStorage.setItem('admin_refresh', res.data.data.refreshToken);
          if (res.data?.data?.user) localStorage.setItem('admin_user', JSON.stringify(res.data.data.user));
          router.push('/admin');
        } else {
          setStep(4); // show OTP step regardless
        }
      }
    } catch (err: any) {
      setRegError(err.response?.data?.message || err.message || 'Kayıt başarısız');
    } finally {
      setRegLoading(false);
    }
  };

  /* ── OTP Verify ── */
  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) { setRegError('6 haneli OTP kodunu girin'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      const res = await api.post('/auth/verify-otp', { userId: userId, otpCode });
      const token = res.data?.data?.accessToken || res.data?.accessToken;
      if (token) {
        localStorage.setItem('admin_token', token);
        if (res.data?.data?.refreshToken) localStorage.setItem('admin_refresh', res.data.data.refreshToken);
        if (res.data?.data?.user) localStorage.setItem('admin_user', JSON.stringify(res.data.data.user));
        router.push('/admin');
      }
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'OTP doğrulama başarısız');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {mode === 'forgot' ? (
        /* ═══════════ FORGOT PASSWORD ═══════════ */
        <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                            flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <span className="text-white font-bold text-xl">?</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text)]">Şifre Sıfırlama</h2>
            <p className="text-slate-500 text-sm mt-1">E-posta adresinize sıfırlama bağlantısı gönderilecek</p>
          </div>
          {forgotSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className="text-emerald-400 font-medium">Sıfırlama bağlantısı gönderildi!</p>
              <p className="text-slate-500 text-sm">Lütfen <strong className="text-[var(--text)]">{forgotEmail}</strong> adresini kontrol edin.</p>
              <button onClick={() => { setMode('login'); setForgotSent(false); }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium">Giriş sayfasına dön</button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <FormInput
                label="E-Posta"
                type="email"
                value={forgotEmail}
                onChange={setForgotEmail}
                placeholder="ornek@email.com"
                required
              />
              {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={forgotLoading}
                className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold
                           flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-50 transition-all">
                {forgotLoading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
              <p className="text-center">
                <button onClick={() => { setMode('login'); setError(''); }}
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium">← Giriş sayfasına dön</button>
              </p>
            </form>
          )}
        </div>
      ) : mode === 'login' ? (
        /* ═══════════ LOGIN ═══════════ */
        <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600
                            flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(255,122,26,0.3)]">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <h1 className="text-2xl font-bold tracking-wider" style={{ color: 'var(--primary)' }}>KAPTAN</h1>
            <p className="text-slate-500 text-sm mt-1">Yönetim Paneli</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <FormInput
              label="E-Posta"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="ilyas_duran@hotmail.com"
              required
            />
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
                Şifre<span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  className="w-full bg-white/[0.04] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 pr-11
                             text-sm text-[var(--text)] placeholder:text-slate-600 outline-none
                             focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[var(--text)]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[var(--primary)] text-white rounded-xl py-3 font-semibold
                         flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all">
              <LogIn size={18} /> {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => { setMode('forgot'); setError(''); }}
              className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
              Şifremi Unuttum?
            </button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            Hesabınız yok mu?{' '}
            <button onClick={() => { setMode('register'); setStep(1); setRegError(''); }}
              className="text-blue-400 hover:text-blue-300 font-medium">Kayıt Ol</button>
          </p>
        </div>
      ) : (
        /* ═══════════ REGISTER ═══════════ */
        <div className="w-full max-w-lg glass-card rounded-2xl p-8 animate-fade-in">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${s < step ? 'bg-emerald-500 text-white' :
                    s === step ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' :
                    'bg-white/[0.06] text-slate-600'}`}>
                  {s < step ? <Check size={14} /> : s}
                </div>
                {s < 4 && <div className={`w-8 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-white/[0.06]'}`} />}
              </div>
            ))}
          </div>

          {/* Step title */}
          <h2 className="text-xl font-bold text-[var(--text)] text-center mb-6">
            {step === 1 && 'Rolünüzü Seçin'}
            {step === 2 && 'Bilgileriniz'}
            {step === 3 && selectedRole === 'FIRMA' && 'Firma Bilgileri'}
            {step === 3 && selectedRole === 'TASIYICI' && 'Taşıyıcı Bilgileri'}
            {step === 3 && selectedRole === 'ISLETME' && 'İşletme Bilgileri'}
            {step === 4 && 'OTP Doğrulama'}
          </h2>

          {regError && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg mb-4">{regError}</p>
          )}

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-3">
              {ROLES.map(r => {
                const Icon = r.icon;
                const active = selectedRole === r.value;
                return (
                  <button key={r.value} onClick={() => setSelectedRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                      ${active
                        ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.12)]'
                        : 'border-[var(--glass-border)] hover:border-slate-500 bg-white/[0.02]'}`}>
                    <div className={`p-2.5 rounded-lg ${active ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.04] text-slate-500'}`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${active ? 'text-blue-300' : 'text-[var(--text)]'}`}>{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                    </div>
                    {active && <Check size={18} className="text-blue-400 ml-auto shrink-0" />}
                  </button>
                );
              })}
              <button onClick={goStep2}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2
                           hover:bg-blue-600 transition-colors disabled:opacity-30"
                disabled={!selectedRole}>
                Devam <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Common Info */}
          {step === 2 && (
            <div className="space-y-4">
              <FormInput label="Ad Soyad" value={fullName} onChange={setFullName} placeholder="İlyas Duran" required />
              <PhoneInput value={phone} onChange={setPhone} required />
              <FormInput label="E-Posta" type="email" value={regEmail} onChange={setRegEmail} placeholder="ornek@email.com" required />
              <FormInput label="Şifre (en az 8 karakter, büyük harf + rakam)" type="password" value={regPassword} onChange={setRegPassword} placeholder="••••••••" required />
              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-500 text-center">
                  Kayıt olarak <button onClick={() => setShowKvkk(!showKvkk)} className="text-blue-400 hover:text-blue-300 underline">KVKK Aydınlatma Metni</button> ve <button onClick={() => setShowTerms(!showTerms)} className="text-blue-400 hover:text-blue-300 underline">Kullanıcı Sözleşmesi</button>'ni kabul etmiş sayılırsınız.
                </p>
                {showKvkk && (
                  <div className="p-3 rounded-lg bg-white/[0.04] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] max-h-32 overflow-y-auto">
                    <p className="font-semibold text-[var(--text)] mb-1">KİŞİSEL VERİLERİN KORUNMASI AYDINLATMA METNİ</p>
                    <p>KAPTAN Lojistik Platformu olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerinizi işliyoruz. Ad, soyad, e-posta, telefon numarası, konum bilgisi, araç plakası gibi kişisel verileriniz; lojistik hizmetlerinin sunulması, yasal yükümlülüklerin yerine getirilmesi ve hizmet kalitesinin artırılması amaçlarıyla işlenmektedir.</p>
                  </div>
                )}
                {showTerms && (
                  <div className="p-3 rounded-lg bg-white/[0.04] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] max-h-32 overflow-y-auto">
                    <p className="font-semibold text-[var(--text)] mb-1">KULLANICI SÖZLEŞMESİ</p>
                    <p>KAPTAN Lojistik Platformu'nu kullanarak; platform kurallarına uyacağınızı, doğru ve güncel bilgi sağlayacağınızı, üçüncü şahısların haklarını ihlal etmeyeceğinizi ve platformun güvenliğini tehlikeye atmayacağınızı kabul etmiş olursunuz.</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-semibold border border-[var(--glass-border)]
                             text-slate-400 hover:text-[var(--text)] transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Geri
                </button>
                <button onClick={goStep3}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold
                             hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                  Devam <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Role-specific */}
          {step === 3 && (
            <div className="space-y-4">
              {selectedRole === 'FIRMA' && (
                <>
                  <FormInput label="Firma Ünvanı" value={companyTitle} onChange={setCompanyTitle} placeholder="ABC Lojistik A.Ş." required />
                  <FormInput label="Vergi Numarası" value={taxNo} onChange={setTaxNo} placeholder="1234567890" required />
                  <FormInput label="Vergi Dairesi" value={taxOfficeName} onChange={setTaxOfficeName} placeholder="İstanbul Vergi Dairesi" required />
                  <FormInput label="Yetkili Kişi" value={authorizedPerson} onChange={setAuthorizedPerson} placeholder="Ad Soyad" />
                </>
              )}
              {selectedRole === 'TASIYICI' && (
                <>
                  <DropdownSelect label="Ehliyet Tipi" value={licenseType} onChange={setLicenseType} required
                    options={[
                      { value: 'B', label: 'B Sınıfı' }, { value: 'C', label: 'C Sınıfı' },
                      { value: 'CE', label: 'CE Sınıfı' }, { value: 'D', label: 'D Sınıfı' },
                      { value: 'E', label: 'E Sınıfı' },
                    ]} />
                  <DropdownSelect label="Araç Tipi" value={vehicleType} onChange={setVehicleType} required options={VEHICLE_TYPES} />
                  <FormInput label="Plaka" value={plateNumber} onChange={setPlateNumber} placeholder="34 ABC 123" required />
                  <FormInput label="SRC Belge No (opsiyonel)" value={srcBelgesi} onChange={setSrcBelgesi} placeholder="SRC-12345" />
                </>
              )}
              {selectedRole === 'ISLETME' && (
                <>
                  <DropdownSelect label="İşletme Tipi" value={businessType} onChange={setBusinessType} required options={BUSINESS_TYPES} />
                  <FormInput label="İşletme Adresi" value={businessAddress} onChange={setBusinessAddress} placeholder="Açık adres..." required multiline />
                </>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl font-semibold border border-[var(--glass-border)]
                             text-slate-400 hover:text-[var(--text)] transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Geri
                </button>
                <button onClick={goStep4} disabled={regLoading}
                  className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold
                             hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  {regLoading ? 'Kaydediliyor...' : 'Kayıt Ol'} <ShieldCheck size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: OTP */}
          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                <ShieldCheck size={32} className="text-blue-400" />
              </div>
              <p className="text-[var(--text)] text-sm">
                Telefonunuza 6 haneli bir doğrulama kodu gönderildi.<br />
                <span className="text-slate-500">{phone.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{1})/, '$1($2) $3 $4 $5')}</span>
              </p>
              <div className="flex justify-center">
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-48 text-center text-3xl tracking-[0.5em] font-bold text-[var(--text)]
                             bg-white/[0.04] border border-[var(--glass-border)] rounded-xl py-3
                             focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="------"
                />
              </div>
              <button onClick={handleOtpVerify} disabled={regLoading || otpCode.length !== 6}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold
                           hover:bg-emerald-600 transition-colors disabled:opacity-30">
                {regLoading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
              </button>
              <p className="text-xs text-slate-500">
                Kodu almadınız mı?{' '}
                <button onClick={handleRegister} className="text-blue-400 hover:text-blue-300 font-medium">
                  Tekrar Gönder
                </button>
              </p>
            </div>
          )}

          {/* Back to login */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Zaten hesabınız var mı?{' '}
            <button onClick={() => { setMode('login'); setRegError(''); }}
              className="text-blue-400 hover:text-blue-300 font-medium">Giriş Yap</button>
          </p>
        </div>
      )}
    </div>
  );
}
