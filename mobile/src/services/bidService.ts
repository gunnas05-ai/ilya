import { apiClient } from './api';

export interface PlaceBidParams {
  loadId: string;
  amount: number;
  note: string;
  estimatedDeliveryDays: number;
  hasReturnLoad: boolean;
  validDuration: number;
}

export const bidService = {
  placeBid: async (data: PlaceBidParams) => {
    const res = await apiClient.post('/bids', data);
    return res.data.data;
  },

  getMyBids: async () => {
    const res = await apiClient.get('/bids/my');
    return res.data.data;
  },

  getBidsForLoad: async (loadId: string) => {
    const res = await apiClient.get(`/bids/load/${loadId}`);
    return res.data.data;
  },

  acceptBid: async (id: string) => {
    const res = await apiClient.put(`/bids/${id}/accept`);
    return res.data.data;
  },

  rejectBid: async (id: string) => {
    const res = await apiClient.put(`/bids/${id}/reject`);
    return res.data.data;
  },

  counterBid: async (id: string, counterAmount: number, counterNote: string) => {
    const res = await apiClient.put(`/bids/${id}/counter`, { counterAmount, counterNote });
    return res.data.data;
  },

  acceptCounter: async (id: string) => {
    const res = await apiClient.put(`/bids/${id}/accept-counter`);
    return res.data.data;
  },

  cancelBid: async (id: string) => {
    const res = await apiClient.put(`/bids/${id}/cancel`);
    return res.data.data;
  },
};
