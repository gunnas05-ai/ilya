/* ═══════════════════════════════════════════════════════════════
   KAPTAN PLATFORMU — Shared Constants
   WEB + MOBIL ortak sabitler havuzu
   ═══════════════════════════════════════════════════════════════ */

// ── Roller ──────────────────────────────────────────────────────

export const UI_ROLES = [
  { value: 'FIRMA', label: 'Firma (Yük Veren)' },
  { value: 'TASIYICI', label: 'Taşıyıcı / Sürücü' },
  { value: 'ISLETME', label: 'İşletme / Tesis' },
  { value: 'GENEL', label: 'Genel Kullanıcı' },
] as const;

// ── Araç Tipleri ───────────────────────────────────────────────

export const VEHICLE_TYPES = [
  { value: 'kamyon', label: 'Kamyon' },
  { value: 'tir', label: 'TIR' },
  { value: 'cekip_kamyon', label: 'Çekici + Kamyon' },
  { value: 'kamyonet', label: 'Kamyonet' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'panelvan', label: 'Panelvan' },
] as const;

export const TRAILER_TYPES = [
  { value: 'tenteli', label: 'Tenteli' },
  { value: 'mega', label: 'Mega' },
  { value: 'frigo', label: 'Frigo' },
  { value: 'damper', label: 'Damper' },
  { value: 'konteyner', label: 'Konteyner' },
  { value: 'lowbed', label: 'Lowbed' },
  { value: 'tanker', label: 'Tanker' },
  { value: 'silobas', label: 'Silobas' },
] as const;

// ── Yük Tipleri ────────────────────────────────────────────────

export const LOAD_TYPES = [
  { value: 'tam_yuk', label: 'Tam Yük' },
  { value: 'kismi_yuk', label: 'Kısmi Yük' },
  { value: 'evden_eve', label: 'Evden Eve' },
  { value: 'sehir_ici', label: 'Şehir İçi' },
] as const;

// ── Yakıt Tipleri ──────────────────────────────────────────────

export const FUEL_TYPES = [
  { value: 'benzin', label: 'Benzin' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'lpg', label: 'LPG' },
  { value: 'elektrik', label: 'Elektrik' },
  { value: 'hibrit', label: 'Hibrit' },
] as const;

// ── Şanzıman ───────────────────────────────────────────────────

export const TRANSMISSION_TYPES = [
  { value: 'manuel', label: 'Manuel' },
  { value: 'otomatik', label: 'Otomatik' },
  { value: 'yari_otomatik', label: 'Yarı Otomatik' },
] as const;

// ── İşletme Tipleri ────────────────────────────────────────────

export const BUSINESS_TYPES = [
  { value: 'akaryakit', label: 'Akaryakıt İstasyonu' },
  { value: 'restoran', label: 'Restoran / Lokanta' },
  { value: 'depo', label: 'Depo / Antrepo' },
  { value: 'tamirhane', label: 'Tamirhane / Servis' },
  { value: 'lojistik', label: 'Lojistik Firması' },
  { value: 'diger', label: 'Diğer' },
] as const;

// ── Paket Tipleri ──────────────────────────────────────────────

export const PACKAGE_TYPES = [
  { value: 'palet', label: 'Palet' },
  { value: 'koli', label: 'Koli' },
  { value: 'adet', label: 'Adet' },
] as const;

// ── Aciliyet ───────────────────────────────────────────────────

export const URGENCY_LEVELS = [
  { value: 'dusuk', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'yuksek', label: 'Yüksek' },
] as const;

// ── Para Birimi ─────────────────────────────────────────────────

export const CURRENCY = {
  code: 'TRY',
  symbol: '₺',
  locale: 'tr-TR',
  decimals: 2,
} as const;

// ── Sayfalama ─────────────────────────────────────────────────

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

// ── Dosya Limitleri ─────────────────────────────────────────────

export const FILE_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  documentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxPhotos: 5,
} as const;

// ── WebSocket Olayları ─────────────────────────────────────────

export const WS_EVENTS = {
  LOAD_CREATED: 'load.created',
  LOAD_UPDATED: 'load.updated',
  LOAD_CANCELLED: 'load.cancelled',
  BID_PLACED: 'bid.placed',
  BID_ACCEPTED: 'bid.accepted',
  BID_REJECTED: 'bid.rejected',
  TRACKING_UPDATE: 'tracking.update',
  TRACKING_STATUS: 'tracking.status_change',
  ESCROW_CREATED: 'escrow.created',
  ESCROW_RELEASED: 'escrow.released',
  ESCROW_DISPUTE: 'escrow.dispute',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_STATUS: 'invoice.status_change',
  NOTIFICATION_NEW: 'notification.new',
  NOTIFICATION_READ: 'notification.read',
  WALLET_BALANCE: 'wallet.balance_change',
  WALLET_TRANSACTION: 'wallet.transaction',
  CHAT_MESSAGE: 'chat.message',
  CHAT_TYPING: 'chat.typing',
} as const;

// ── API Versiyon ───────────────────────────────────────────────

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
