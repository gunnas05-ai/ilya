import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'E-posta adresinizi girin').email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifrenizi girin'),
});

export const step1Schema = z.object({
  selectedRole: z.enum(['FIRMA', 'TASIYICI', 'ISLETME', 'GENEL'], {
    required_error: 'Lütfen bir kullanıcı rolü seçin',
  }),
});

export const step2Schema = z.object({
  fullName: z.string().min(1, 'Lütfen ad soyad girin'),
  phone: z.string().regex(/^05\d{9}$/, 'Telefon 0(5xx) xxx xx xx formatında olmalıdır'),
  email: z.string().min(1, 'Lütfen e-posta adresi girin').email('Geçerli bir e-posta adresi girin'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-ZÇĞİÖŞÜ]/, 'En az 1 büyük harf içermelidir')
    .regex(/[0-9]/, 'En az 1 rakam içermelidir')
    .regex(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/, 'En az 1 özel karakter içermelidir'),
  kvkkAccepted: z.literal(true, { errorMap: () => ({ message: 'KVKK Aydınlatma Metni\'ni onaylamanız gerekmektedir' }) }),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Kullanıcı Sözleşmesi\'ni onaylamanız gerekmektedir' }) }),
});

export const step3FirmaSchema = z.object({
  companyTitle: z.string().min(1, 'Firma unvanı zorunludur'),
  taxNo: z.string().min(1, 'Vergi numarası zorunludur'),
  taxOfficeName: z.string().min(1, 'Vergi dairesi zorunludur'),
  authorizedPerson: z.string().optional(),
});

export const step3TasiyiciSchema = z.object({
  licenseType: z.string().min(1, 'Ehliyet tipi zorunludur'),
  vehicleType: z.string().min(1, 'Araç tipi zorunludur'),
  plateNumber: z.string().min(1, 'Plaka numarası zorunludur'),
  srcBelgesi: z.string().optional(),
});

export const step3IsletmeSchema = z.object({
  businessType: z.string().min(1, 'İşletme türü zorunludur'),
  businessAddress: z.string().min(1, 'İşletme adresi zorunludur'),
});

export const step3GenelSchema = z.object({
  inviteCode: z.string().optional(),
});

export const otpSchema = z.object({
  otpCode: z.string().length(6, '6 haneli doğrulama kodunu girin'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
