import { create } from 'zustand';
import { bidService } from '../services/bidService';
import { loadService } from '../services/loadService';
import { useAuthStore } from './authStore';
import { Bid } from '../types/loadAccept';

export interface RecommendedLoad {
  load: any;
  matchScore: number;       // 0-100
  matchBreakdown: {
    vehicleMatch: number;   // %
    distanceEff: number;    // %
    earningsRatio: number;  // %
    emptyKm: number;        // actual km
    emptyKmPenalty: number; // %
  };
}

interface LoadAcceptState {
  loads: any[];
  recommendedLoads: RecommendedLoad[];
  recommendedLoaded: boolean;
  recommendedLoading: boolean;
  bids: Bid[];
  myBids: Bid[];
  loaded: boolean;
  bidsLoaded: boolean;
  loading: boolean;
  totalPages: number;
  currentPage: number;
  favorites: Record<string, boolean>;
  fetchLoads: (params?: any) => Promise<void>;
  fetchRecommendedLoads: (params?: {
    vehicleType?: string;
    trailerType?: string;
    tonnageCapacity?: number;
    volumeCapacity?: number;
    currentLatitude?: number;
    currentLongitude?: number;
    maxEmptyKm?: number;
  }) => Promise<void>;
  fetchBidsForLoad: (loadId: string) => Promise<void>;
  fetchMyBids: () => Promise<void>;
  placeBid: (loadId: string, amount: number, note: string, estimatedDays: number, hasReturn: boolean, validMin: number) => Promise<Bid>;
  acceptCounter: (bidId: string) => Promise<void>;
  rejectBid: (bidId: string) => Promise<void>;
  cancelBid: (bidId: string) => Promise<void>;
  toggleFavorite: (loadId: string) => void;
  isFavorite: (loadId: string) => boolean;
}

function mapApiBidToBid(apiBid: any): Bid {
  return {
    id: apiBid.id,
    loadId: apiBid.loadId,
    carrierId: apiBid.carrierId,
    carrierName: apiBid.carrier?.fullName || 'Bilinmeyen',
    amount: apiBid.amount,
    note: apiBid.note,
    estimatedDeliveryDays: apiBid.estimatedDeliveryDays,
    hasReturnLoad: apiBid.hasReturnLoad,
    validUntil: apiBid.validUntil,
    status: apiBid.status,
    createdAt: apiBid.createdAt,
    counterAmount: apiBid.counterAmount,
    counterNote: apiBid.counterNote,
    platformCommission: apiBid.platformCommission,
    escrowFee: apiBid.escrowFee,
    vat: apiBid.vat,
    netAmount: apiBid.netAmount,
    carrierScore: apiBid.carrierScore || null,
  };
}

function mapApiLoadToAvailable(apiLoad: any) {
  return {
    loadId: apiLoad.id,
    title: apiLoad.title,
    loadType: apiLoad.loadType,
    fromCity: apiLoad.fromCity,
    fromDistrict: apiLoad.fromDistrict,
    toCity: apiLoad.toCity,
    toDistrict: apiLoad.toDistrict,
    pickupDate: apiLoad.pickupDate,
    deliveryDate: apiLoad.deliveryDate,
    bidCount: apiLoad.bidCount || 0,
    creatorId: apiLoad.creatorId,
    createdAt: apiLoad.createdAt,
    tonnage: apiLoad.totalTonnage,
    volume: apiLoad.volume,
    vehicleType: apiLoad.vehicleType,
    trailerType: apiLoad.trailerType,
    coldChain: apiLoad.coldChain,
    urgency: apiLoad.urgency,
    insurance: apiLoad.insurance,
    insurancePackage: apiLoad.insurancePackage,
    routeDistance: apiLoad.routeDistance,
    pickupLat: apiLoad.pickupLatitude,
    pickupLng: apiLoad.pickupLongitude,
    totalPrice: apiLoad.totalPrice,
    escrow: apiLoad.escrow,
    isAuction: apiLoad.isAuction,
    pricingType: apiLoad.pricingType,
    pricePerTon: apiLoad.pricePerTon,
  };
}

export const useLoadAcceptStore = create<LoadAcceptState>((set, get) => ({
  loads: [],
  recommendedLoads: [],
  recommendedLoaded: false,
  recommendedLoading: false,
  bids: [],
  myBids: [],
  loaded: false,
  bidsLoaded: false,
  loading: false,
  totalPages: 1,
  currentPage: 1,
  favorites: {},

  fetchLoads: async (params) => {
    set({ loading: true });
    try {
      const result = await loadService.getAll(params);
      set({
        loads: (result.loads || []).map(mapApiLoadToAvailable),
        totalPages: result.totalPages || 1,
        currentPage: result.page || 1,
        loaded: true,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchRecommendedLoads: async (params) => {
    set({ recommendedLoading: true });
    try {
      const result = await loadService.getRecommended(params);
      set({
        recommendedLoads: result.recommendations || [],
        recommendedLoaded: true,
        recommendedLoading: false,
      });
    } catch {
      set({ recommendedLoaded: true, recommendedLoading: false });
    }
  },

  fetchBidsForLoad: async (loadId) => {
    try {
      const apiBids = await bidService.getBidsForLoad(loadId);
      set({ bids: (apiBids || []).map(mapApiBidToBid), bidsLoaded: true });
    } catch {
      set({ bids: [], bidsLoaded: true });
    }
  },

  fetchMyBids: async () => {
    try {
      const apiBids = await bidService.getMyBids();
      set({ myBids: (apiBids || []).map(mapApiBidToBid) });
    } catch {
      set({ myBids: [] });
    }
  },

  placeBid: async (loadId, amount, note, estimatedDays, hasReturn, validMin) => {
    const apiBid = await bidService.placeBid({
      loadId,
      amount,
      note,
      estimatedDeliveryDays: estimatedDays,
      hasReturnLoad: hasReturn,
      validDuration: validMin,
    });
    const bid = mapApiBidToBid(apiBid);
    set((s) => ({ myBids: [bid, ...s.myBids] }));
    return bid;
  },

  acceptCounter: async (bidId) => {
    await bidService.acceptCounter(bidId);
    set((s) => ({
      bids: s.bids.map((b) => (b.id === bidId ? { ...b, status: 'accepted' as any } : b)),
    }));
  },

  rejectBid: async (bidId) => {
    await bidService.rejectBid(bidId);
    set((s) => ({
      bids: s.bids.map((b) => (b.id === bidId ? { ...b, status: 'rejected' as any } : b)),
    }));
  },

  cancelBid: async (bidId) => {
    await bidService.cancelBid(bidId);
    set((s) => ({
      myBids: s.myBids.map((b) => (b.id === bidId ? { ...b, status: 'expired' as any } : b)),
    }));
  },

  toggleFavorite: (loadId) => {
    const { favorites } = get();
    const updated = { ...favorites };
    if (updated[loadId]) delete updated[loadId];
    else updated[loadId] = true;
    set({ favorites: updated });
  },

  isFavorite: (loadId) => !!get().favorites[loadId],
}));
