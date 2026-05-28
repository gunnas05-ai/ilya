import { apiClient } from './api';

export interface RestaurantFilters {
  city?: string;
  district?: string;
  hasTirParking?: boolean;
  is247?: boolean;
  minRating?: number;
  page?: number;
  limit?: number;
  search?: string;
}

export interface PreOrderInput {
  eta: string; // e.g. "18:00'de oradayım"
  items: {
    menuItemId: string;
    quantity: number;
    notes?: string;
  }[];
}

export const restaurantService = {
  getAll: async (filters?: RestaurantFilters) => {
    const res = await apiClient.get('/restaurants', { params: filters });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await apiClient.get(`/restaurants/${id}`);
    return res.data;
  },

  getNearby: async (lat: number, lng: number, radius?: number) => {
    const res = await apiClient.get('/restaurants/nearby', {
      params: { lat: lat.toString(), lng: lng.toString(), radius },
    });
    return res.data;
  },

  getAlongRoute: async (waypoints: { lat: number; lng: number }[], radiusKm?: number) => {
    const res = await apiClient.post('/restaurants/route', { waypoints, radiusKm });
    return res.data;
  },

  getReviews: async (id: string) => {
    const res = await apiClient.get(`/restaurants/${id}/reviews`);
    return res.data;
  },

  addReview: async (id: string, data: { rating: number; comment: string; menuItemId?: string }) => {
    const res = await apiClient.post(`/restaurants/${id}/reviews`, data);
    return res.data;
  },

  createReservation: async (id: string, preOrder: PreOrderInput) => {
    // A pre-order maps to the NestJS reservation system in the backend
    const res = await apiClient.post(`/restaurants/${id}/reservations`, preOrder);
    return res.data;
  },

  toggleFavorite: async (id: string, isFav: boolean) => {
    if (isFav) {
      const res = await apiClient.post(`/restaurants/${id}/favorite`);
      return res.data;
    } else {
      const res = await apiClient.delete(`/restaurants/${id}/favorite`);
      return res.data;
    }
  },

  getMyFavorites: async () => {
    const res = await apiClient.get('/restaurants/favorites/my');
    return res.data;
  },

  create: async (data: any) => {
    const res = await apiClient.post('/restaurants', data);
    return res.data;
  },

  update: async (id: string, data: any) => {
    const res = await apiClient.put(`/restaurants/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await apiClient.delete(`/restaurants/${id}`);
    return res.data;
  },

  /** EX-016: Kitchen Screen — get all active reservations for restaurant owner */
  getMyKitchenReservations: async () => {
    const res = await apiClient.get('/restaurants/kitchen/reservations');
    return res.data?.data || res.data;
  },

  updateReservationStatus: async (id: string, status: string) => {
    const res = await apiClient.post(`/restaurants/reservations/${id}/status`, { status });
    return res.data;
  },
};
