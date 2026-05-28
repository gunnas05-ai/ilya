import { apiClient } from './api';

export interface FuelStationFilters {
  city?: string;
  district?: string;
  brand?: string;
  serviceTypes?: string[];
  fuelType?: string;
  is247?: boolean;
  hasCharging?: boolean;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'rating' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  search?: string;
}

export interface FuelPriceReport {
  fuelType: string;
  price: number;
}

export const fuelStationService = {
  getAll: async (filters?: FuelStationFilters) => {
    const params = {
      ...filters,
      serviceTypes: filters?.serviceTypes?.join(','),
    };
    const res = await apiClient.get('/fuel-stations', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await apiClient.get(`/fuel-stations/${id}`);
    return res.data;
  },

  getNearby: async (lat: number, lng: number, radius?: number, fuelType?: string) => {
    const res = await apiClient.get('/fuel-stations/nearby', {
      params: { lat: lat.toString(), lng: lng.toString(), radius, fuelType },
    });
    return res.data;
  },

  getAlongRoute: async (waypoints: { lat: number; lng: number }[], radiusKm?: number, fuelType?: string) => {
    const res = await apiClient.post('/fuel-stations/route', { waypoints, radiusKm, fuelType });
    return res.data;
  },

  getRouteRecommendations: async (waypoints: { lat: number; lng: number }[], fuelType?: string) => {
    const res = await apiClient.post('/fuel-stations/route/recommendations', { waypoints, fuelType });
    return res.data;
  },

  comparePrices: async (params?: any) => {
    const res = await apiClient.get('/fuel-stations/prices/compare', { params });
    return res.data;
  },

  reportPrice: async (stationId: string, data: FuelPriceReport) => {
    const res = await apiClient.post(`/fuel-stations/${stationId}/prices/report`, data);
    return res.data;
  },

  getPriceHistory: async (stationId: string, fuelType: string, days?: number) => {
    const res = await apiClient.get(`/fuel-stations/${stationId}/prices/history`, {
      params: { fuelType, days },
    });
    return res.data;
  },

  getBrands: async () => {
    const res = await apiClient.get('/fuel-stations/brands/list');
    return res.data;
  },

  addReview: async (stationId: string, rating: number, comment: string) => {
    const res = await apiClient.post(`/fuel-stations/${stationId}/reviews`, { rating, comment });
    return res.data;
  },

  getReviews: async (stationId: string) => {
    const res = await apiClient.get(`/fuel-stations/${stationId}/reviews`);
    return res.data;
  },

  toggleFavorite: async (stationId: string, isFav: boolean, note?: string) => {
    if (isFav) {
      const res = await apiClient.post(`/fuel-stations/${stationId}/favorite`, { note });
      return res.data;
    } else {
      const res = await apiClient.delete(`/fuel-stations/${stationId}/favorite`);
      return res.data;
    }
  },

  getMyFavorites: async () => {
    const res = await apiClient.get('/fuel-stations/favorites/my');
    return res.data;
  },

  create: async (data: any) => {
    const res = await apiClient.post('/fuel-stations', data);
    return res.data;
  },

  update: async (id: string, data: any) => {
    const res = await apiClient.put(`/fuel-stations/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await apiClient.delete(`/fuel-stations/${id}`);
    return res.data;
  },

  // EX-010: Bulk import + EPDK + Staleness

  /** Toplu fiyat güncelleme (CSV/JSON) */
  bulkImportPrices: async (stationId: string, prices: Array<{ fuelType: string; price: number }>) => {
    const res = await apiClient.post('/fuel-stations/prices/bulk-import', { stationId, prices });
    return res.data;
  },

  /** EPDK tavan/referans fiyatlar + stale station'lar */
  getEpdkReference: async () => {
    const res = await apiClient.get('/fuel-stations/prices/epdk-reference');
    return res.data;
  },

  /** Fiyat güncelliği kontrolü — 24/48 saat eskiyen fiyatlar */
  getStalePrices: async (stationId?: string) => {
    const res = await apiClient.get('/fuel-stations/prices/stale', { params: { stationId } });
    return res.data;
  },

  /** Fiyat alarmı oluştur */
  createAlert: async (data: { alertType: string; fuelType?: string; priceThreshold?: number; brand?: string; region?: string }) => {
    const res = await apiClient.post('/fuel-stations/alerts', data);
    return res.data;
  },

  /** Fiyat alarmlarım */
  getMyAlerts: async () => {
    const res = await apiClient.get('/fuel-stations/alerts/my');
    return res.data;
  },

  /** Alarm kapat */
  disableAlert: async (alertId: string) => {
    const res = await apiClient.post(`/fuel-stations/alerts/${alertId}/disable`);
    return res.data;
  },
};
