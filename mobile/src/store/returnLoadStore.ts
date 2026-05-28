import { create } from 'zustand';
import { apiClient } from '../services/api';

export interface ReturnLoadResult {
  load: any;
  distanceKm: number;
  compatibilityScore: number;
  scoreBreakdown: {
    vehicleMatch: number;
    tonnageMatch: number;
    volumeMatch: number;
    dateMatch: number;
    distanceScore: number;
    routeEfficiency: number;
  };
}

interface ReturnLoadState {
  results: ReturnLoadResult[];
  total: number;
  radiusKm: number;
  loading: boolean;
  searched: boolean;
  error: string | null;
  deliveryLat: number;
  deliveryLng: number;
  searchReturnLoads: (lat: number, lng: number, radius?: number) => Promise<void>;
  reserveLoad: (loadId: string) => Promise<boolean>;
  releaseReservation: (loadId: string) => Promise<void>;
  setRadius: (radius: number) => void;
  reset: () => void;
}

export const useReturnLoadStore = create<ReturnLoadState>((set, get) => ({
  results: [],
  total: 0,
  radiusKm: 100,
  loading: false,
  searched: false,
  error: null,
  deliveryLat: 0,
  deliveryLng: 0,

  searchReturnLoads: async (lat, lng, radius?) => {
    set({ loading: true, deliveryLat: lat, deliveryLng: lng, error: null });
    try {
      const res = await apiClient.post('/return-loads/search', {
        deliveryLatitude: lat,
        deliveryLongitude: lng,
        radiusKm: radius || get().radiusKm,
      });
      set({
        results: res.data.data?.loads || [],
        total: res.data.data?.total || 0,
        searched: true,
        loading: false,
      });
    } catch {
      set({ loading: false, searched: true, error: 'Dönüş yükleri yüklenirken bir hata oluştu.' });
    }
  },

  reserveLoad: async (loadId: string): Promise<boolean> => {
    try {
      await apiClient.post('/return-loads/reserve', { loadId });
      return true;
    } catch {
      return false;
    }
  },

  releaseReservation: async (loadId: string): Promise<void> => {
    try {
      await apiClient.post('/return-loads/release-reservation', { loadId });
    } catch { /* ignore */ }
  },

  setRadius: (radius) => set({ radiusKm: radius }),

  reset: () => set({
    results: [],
    total: 0,
    loading: false,
    searched: false,
  }),
}));
