import { apiClient } from './api';

export const vehicleService = {
  getMyVehicles: async () => { const r = await apiClient.get('/vehicles/my'); return r.data?.data || r.data; },
  getVehicle: async (id: string) => { const r = await apiClient.get(`/vehicles/${id}`); return r.data?.data || r.data; },
  create: async (data: any) => { const r = await apiClient.post('/vehicles', data); return r.data?.data || r.data; },
  update: async (id: string, data: any) => { const r = await apiClient.put(`/vehicles/${id}`, data); return r.data?.data || r.data; },
  delete: async (id: string) => { const r = await apiClient.delete(`/vehicles/${id}`); return r.data; },
  uploadPhoto: async (vehicleId: string, fileUri: string, mimeType: string) => {
    const fd = new FormData();
    fd.append('file', { uri: fileUri, name: `vehicle_${Date.now()}.jpg`, type: mimeType } as any);
    const r = await apiClient.post(`/vehicles/${vehicleId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data;
  },
  deletePhoto: async (photoId: string) => { await apiClient.delete(`/vehicles/photos/${photoId}`); },
  checkSaleCriteria: async (id: string) => { const r = await apiClient.get(`/vehicles/${id}/check-sale`); return r.data; },

  // Categories
  getCategories: async () => { const r = await apiClient.get('/categories'); return r.data?.data || r.data; },
  getCategoryListings: async (slug: string, filters?: any) => { const r = await apiClient.get(`/categories/${slug}`, { params: filters }); return r.data?.data || r.data; },

  // Listings
  getListings: async (filters?: any) => { const r = await apiClient.get('/listings', { params: filters }); return r.data?.data || r.data; },
  getListing: async (id: string) => { const r = await apiClient.get(`/listings/${id}`); return r.data?.data || r.data; },
  createListing: async (data: any) => { const r = await apiClient.post('/listings', data); return r.data?.data || r.data; },
  placeBid: async (id: string, amount: number) => { const r = await apiClient.post(`/listings/${id}/bids`, { amount }); return r.data; },
  buyNow: async (id: string) => { const r = await apiClient.post(`/listings/${id}/buy`); return r.data; },

  // Escrow
  getEscrowStatus: async () => { const r = await apiClient.get('/admin/escrow/status'); return r.data; },
  toggleEscrow: async () => { const r = await apiClient.post('/admin/escrow/toggle'); return r.data; },
};
