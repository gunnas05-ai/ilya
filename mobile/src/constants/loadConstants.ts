import { LoadType } from '../types/load';

export const LOAD_TYPES: { value: LoadType; label: string }[] = [
  { value: 'tam_yuk', label: 'Tam Yük' },
  { value: 'kismi_yuk', label: 'Kısmi Yük' },
  { value: 'evden_eve', label: 'Evden Eve' },
  { value: 'sehir_ici', label: 'Şehir İçi' },
];

export const VEHICLE_TYPES_FULL = [
  'Çekici (TIR)',
  'Kamyon',
  'Kırkayak Kamyon',
  'Lowbed Çekici',
  'Tanker Çekici',
  'Frigorifik Araç',
  'Konteyner Taşıyıcı',
  'Silobas Çekici',
];

export const TRAILER_TYPES = [
  'Tenteli Dorse',
  'Mega Dorse',
  'Frigorifik Dorse',
  'Damper Dorse',
  'Havuz Dorse',
  'Lowbed Dorse',
  'Konteyner Dorse',
  'Silobas Dorse',
  'Tanker Dorse',
  'Platform Dorse',
  'Sal Dorse',
  'Açık Kasa Dorse',
];

export const PACKAGE_TYPES = ['Palet', 'Koli', 'Adet'];

export const URGENCY_LEVELS = ['Düşük', 'Normal', 'Yüksek'];

export const HOME_VEHICLE_TYPES = [
  'Kapalı Kasa Kamyon',
  'Kapalı Kasa Kamyonet',
  'Panelvan',
  'Liftli Nakliye Aracı',
  'Asansörlü Nakliyat Aracı',
];

export const HOME_TRAILER_TYPES = [
  'Kapalı Kasa',
  'Liftli Kapalı Kasa',
  'Mobilya Taşıma Kasası',
  'Asansörlü Taşıma Sistemi',
];

export const HOME_TRANSPORT_TYPES = [
  'Ev Eşyası',
  'Ofis Eşyası',
  'Beyaz Eşya',
  'Mobilya',
  'Parça Eşya',
  'Antika / Hassas Eşya',
];

export const CITY_VEHICLE_TYPES = [
  'Panelvan',
  'Kamyonet',
  'Pickup',
  'Moto Kurye',
  'Minivan',
  'Frigorifik Minivan',
  'Hafif Ticari Araç',
];

export const CITY_TRAILER_TYPES = [
  'Kapalı Kasa',
  'Açık Kasa',
  'Frigorifik Kasa',
  'Kurye Kasası',
  'Hafif Ticari Kasa',
];

export const CITY_TRANSPORT_TYPES = [
  'Market Dağıtımı',
  'Restoran Sevkiyatı',
  'İlaç Dağıtımı',
  'E-Ticaret Teslimatı',
  'Soğuk Zincir',
  'Tarım Ürünleri',
  'Kargo Dağıtımı',
  'Sanayi İçi Dağıtım',
];

export const DELIVERY_TIME_SLOTS = [
  '09:00 - 12:00',
  '12:00 - 17:00',
  '17:00 - 21:00',
];

export const CITY_URGENCY = ['Aynı Gün', 'Ertesi Gün', '3 Gün İçinde'];

export const LOAD_SIZES = ['Küçük', 'Orta', 'Büyük'];

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`
);

export const INSURANCE_PACKAGES = [
  { id: 'basic', name: 'Temel Paket', description: 'Standart yük güvencesi', price: '150 ₺', coverage: 50000 },
  { id: 'standard', name: 'Standart Paket', description: 'Geniş kapsamlı taşıma sigortası', price: '350 ₺', coverage: 150000 },
  { id: 'comprehensive', name: 'Kapsamlı Paket', description: 'Tam kapsamlı eksiksiz güvence', price: '750 ₺', coverage: 500000 },
  { id: 'premium', name: 'Premyum Paket', description: 'Yüksek limitli profesyonel teminat', price: '1.500 ₺', coverage: 1000000 },
];
