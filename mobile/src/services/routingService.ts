import { apiClient } from './api';

export interface VehicleProfile {
  height: number;
  width: number;
  length: number;
  totalWeight: number;
  axleWeight: number;
  adrClass?: string;
  trailerType?: string;
  hasRefrigeration?: boolean;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface TruckRouteResult {
  route: {
    coordinates: RoutePoint[];
    totalDistanceKm: number;
    estimatedMinutes: number;
    estimatedArrival: string;
  };
  vehicleProfile: VehicleProfile;
  safetyCheck: {
    totalRestrictionsNearby: number;
    unsafeCount: number;
    isRouteSafe: boolean;
    warnings: Array<{
      name: string;
      type: string;
      maxHeight: number;
      maxWeight: number;
      vehicleHeight: number;
      vehicleWeight: number;
      distanceKm: number;
      description: string;
    }>;
    allNearby: Array<{
      name: string;
      type: string;
      clear: boolean;
      distanceKm: number;
    }>;
  };
  truckSpeedLimitKmh: number;
}

export const routingService = {
  calculateTruckRoute: async (
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints: RoutePoint[],
    vehicleProfile: Partial<VehicleProfile>,
  ): Promise<TruckRouteResult> => {
    const res = await apiClient.post('/routing/truck-route', {
      origin,
      destination,
      waypoints,
      vehicleProfile,
    });
    return res.data?.data || res.data;
  },

  getRestrictions: async (lat: number, lng: number, radius = 50) => {
    const res = await apiClient.get('/routing/restrictions', {
      params: { lat, lng, radius },
    });
    return res.data?.data || res.data;
  },

  checkBridgeClearance: async (vehicleHeight: number, coordinates: RoutePoint[]) => {
    const res = await apiClient.post('/routing/check-bridge', {
      vehicleHeight,
      routeCoordinates: coordinates,
    });
    return res.data?.data || res.data;
  },
};
