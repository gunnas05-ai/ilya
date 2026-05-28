import { apiClient } from './api';

export interface LoadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  loadType?: string;
  fromCity?: string;
  toCity?: string;
  vehicleType?: string;
  coldChain?: boolean;
  urgent?: boolean;
  escrow?: boolean;
  minTonnage?: number;
  maxTonnage?: number;
  minVolume?: number;
  maxVolume?: number;
  minDistance?: number;
  maxDistance?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const loadService = {
  getAll: async (params?: LoadQueryParams) => {
    const res = await apiClient.get('/loads', { params });
    return res.data.data;
  },

  getById: async (id: string) => {
    const res = await apiClient.get(`/loads/${id}`);
    return res.data.data;
  },

  create: async (data: any) => {
    const res = await apiClient.post('/loads', data);
    return res.data.data;
  },

  update: async (id: string, data: any) => {
    const res = await apiClient.put(`/loads/${id}`, data);
    return res.data.data;
  },

  getMyLoads: async () => {
    const res = await apiClient.get('/loads/my');
    return res.data.data;
  },

  /** EX-007: Get AI-recommended loads with Smatch compatibility scores */
  getRecommended: async (params?: {
    vehicleType?: string;
    trailerType?: string;
    tonnageCapacity?: number;
    volumeCapacity?: number;
    currentLatitude?: number;
    currentLongitude?: number;
    maxEmptyKm?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get('/loads/recommended', { params });
    return res.data?.data || res.data;
  },

  /** Get 5 most recent loads for homepage */
  getRecent: async () => {
    const res = await apiClient.get('/loads/recent');
    const data = res.data?.data || res.data;
    // NestJS wrap: { success:true, data: { loads: [...] } } veya { loads: [...] }
    return data?.loads || data?.data || (Array.isArray(data) ? data : []);
  },

  /** Role-based load ranking */
  getRanking: async (role?: string) => {
    const res = await apiClient.get('/loads/ranking', { params: { role } });
    return res.data?.data || res.data;
  },

  /** Check invoice status for a load (role-based button visibility) */
  getInvoiceStatus: async (loadId: string) => {
    const res = await apiClient.get(`/loads/${loadId}/invoice-status`);
    return res.data?.data || res.data;
  },

  /** UX-001: Instant Book — Hemen Al ile aninda yuk kapma */
  instantBook: async (loadId: string) => {
    const res = await apiClient.post(`/loads/${loadId}/instant-book`);
    return res.data?.data || res.data;
  },
};
