import { apiClient } from './api';

export interface PriceEstimateParams {
  fromCity?: string;
  toCity?: string;
  distanceKm?: number;
  loadType?: string;
  tonnage?: number;
  totalKg?: number;
  isExplosive?: boolean;
  isHomeMove?: boolean;
  hasElevator?: boolean;
  workerCount?: number;
  vehicleType?: string;
  trailerType?: string;
  coldChain?: boolean;
}

export interface LaneHistoryEntry {
  month: string;
  rate: number;
}

export interface MarketHeatmapEntry {
  city: string;
  demandScore: number;
  demandLabel: string;
  avgLaneRate: number;
  activeLanes: number;
  totalVolume: number;
}

export interface MarketHeatmapData {
  heatmap: MarketHeatmapEntry[];
  fuelPrices: FuelPrices;
  updatedAt: string;
}

export interface FuelPrices {
  motorin: number;
  benzin: number;
  lpg: number;
  adblue: number;
  updatedAt: string;
  hoursSinceUpdate?: number;
  isStale?: boolean;
  isVeryStale?: boolean;
}

export interface PriceEstimateResult {
  estimate: {
    minPrice: number;
    maxPrice: number;
    currency: string;
    breakdown: {
      fuelCost: number;
      laborCost: number;
      riskFactor: number;
      specialCost: number;
      estimatedDays: number;
      workers: number;
      fuelConsumptionLiters: number;
      fuelType: string;
      fuelPricePerLiter: number;
      perKmCost: number;
    };
  };
  laneData: {
    fromCity: string;
    toCity: string;
    avgRate: number;
    minRate: number;
    maxRate: number;
    volume: string;
    trend: string;
  } | null;
  marketComparison: {
    laneAvgRate: number;
    laneRange: { min: number; max: number };
    yourRange: { min: number; max: number };
    comparison: 'below_market' | 'in_range' | 'above_market';
    percentDiff: number;
    laneVolume: string;
    trend: string;
    recommendation: string;
  } | null;
  fuelPrices: FuelPrices;
  marketHeatmap: {
    fromCity: string;
    fromDemandScore: number;
    fromDemandLabel: string;
    toCity: string;
    toDemandScore: number;
    toDemandLabel: string;
    netDemand: number;
    recommendation: string;
  } | null;
  validUntil: string;
}

export interface LaneRateResult {
  lane: { from: string; to: string };
  rates: {
    avgRate: number;
    minRate: number;
    maxRate: number;
    volume: string;
    trend: string;
  };
  fuelPrices: FuelPrices;
  historicalRates: LaneHistoryEntry[];
}

export interface LaneRatesHistoryResult {
  lane: { from: string; to: string };
  currentRate: number;
  history: LaneHistoryEntry[];
  fuelPrices: FuelPrices;
}

export const priceService = {
  /** Fiyat tahmini (15surusmodu.txt'deki formül ile) */
  estimate: async (params: PriceEstimateParams): Promise<PriceEstimateResult> => {
    const res = await apiClient.post('/loads/price-estimate', params);
    return res.data?.data || res.data;
  },

  /** Lane bazlı piyasa verileri */
  getLaneRates: async (fromCity: string, toCity: string): Promise<LaneRateResult> => {
    const res = await apiClient.post('/loads/lane-rates', { fromCity, toCity });
    return res.data?.data || res.data;
  },

  /** Lane fiyat geçmişi (30/90 gün) */
  getLaneRatesHistory: async (fromCity: string, toCity: string, months = 6): Promise<LaneRatesHistoryResult> => {
    const res = await apiClient.get('/loads/lane-rates-history', {
      params: { from: fromCity, to: toCity, months },
    });
    return res.data?.data || res.data;
  },

  /** Arz-talep ısı haritası */
  getMarketHeatmap: async (): Promise<MarketHeatmapData> => {
    const res = await apiClient.get('/loads/market-heatmap');
    return res.data?.data || res.data;
  },

  /** EX-006: Güncel akaryakıt fiyatları */
  getFuelPrices: async (includeHistory = false): Promise<{ latest: FuelPrices; history?: any[] }> => {
    const res = await apiClient.get('/loads/fuel-prices', { params: { history: includeHistory ? 'true' : 'false' } });
    return res.data?.data || res.data;
  },

  /** EX-006: EPDK fiyat çekmeyi manuel tetikle (admin) */
  triggerFuelScrape: async (): Promise<any> => {
    const res = await apiClient.post('/loads/trigger-fuel-scrape');
    return res.data?.data || res.data;
  },
};
