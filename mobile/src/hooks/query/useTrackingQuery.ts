import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { calculateDistance } from '../../services/trackingService';

export const trackingKeys = {
  all: ['tracking'] as const,
  detail: (loadId: string) => ['tracking', 'detail', loadId] as const,
};

/** Yuk takip detayi */
export function useTrackingDetail(loadId: string) {
  return useQuery({
    queryKey: trackingKeys.detail(loadId),
    queryFn: async () => {
      const res = await apiClient.get(`/tracking/${loadId}`);
      return res.data?.data || res.data;
    },
    enabled: !!loadId,
    refetchInterval: 10000,
  });
}

/** Mesafe hesaplama */
export function useDistanceCalculation(
  origin: { lat: number; lng: number } | null,
  dest: { lat: number; lng: number } | null,
) {
  return useQuery({
    queryKey: ['tracking', 'distance', origin, dest],
    queryFn: () => calculateDistance(origin!.lat, origin!.lng, dest!.lat, dest!.lng),
    enabled: !!origin && !!dest,
    staleTime: 5 * 60 * 1000,
  });
}
