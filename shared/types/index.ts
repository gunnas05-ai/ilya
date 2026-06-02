/* ═══════════════════════════════════════════════════════════════
   KAPTAN PLATFORMU — Shared Type Definitions
   WEB + MOBIL + BACKEND ortak tip havuzu
   ═══════════════════════════════════════════════════════════════ */

// ── User & Auth ────────────────────────────────────────────────

export type UserRole =
  | 'yuk_veren' | 'tasiyici' | 'sofor' | 'filo_yoneticisi'
  | 'muhasebe' | 'operasyon' | 'destek' | 'platform_operatoru'
  | 'marketplace_satici' | 'marketplace_alici' | 'dispute_moderator'
  | 'isletme' | 'genel' | 'guest' | 'admin' | 'super_admin';

export type UIRole = 'FIRMA' | 'TASIYICI' | 'ISLETME' | 'GENEL';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  isPhoneVerified: boolean;
  companyTitle?: string;
  businessType?: string;
  licenseNumber?: string;
  plateNumber?: string;
  vehicleType?: string;
  tonnageCapacity?: number;
  volumeCapacity?: number;
  tcKimlikNo?: string;
  kBelgesi?: string;
  srcBelgesi?: string;
  iban?: string;
  taxNumber?: string;
  taxOffice?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Load ────────────────────────────────────────────────────────

export type LoadType = 'tam_yuk' | 'kismi_yuk' | 'evden_eve' | 'sehir_ici';
export type LoadStatus = 'active' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';

export interface Load {
  id: string;
  title: string;
  loadType: LoadType;
  status: LoadStatus;
  fromCity: string;
  fromDistrict?: string;
  fromAddress: string;
  toCity: string;
  toDistrict?: string;
  toAddress: string;
  contactName: string;
  contactPhone: string;
  pickupDate: string;
  deliveryDate: string;
  description?: string;
  price?: number;
  totalAmount?: number;
  escrowEnabled?: boolean;
  insuranceEnabled?: boolean;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Bid ─────────────────────────────────────────────────────────

export type BidStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';

export interface Bid {
  id: string;
  loadId: string;
  carrierId: string;
  amount: number;
  status: BidStatus;
  note?: string;
  platformCommission?: number;
  createdAt: string;
}

// ── Tracking ────────────────────────────────────────────────────

export interface TrackingRecord {
  id: string;
  loadId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  status?: string;
  driverName?: string;
  plateNumber?: string;
  timestamp: string;
}

// ── Finance ─────────────────────────────────────────────────────

export type IncomeType = 'logistics' | 'other';
export type ExpenseCategoryType = 'fuel' | 'maintenance' | 'toll' | 'food' | 'accommodation' | 'other';

export interface Income {
  id: string;
  amount: number;
  type: IncomeType;
  description?: string;
  date: string;
  userId: string;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  description?: string;
  date: string;
  userId: string;
  vehiclePlate?: string;
}

// ── Wallet & Escrow ─────────────────────────────────────────────

export type EscrowStatus = 'beklemede' | 'blokede' | 'teslimat_bekleniyor' | 'onaylandi' | 'serbest_birakildi';

export interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  escrowBalance: number;
  pendingRelease: number;
  cashbackBalance: number;
  creditBalance: number;
}

export interface EscrowTransaction {
  id: string;
  loadId: string;
  shipperId: string;
  carrierId: string;
  amount: number;
  status: EscrowStatus;
  createdAt: string;
}

// ── Invoice (GIB) ───────────────────────────────────────────────

export type InvoiceType = 'e_fatura' | 'e_arsiv' | 'proforma' | 'e_irsaliye' | 'ihracat' | 'tevkifatli';
export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'approved' | 'rejected' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  companyId: string;
  customerId: string;
  totalAmount: number;
  vatAmount: number;
  items: InvoiceItem[];
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discountPct?: number;
}

// ── Notification ────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
}

// ── API Response ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ── WebSocket Events ────────────────────────────────────────────

export type WsEventType =
  | 'load.created' | 'load.updated' | 'load.cancelled'
  | 'bid.placed' | 'bid.accepted' | 'bid.rejected'
  | 'tracking.update' | 'tracking.status_change'
  | 'escrow.created' | 'escrow.released' | 'escrow.dispute'
  | 'invoice.created' | 'invoice.status_change'
  | 'notification.new' | 'notification.read'
  | 'wallet.balance_change' | 'wallet.transaction'
  | 'chat.message' | 'chat.typing';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
  userId?: string;
}
