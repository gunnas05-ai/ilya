export type LoadType = 'tam_yuk' | 'kismi_yuk' | 'evden_eve' | 'sehir_ici';

export type LoadTypeLabel = 'Tam Yük' | 'Kısmi Yük' | 'Evden Eve' | 'Şehir İçi';

export interface LoadFormData {
  // Step 1 - Common
  loadType: LoadType | null;
  title: string;
  fromCity: string;
  fromDistrict: string;
  fromAddress: string;
  toCity: string;
  toDistrict: string;
  toAddress: string;
  contactName: string;
  contactPhone: string;
  pickupDate: Date | null;
  pickupTime: string;
  deliveryDate: Date | null;
  deliveryTime: string;
  description: string;

  // Step 2 - Tam Yük
  vehicleType?: string;
  trailerType?: string;
  totalWeight?: number;
  coldChain?: boolean;

  // Step 2 - Kısmi Yük
  partCount?: number;
  totalTonnage?: number;
  volume?: number;
  packageType?: string;
  sharedTransport?: boolean;
  urgency?: string;

  // Step 2 - Evden Eve
  homeVehicleType?: string;
  homeTrailerType?: string;
  transportType?: string;
  itemList?: string;
  senderFloor?: number;
  receiverFloor?: number;
  senderElevator?: boolean;
  receiverElevator?: boolean;
  packaging?: boolean;

  // Step 2 - Şehir İçi
  cityVehicleType?: string;
  cityTrailerType?: string;
  cityTransportType?: string;
  estimatedDistance?: number;
  deliveryTimeSlot?: string;
  cityUrgency?: string;
  loadSize?: string;

  // Step 3 - Pricing
  isAuction?: boolean;
  auctionMinPrice?: number;
  auctionMaxPrice?: number;
  auctionStartDate?: Date | null;
  auctionStartTime?: string;
  auctionEndDate?: Date | null;
  auctionEndTime?: string;
  cod?: boolean;
  insurance?: boolean;
  insurancePackage?: string;
  escrow?: boolean;
  pricingType?: 'tonaj' | 'komple';
  tonnage?: number;
  pricePerTon?: number;
  totalKg?: number;
  totalPrice?: number;
}

export interface PriceSummary {
  netAmount: number;
  vatAmount: number;
  vatRate: number;
  insuranceAmount: number;
  totalAmount: number;
  hasAuction: boolean;
  hasEscrow: boolean;
}

export interface LoadCreateResponse {
  id: string;
  success: boolean;
  message: string;
}
