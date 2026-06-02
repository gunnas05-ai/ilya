/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — Form Validations
   Zod schemas (local) + shared regex/format helpers
   ═══════════════════════════════════════════════════════════════ */

import { z } from 'zod';
export {
  phoneRegex, plateRegex, tcKimlikRegex, ibanRegex, taxNoRegex,
  validateTCKimlik, formatIBAN, formatPlate, formatPhone, formatMoney,
} from '@kaptan/shared/validations';

/* ── Auth Schemas (mobile ile aynı) ────────────────────────── */

export const loginSchema = z.object({
  email: z.string().min(1, 'E-posta adresinizi girin').email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifrenizi girin'),
});

export const step1Schema = z.object({
  selectedRole: z.enum(['FIRMA', 'TASIYICI', 'ISLETME', 'GENEL'] as const, {
    message: 'Lütfen bir rol seçin',
  }),
});

export const step2Schema = z.object({
  fullName: z.string().min(1, 'Ad soyad zorunlu'),
  phone: z.string().regex(/^05\d{9}$/, 'Telefon 0(5xx) xxx xx xx formatında olmalıdır'),
  email: z.string().min(1, 'E-posta zorunlu').email('Geçerli e-posta girin'),
  password: z.string().min(8, 'En az 8 karakter').regex(/[A-Z]/, 'Büyük harf gerekli').regex(/[0-9]/, 'Rakam gerekli'),
  kvkkAccepted: z.literal(true, { message: 'KVKK onayı zorunlu' }),
  termsAccepted: z.literal(true, { message: 'Kullanıcı Sözleşmesi onayı zorunlu' }),
});

export const step3FirmaSchema = z.object({
  companyTitle: z.string().min(1, 'Firma ünvanı zorunlu'),
  taxNo: z.string().min(1, 'Vergi numarası zorunlu'),
  taxOfficeName: z.string().min(1, 'Vergi dairesi zorunlu'),
  authorizedPerson: z.string().optional(),
});

export const step3TasiyiciSchema = z.object({
  licenseType: z.string().min(1, 'Ehliyet tipi zorunlu'),
  vehicleType: z.string().min(1, 'Araç tipi zorunlu'),
  plateNumber: z.string().min(1, 'Plaka zorunlu'),
  srcBelgesi: z.string().optional(),
});

export const step3IsletmeSchema = z.object({
  businessType: z.string().min(1, 'İşletme tipi zorunlu'),
  businessAddress: z.string().min(1, 'Adres zorunlu'),
});

export const step3GenelSchema = z.object({
  inviteCode: z.string().optional(),
});

export const otpSchema = z.object({
  otpCode: z.string().length(6, '6 haneli kod gerekli'),
});

export const expenseSchema = z.object({
  amount: z.number({ message: 'Tutar sayı olmalı' }).positive('Tutar pozitif olmalı'),
  description: z.string().min(1, 'Açıklama zorunlu').max(500, 'En fazla 500 karakter'),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  date: z.string().optional(),
  vehiclePlate: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type Step1Form = z.infer<typeof step1Schema>;
export type Step2Form = z.infer<typeof step2Schema>;
export type Step3FirmaForm = z.infer<typeof step3FirmaSchema>;
export type Step3TasiyiciForm = z.infer<typeof step3TasiyiciSchema>;
export type Step3IsletmeForm = z.infer<typeof step3IsletmeSchema>;
export type Step3GenelForm = z.infer<typeof step3GenelSchema>;
export type OtpForm = z.infer<typeof otpSchema>;
export type ExpenseForm = z.infer<typeof expenseSchema>;

// ── Web-specific: Load creation wizard (3-step) ──────────────────

export const loadStep1Schema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter').max(20, 'En fazla 20 karakter'),
  loadType: z.enum(['Tam Yük', 'Kısmi Yük', 'Evden Eve', 'Şehir İçi'], { message: 'Yük tipi seçin' }),
  originCity: z.string().min(1, 'Kalkış şehri zorunlu'),
  originDistrict: z.string().optional(),
  originAddress: z.string().min(1, 'Kalkış adresi zorunlu'),
  destCity: z.string().min(1, 'Varış şehri zorunlu'),
  destDistrict: z.string().optional(),
  destAddress: z.string().min(1, 'Varış adresi zorunlu'),
  contactName: z.string().min(1, 'İletişim adı zorunlu'),
  contactPhone: z.string().min(10, 'Geçerli telefon girin'),
  loadingDate: z.string().min(1, 'Yükleme tarihi zorunlu'),
  loadingTime: z.string().optional(),
  deliveryDate: z.string().min(1, 'Teslim tarihi zorunlu'),
  deliveryTime: z.string().optional(),
  description: z.string().max(500).optional(),
}).refine(d => !d.deliveryDate || !d.loadingDate || d.deliveryDate >= d.loadingDate, {
  message: 'Teslim tarihi yükleme tarihinden önce olamaz', path: ['deliveryDate'],
});

export const loadStep2Schema = z.object({
  vehicleType: z.string().optional(),
  trailerType: z.string().optional(),
  weight: z.string().optional(),
  pieces: z.string().optional(),
  volume: z.string().optional(),
  packageType: z.string().optional(),
  sharedTransport: z.boolean().optional(),
  urgency: z.string().optional(),
  transportType: z.string().optional(),
  itemList: z.string().optional(),
  senderFloor: z.string().optional(),
  receiverFloor: z.string().optional(),
  senderElevator: z.boolean().optional(),
  receiverElevator: z.boolean().optional(),
  packagingNeeded: z.boolean().optional(),
  estimatedDistance: z.string().optional(),
  deliveryTimeSlot: z.string().optional(),
  cargoSize: z.string().optional(),
  coldChain: z.boolean().optional(),
});

export const loadStep3Schema = z.object({
  pricingType: z.enum(['tonnage', 'fixed']),
  price: z.string().optional(),
  tonnage: z.string().optional(),
  pricePerTon: z.string().optional(),
  auctionEnabled: z.boolean().optional(),
  auctionMinPrice: z.string().optional(),
  auctionMaxPrice: z.string().optional(),
  auctionStartDate: z.string().optional(),
  auctionStartTime: z.string().optional(),
  auctionEndDate: z.string().optional(),
  auctionEndTime: z.string().optional(),
  cashOnDelivery: z.boolean().optional(),
  insuranceEnabled: z.boolean().optional(),
  escrowEnabled: z.boolean().optional(),
}).refine(d => d.pricingType === 'fixed' ? !!(d.price && +d.price > 0) : true, {
  message: 'Komple fiyat zorunlu', path: ['price'],
}).refine(d => d.pricingType === 'tonnage' ? !!(d.tonnage && d.pricePerTon && +d.tonnage > 0 && +d.pricePerTon > 0) : true, {
  message: 'Tonaj ve birim fiyat zorunlu', path: ['tonnage'],
}).refine(d => !d.auctionEnabled || !!(d.auctionMinPrice && d.auctionMaxPrice && +d.auctionMinPrice > 0 && +d.auctionMaxPrice > +d.auctionMinPrice), {
  message: 'Geçerli ihale aralığı girin', path: ['auctionMinPrice'],
});

export type LoadStep1Form = z.infer<typeof loadStep1Schema>;
export type LoadStep2Form = z.infer<typeof loadStep2Schema>;
export type LoadStep3Form = z.infer<typeof loadStep3Schema>;
