/** Standard API response types — shared across all web pages */

// Shared merkezi tipler (opsiyonel import)
export type { WsEvent, WsEventType, TrackingRecord, EscrowTransaction } from '@kaptan/shared';

// ── Core response wrappers ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  success?: boolean;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// ── Domain types ──────────────────────────────────────────────────────────

export interface Load {
  id: string;
  title: string;
  loadType: 'tam_yuk' | 'kismi_yuk' | 'evden_eve' | 'sehir_ici';
  originCity: string;
  destCity: string;
  fromCity?: string;
  toCity?: string;
  originDistrict?: string;
  destDistrict?: string;
  fromDistrict?: string;
  toDistrict?: string;
  originAddress?: string;
  destAddress?: string;
  contactName?: string;
  contactPhone?: string;
  pickupDate?: string;
  deliveryDate?: string;
  vehicleType?: string;
  trailerType?: string;
  totalWeight?: number;
  tonnage?: number;
  volume?: number;
  partCount?: number;
  coldChain?: boolean;
  urgency?: string;
  description?: string;
  escrow?: boolean;
  insurance?: boolean;
  isAuction?: boolean;
  cod?: boolean;
  totalPrice?: number;
  price?: number;
  status: 'pending' | 'active' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  creatorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bid {
  id: string;
  loadId: string;
  carrierId: string;
  carrierName?: string;
  carrier?: { fullName: string };
  amount: number;
  note?: string;
  estimatedDeliveryDays?: number;
  hasReturnLoad?: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  platformCommission?: number;
  escrowFee?: number;
  vat?: number;
  netAmount?: number;
  createdAt?: string;
}

export interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  dbRole?: string;
  profileStatus?: string;
  isActive?: boolean;
  isPhoneVerified?: boolean;
  companyTitle?: string;
  companyName?: string;
  taxNumber?: string;
  plateNumber?: string;
  kBelgesi?: string;
  srcBelgesi?: string;
  createdAt?: string;
}

export interface FinanceRecord {
  id: string;
  type?: string;
  category?: string;
  amount: number;
  description?: string;
  date?: string;
  vehiclePlate?: string;
  paymentMethod?: string;
  createdAt?: string;
}

export interface TrackingPosition {
  loadId: string;
  title?: string;
  plate?: string;
  driver?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  status?: string;
  timestamp?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'escrow_lock' | 'escrow_release';
  amount: number;
  description?: string;
  balanceAfter?: number;
  createdAt?: string;
}

export interface FuelStation {
  id: string;
  name: string;
  brand?: string;
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  is247?: boolean;
  prices?: FuelPrice[];
  services?: string[];
}

export interface FuelPrice {
  fuelType: string;
  price: number;
  updatedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  capacity?: number;
  hasTirParking?: boolean;
  averageRating?: number;
  menus?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  isPopular?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: 'draft' | 'pending' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  supplierName?: string;
  customerName?: string;
  totalAmount?: number;
  vatAmount?: number;
  issueDate?: string;
  createdAt?: string;
}
