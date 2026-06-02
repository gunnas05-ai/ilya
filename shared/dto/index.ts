/* ═══════════════════════════════════════════════════════════════
   KAPTAN PLATFORMU — Shared DTO Definitions
   Backend API ile birebir aynı — WEB + MOBIL ortak
   ═══════════════════════════════════════════════════════════════ */

// ── Auth ────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  uiRole: 'FIRMA' | 'TASIYICI' | 'ISLETME' | 'GENEL';
  kvkkAccepted: boolean;
  termsAccepted: boolean;
  companyTitle?: string;
  taxNumber?: string;
  taxOffice?: string;
  authorizedPerson?: string;
  licenseType?: string;
  vehicleType?: string;
  plateNumber?: string;
  srcBelgeNo?: string;
  businessType?: string;
  businessAddress?: string;
  inviteCode?: string;
}

export interface VerifyOtpDto {
  userId: string;
  otpCode: string;
}

export interface RefreshDto {
  refreshToken: string;
}

// ── Load ────────────────────────────────────────────────────────

export interface CreateLoadDto {
  title: string;
  loadType: string;
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
  vehicleType?: string;
  trailerType?: string;
  totalWeight?: number;
  tonnage?: number;
  volume?: number;
  partCount?: number;
  coldChain?: boolean;
  urgency?: string;
  isAuction?: boolean;
  auctionMinPrice?: number;
  auctionMaxPrice?: number;
  pricingType?: 'tonaj' | 'komple';
  pricePerTon?: number;
  totalPrice?: number;
  escrow?: boolean;
  insurance?: boolean;
  cod?: boolean;
}

// ── Bid ─────────────────────────────────────────────────────────

export interface CreateBidDto {
  loadId: string;
  amount: number;
  note?: string;
  estimatedDays?: number;
}

// ── Finance ─────────────────────────────────────────────────────

export interface CreateExpenseDto {
  amount: number;
  description: string;
  categoryId?: string;
  date?: string;
  vehiclePlate?: string;
  paymentMethod?: string;
}

export interface CreateIncomeDto {
  amount: number;
  type: 'logistics' | 'other';
  description?: string;
  date?: string;
}

// ── Vehicle ─────────────────────────────────────────────────────

export interface CreateVehicleDto {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  color?: string;
  plate?: string;
  description?: string;
  hasAccident?: boolean;
  accidentDetail?: string;
}

// ── Marketplace ─────────────────────────────────────────────────

export interface CreateListingDto {
  title: string;
  categoryId: string;
  price: number;
  description?: string;
  city: string;
  district?: string;
  vehicleType?: string;
  brand?: string;
  model?: string;
  modelYear?: number;
  trailerType?: string;
}

// ── Invoice ─────────────────────────────────────────────────────

export interface CreateInvoiceDto {
  invoiceType: string;
  companyId: string;
  customerId: string;
  totalAmount: number;
  vatAmount?: number;
  items: InvoiceItemDto[];
  description?: string;
  loadId?: string;
}

export interface InvoiceItemDto {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discountPct?: number;
}

// ── Wallet / Escrow ────────────────────────────────────────────

export interface WithdrawDto {
  amount: number;
  iban: string;
  bankName?: string;
  accountHolderName?: string;
  description?: string;
}

export interface OpenDisputeDto {
  reason: string;
  description: string;
  evidence?: string[];
}

// ── Settings ────────────────────────────────────────────────────

export interface CreateApiKeyDto {
  name: string;
  permissions: string[];
  rateLimit?: number;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  events: string[];
  secret?: string;
}
