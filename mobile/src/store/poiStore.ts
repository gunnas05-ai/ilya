
import { create } from 'zustand';
import { apiClient } from '../services/api';

interface Point {
  latitude: number;
  longitude: number;
}

interface POIState {
  fuelStations: any[];
  restaurants: any[];
  showFuelStations: boolean;
  showRestaurants: boolean;
  loadingFuel: boolean;
  loadingRestaurants: boolean;

  toggleFuelStations: () => void;
  toggleRestaurants: () => void;
  fetchFuelStationsAlongRoute: (waypoints: Point[], radiusKm?: number) => Promise<void>;
  fetchRestaurantsAlongRoute: (waypoints: Point[], radiusKm?: number) => Promise<void>;
  clearPOIs: () => void;
}

export const usePoiStore = create<POIState>((set, get) => ({
  fuelStations: [],
  restaurants: [],
  showFuelStations: false,
  showRestaurants: false,
  loadingFuel: false,
  loadingRestaurants: false,

  toggleFuelStations: () => set((state) => ({ showFuelStations: !state.showFuelStations })),
  toggleRestaurants: () => set((state) => ({ showRestaurants: !state.showRestaurants })),

  fetchFuelStationsAlongRoute: async (waypoints, radiusKm = 10) => {
    if (waypoints.length < 2) return;
    set({ loadingFuel: true });
    try {
      // Map points to what backend expects: { lat, lng }
      const formattedWaypoints = waypoints.map(wp => ({ lat: wp.latitude, lng: wp.longitude }));
      const response = await apiClient.post('/fuel-stations/route', {
        waypoints: formattedWaypoints,
        radiusKm
      });
      // The backend returns an array of matched stations with distance
      set({ fuelStations: response.data?.data || [] });
    } catch (error) {
      console.error('Failed to fetch fuel stations along route:', error);
    } finally {
      set({ loadingFuel: false });
    }
  },

  fetchRestaurantsAlongRoute: async (waypoints, radiusKm = 10) => {
    if (waypoints.length < 2) return;
    set({ loadingRestaurants: true });
    try {
      const formattedWaypoints = waypoints.map(wp => ({ lat: wp.latitude, lng: wp.longitude }));
      const response = await apiClient.post('/restaurants/route', {
        waypoints: formattedWaypoints,
        radiusKm
      });
      set({ restaurants: response.data?.data || [] });
    } catch (error) {
      console.error('Failed to fetch restaurants along route:', error);
    } finally {
      set({ loadingRestaurants: false });
    }
  },

  clearPOIs: () => set({ fuelStations: [], restaurants: [], showFuelStations: false, showRestaurants: false })
}));
