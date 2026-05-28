import { z } from 'zod';

const phoneRegex = /^05\d{9}$/;

export const step1Schema = z.object({
  loadType: z.string().min(1, 'Yük türü seçiniz'),
  title: z
    .string()
    .min(5, 'Başlık en az 5 karakter olmalıdır')
    .max(20, 'Başlık en fazla 20 karakter olmalıdır'),
  fromCity: z.string().min(1, 'Nereden (il) seçiniz'),
  fromDistrict: z.string().min(1, 'Nereden (ilçe) seçiniz'),
  fromAddress: z.string().min(1, 'Yükleme adresini giriniz'),
  toCity: z.string().min(1, 'Nereye (il) seçiniz'),
  toDistrict: z.string().min(1, 'Nereye (ilçe) seçiniz'),
  toAddress: z.string().min(1, 'Teslimat adresini giriniz'),
  contactName: z.string().min(1, 'İrtibat kişisi adı giriniz'),
  contactPhone: z
    .string()
    .regex(phoneRegex, 'Geçerli bir telefon numarası giriniz (05XX XXX XX XX)'),
  pickupDate: z.date(),
  pickupTime: z.string().optional(),
  deliveryDate: z.date(),
  deliveryTime: z.string().optional(),
  description: z.string().max(300, 'Açıklama en fazla 300 karakter olabilir').optional(),
}).refine(data => {
  if (!data.pickupDate || !data.deliveryDate) return true;
  return data.deliveryDate >= data.pickupDate;
}, { message: 'Teslim tarihi, yükleme tarihinden önce olamaz', path: ['deliveryDate'] });

export type Step1FormData = z.infer<typeof step1Schema>;

export const tamYukSchema = z.object({
  vehicleType: z.string().min(1, 'Araç tipi seçiniz'),
  trailerType: z.string().min(1, 'Dorse tipi seçiniz'),
  totalWeight: z.number().positive('Geçerli bir ağırlık giriniz'),
  coldChain: z.boolean(),
  description: z.string().max(300).optional(),
});

export const kismiYukSchema = z.object({
  vehicleType: z.string().min(1, 'Araç tipi seçiniz'),
  trailerType: z.string().min(1, 'Dorse tipi seçiniz'),
  partCount: z.number().positive('Parça sayısı pozitif olmalıdır'),
  totalTonnage: z.number().positive('Geçerli bir tonaj giriniz').optional(),
  volume: z.number().positive('Geçerli bir hacim giriniz'),
  packageType: z.string().min(1, 'Paket tipi seçiniz'),
  sharedTransport: z.boolean(),
  urgency: z.string().min(1, 'Aciliyet durumu seçiniz'),
  description: z.string().max(300).optional(),
});

export const evdenEveSchema = z.object({
  homeVehicleType: z.string().min(1, 'Araç tipi seçiniz'),
  homeTrailerType: z.string().min(1, 'Dorse tipi seçiniz'),
  transportType: z.string().min(1, 'Taşıma tipi seçiniz'),
  itemList: z.string().optional(),
  senderFloor: z.number().int().min(0).optional(),
  receiverFloor: z.number().int().min(0).optional(),
  senderElevator: z.boolean(),
  receiverElevator: z.boolean(),
  packaging: z.boolean(),
  description: z.string().max(300).optional(),
});

export const sehirIciSchema = z.object({
  cityVehicleType: z.string().min(1, 'Araç tipi seçiniz'),
  cityTrailerType: z.string().min(1, 'Dorse tipi seçiniz'),
  cityTransportType: z.string().min(1, 'Taşıma türü seçiniz'),
  estimatedDistance: z.number().positive('Geçerli bir mesafe giriniz'),
  deliveryTimeSlot: z.string().min(1, 'Teslimat saat aralığı seçiniz'),
  cityUrgency: z.string().min(1, 'Aciliyet durumu seçiniz'),
  loadSize: z.string().min(1, 'Yük boyutu seçiniz'),
  description: z.string().max(300).optional(),
});

export const step3Schema = z.object({
  isAuction: z.boolean(),
  auctionMinPrice: z.number().optional(),
  auctionMaxPrice: z.number().optional(),
  cod: z.boolean(),
  insurance: z.boolean(),
  escrow: z.boolean(),
  pricingType: z.string().optional(),
  tonnage: z.number().optional(),
  pricePerTon: z.number().optional(),
  totalKg: z.number().optional(),
  totalPrice: z.number().optional(),
});
