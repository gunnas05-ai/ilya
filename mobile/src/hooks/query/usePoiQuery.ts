import { useQuery } from '@tanstack/react-query';
import { fuelStationService } from '../../services/fuelStationService';
import { restaurantService } from '../../services/restaurantService';

export const poiKeys = {
  all: ['poi'] as const,
  fuelStations: (filters?: Record<string, any>) => ['poi', 'fuel-stations', filters] as const,
  fuelStationDetail: (id: string) => ['poi', 'fuel-station', id] as const,
  fuelPrices: () => ['poi', 'fuel-prices'] as const,
  nearbyFuelStations: (lat: number, lng: number, radius?: number) => ['poi', 'fuel-nearby', lat, lng, radius] as const,
  restaurants: (filters?: Record<string, any>) => ['poi', 'restaurants', filters] as const,
  restaurantDetail: (id: string) => ['poi', 'restaurant', id] as const,
  nearbyRestaurants: (lat: number, lng: number, radius?: number) => ['poi', 'restaurants-nearby', lat, lng, radius] as const,
};

/** Akaryakit istasyonlari listesi */
export function useFuelStations(filters?: Record<string, any>) {
  return useQuery({
    queryKey: poiKeys.fuelStations(filters),
    queryFn: () => fuelStationService.getAll(filters),
  });
}

/** Belirli bir akaryakit istasyonu */
export function useFuelStationDetail(id: string) {
  return useQuery({
    queryKey: poiKeys.fuelStationDetail(id),
    queryFn: () => fuelStationService.getById(id),
    enabled: !!id,
  });
}

/** Yakin akaryakit istasyonlari */
export function useNearbyFuelStations(lat: number, lng: number, radiusKm: number = 30) {
  return useQuery({
    queryKey: poiKeys.nearbyFuelStations(lat, lng, radiusKm),
    queryFn: () => fuelStationService.getNearby(lat, lng, radiusKm),
    enabled: !!lat && !!lng,
  });
}

/** Restoran listesi */
export function useRestaurants(filters?: Record<string, any>) {
  return useQuery({
    queryKey: poiKeys.restaurants(filters),
    queryFn: () => restaurantService.getAll(filters),
  });
}

/** Belirli bir restoran */
export function useRestaurantDetail(id: string) {
  return useQuery({
    queryKey: poiKeys.restaurantDetail(id),
    queryFn: () => restaurantService.getById(id),
    enabled: !!id,
  });
}

/** Yakin restoranlar */
export function useNearbyRestaurants(lat: number, lng: number, radiusKm: number = 30) {
  return useQuery({
    queryKey: poiKeys.nearbyRestaurants(lat, lng, radiusKm),
    queryFn: () => restaurantService.getNearby(lat, lng, radiusKm),
    enabled: !!lat && !!lng,
  });
}
