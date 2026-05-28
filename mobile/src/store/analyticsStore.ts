import { create } from 'zustand';
import { analyticsService, ShipperDashboard, LaneAnalytics } from '../services/analyticsService';
import { carrierScoreService, CarrierScorecardFull } from '../services/carrierScoreService';

export type AnalyticsPeriod = 'all' | '7d' | '30d' | '90d' | '12m';

interface AnalyticsState {
  // Data
  shipperDashboard: ShipperDashboard | null;
  laneAnalytics: LaneAnalytics | null;
  carrierScorecard: CarrierScorecardFull | null;
  // Filters
  period: AnalyticsPeriod;
  // UI state
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: AnalyticsPeriod) => void;
  fetchShipperDashboard: () => Promise<void>;
  fetchLaneAnalytics: () => Promise<void>;
  fetchCarrierScorecard: () => Promise<void>;
  fetchAll: () => Promise<void>;
  refreshAll: () => Promise<void>;
  reset: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  shipperDashboard: null,
  laneAnalytics: null,
  carrierScorecard: null,
  period: '30d',
  loading: true,
  refreshing: false,
  error: null,

  setPeriod: (period) => set({ period }),

  fetchShipperDashboard: async () => {
    try {
      const data = await analyticsService.getShipperDashboard();
      set({ shipperDashboard: data });
    } catch { /* silent — handled by fetchAll */ }
  },

  fetchLaneAnalytics: async () => {
    try {
      const data = await analyticsService.getLaneAnalytics();
      set({ laneAnalytics: data });
    } catch { /* silent */ }
  },

  fetchCarrierScorecard: async () => {
    try {
      const data = await carrierScoreService.getMyScorecard();
      set({ carrierScorecard: data });
    } catch { /* silent */ }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchShipperDashboard(),
        get().fetchLaneAnalytics(),
        get().fetchCarrierScorecard(),
      ]);
    } catch {
      set({ error: 'Veriler yüklenemedi.' });
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  refreshAll: async () => {
    set({ refreshing: true, error: null });
    await get().fetchAll();
  },

  reset: () => set({
    shipperDashboard: null,
    laneAnalytics: null,
    carrierScorecard: null,
    period: '30d',
    loading: true,
    refreshing: false,
    error: null,
  }),
}));
