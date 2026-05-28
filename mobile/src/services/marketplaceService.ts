import { apiClient } from './api';

export interface ListingData {
  id?: string;
  title: string;
  categoryId: number;
  price: number;
  description: string;
  fullAddress: string;
  city: string;
  district: string;
  isNegotiable?: boolean;
  isBarterAvailable?: boolean;
  coverImageUrl?: string;
  imageUrls?: string[];
  vehicleDetail?: any;
  aiRiskScore?: number;
  status?: string;
  viewCount?: number;
  createdAt?: string;
}

export interface ListingOfferData {
  id?: string;
  listingId: string;
  offerAmount: number;
  message?: string;
  isBarterOffer?: boolean;
  barterItems?: any[];
  status?: string;
  counterAmount?: number;
  counterMessage?: string;
  createdAt?: string;
}

export const marketplaceService = {
  // Categories
  getCategories: async () => {
    const res = await apiClient.get('/marketplace/categories');
    return res.data?.data || res.data || [];
  },

  // Listings
  getListings: async (params?: any) => {
    const res = await apiClient.get('/marketplace/listings', { params });
    return res.data?.data || res.data;
  },

  getListing: async (id: string) => {
    const res = await apiClient.get(`/marketplace/listings/${id}`);
    return res.data?.data || res.data;
  },

  createListing: async (data: ListingData) => {
    const res = await apiClient.post('/marketplace/listings', data);
    return res.data?.data || res.data;
  },

  updateListing: async (id: string, data: Partial<ListingData>) => {
    const res = await apiClient.put(`/marketplace/listings/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteListing: async (id: string) => {
    const res = await apiClient.delete(`/marketplace/listings/${id}`);
    return res.data?.data || res.data;
  },

  // Towing Compatibility
  checkTowingCompatibility: async (tractorListingId: string, trailerListingId: string) => {
    const res = await apiClient.post('/marketplace/towing/check', { tractorListingId, trailerListingId });
    return res.data?.data || res.data;
  },

  // Offers
  createOffer: async (data: { listingId: string; offerAmount: number; message?: string; isBarterOffer?: boolean; barterItems?: any[] }) => {
    const res = await apiClient.post('/marketplace/offers', data);
    return res.data?.data || res.data;
  },

  getOffersForListing: async (listingId: string) => {
    const res = await apiClient.get(`/marketplace/offers/listing/${listingId}`);
    return res.data?.data || res.data || [];
  },

  getMyOffers: async () => {
    const res = await apiClient.get('/marketplace/offers/my');
    return res.data?.data || res.data || [];
  },

  acceptOffer: async (offerId: string) => {
    const res = await apiClient.post(`/marketplace/offers/${offerId}/accept`);
    return res.data?.data || res.data;
  },

  rejectOffer: async (offerId: string) => {
    const res = await apiClient.post(`/marketplace/offers/${offerId}/reject`);
    return res.data?.data || res.data;
  },

  counterOffer: async (offerId: string, counterAmount: number, counterMessage?: string) => {
    const res = await apiClient.post(`/marketplace/offers/${offerId}/counter`, { counterAmount, counterMessage });
    return res.data?.data || res.data;
  },
};
