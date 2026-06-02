/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — Auth Validation Tests
   Mobile ile aynı şemalar, aynı test mantığı
   ═══════════════════════════════════════════════════════════════ */

import { loginSchema, step1Schema, step2Schema, step3FirmaSchema, step3TasiyiciSchema, otpSchema } from '../validations';

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('geçerli email + şifre kabul eder', () => {
      const r = loginSchema.safeParse({ email: 'test@test.com', password: '123456' });
      expect(r.success).toBe(true);
    });
    it('boş email reddeder', () => {
      const r = loginSchema.safeParse({ email: '', password: '123' });
      expect(r.success).toBe(false);
    });
    it('geçersiz email reddeder', () => {
      const r = loginSchema.safeParse({ email: 'abc', password: '123' });
      expect(r.success).toBe(false);
    });
  });

  describe('step1Schema (rol seçimi)', () => {
    it('geçerli rol kabul eder', () => {
      ['FIRMA', 'TASIYICI', 'ISLETME', 'GENEL'].forEach(role => {
        expect(step1Schema.safeParse({ selectedRole: role }).success).toBe(true);
      });
    });
    it('geçersiz rol reddeder', () => {
      expect(step1Schema.safeParse({ selectedRole: 'INVALID' }).success).toBe(false);
    });
  });

  describe('step2Schema (ortak bilgiler)', () => {
    const valid = {
      fullName: 'Test Kullanici', phone: '05320000000',
      email: 'test@test.com', password: 'Test1234A',
      kvkkAccepted: true as const, termsAccepted: true as const,
    };
    it('tüm alanlar geçerliyse kabul eder', () => {
      expect(step2Schema.safeParse(valid).success).toBe(true);
    });
    it('şifre 8 karakterden kısa olamaz', () => {
      expect(step2Schema.safeParse({ ...valid, password: 'Ab1' }).success).toBe(false);
    });
    it('şifrede büyük harf zorunlu', () => {
      expect(step2Schema.safeParse({ ...valid, password: 'test1234a' }).success).toBe(false);
    });
    it('geçersiz telefon reddeder', () => {
      expect(step2Schema.safeParse({ ...valid, phone: '123' }).success).toBe(false);
    });
    it('KVKK onayı zorunlu', () => {
      expect(step2Schema.safeParse({ ...valid, kvkkAccepted: false }).success).toBe(false);
    });
    it('Sözleşme onayı zorunlu', () => {
      expect(step2Schema.safeParse({ ...valid, termsAccepted: false }).success).toBe(false);
    });
  });

  describe('step3FirmaSchema', () => {
    it('zorunlu firma bilgilerini kontrol eder', () => {
      expect(step3FirmaSchema.safeParse({ companyTitle: 'Test Ltd', taxNo: '1234567890', taxOfficeName: 'İstanbul' }).success).toBe(true);
      expect(step3FirmaSchema.safeParse({ companyTitle: '', taxNo: '', taxOfficeName: '' }).success).toBe(false);
    });
  });

  describe('step3TasiyiciSchema', () => {
    it('zorunlu taşıyıcı bilgilerini kontrol eder', () => {
      expect(step3TasiyiciSchema.safeParse({ licenseType: 'CE', vehicleType: 'kamyon', plateNumber: '34ABC123' }).success).toBe(true);
      expect(step3TasiyiciSchema.safeParse({ licenseType: '', vehicleType: '', plateNumber: '' }).success).toBe(false);
    });
  });

  describe('otpSchema', () => {
    it('6 haneli OTP kabul eder', () => {
      expect(otpSchema.safeParse({ otpCode: '123456' }).success).toBe(true);
    });
    it('5 haneli OTP reddeder', () => {
      expect(otpSchema.safeParse({ otpCode: '12345' }).success).toBe(false);
    });
  });
});
