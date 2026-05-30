import { useQuery } from '@tanstack/react-query';
import { trackingService } from '../../services/trackingService';

export const trackingKeys = {
  all: ['tracking'] as const,
  detail: (loadId: string) => ['tracking', 'detail', loadId] as const,
};

/** Yuk takip detayi */
export function useTrackingDetail(loadId: string) {
  return useQuery({
    queryKey: trackingKeys.detail(loadId),
    queryFn: () => trackingService.getTracking(loadId),
    enabled: !!loadId,
    refetchInterval: 10000, // 10 sn'de bir guncelle (GPS tracking)
  });
}

/** Mesafe hesaplama */
export function useDistanceCalculation(
  origin: { lat: number; lng: number } | null,
  dest: { lat: number; lng: number } | null,
) {
  return useQuery({
    queryKey: ['tracking', 'distance', origin, dest],
    queryFn: () => trackingService.calculateDistance(origin!, dest!),
    enabled: !!origin && !!dest,
    staleTime: 5 * 60 * 1000, // 5dk cache
  });
}
