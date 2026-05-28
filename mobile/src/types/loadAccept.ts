export type BidStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';

import type { ScoreTier } from '../components/CarrierScoreBadge';

export interface CarrierScoreInfo {
  overallScore: number;
  scoreTier: ScoreTier;
  tierLabel: string;
  tierColor: string;
  totalCompletedLoads?: number;
  escrowRequired?: boolean;
}

export interface Bid {
  id: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
  amount: number;
  note: string;
  estimatedDeliveryDays: number;
  hasReturnLoad: boolean;
  validUntil: string;
  status: BidStatus;
  createdAt: string;
  counterAmount?: number;
  counterNote?: string;
  platformCommission?: number;
  escrowFee?: number;
  vat?: number;
  netAmount?: number;
  /** EX-008: Carrier performance score */
  carrierScore?: CarrierScoreInfo | null;
}

export interface AvailableLoad {
  loadId: string;
  title: string;
  loadType: string;
  fromCity: string;
  fromDistrict: string;
  toCity: string;
  toDistrict: string;
  pickupDate: string;
  deliveryDate: string;
  tonnage?: number;
  volume?: number;
  vehicleType?: string;
  trailerType?: string;
  coldChain?: boolean;
  urgency?: string;
  insurance?: boolean;
  insurancePackage?: string;
  escrow?: boolean;
  isAuction?: boolean;
  pricingType?: string;
  pricePerTon?: number;
  totalPrice?: number;
  bidCount: number;
  creatorId: string;
  createdAt: string;
  routeDistance?: number;
  pickupLat?: number;
  pickupLng?: number;
}

export const BID_DURATION_OPTIONS = [
  { value: 15, label: '15 Dakika' },
  { value: 30, label: '30 Dakika' },
  { value: 60, label: '1 Saat' },
  { value: 120, label: '2 Saat' },
  { value: 1440, label: '24 Saat' },
];
