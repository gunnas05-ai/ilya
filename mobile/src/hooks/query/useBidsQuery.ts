import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bidService } from '../../services/bidService';

export const bidKeys = {
  all: ['bids'] as const,
  forLoad: (loadId: string) => ['bids', 'load', loadId] as const,
  my: () => ['bids', 'my'] as const,
};

/** Belirli bir yuk icin teklifler */
export function useBidsForLoad(loadId: string) {
  return useQuery({
    queryKey: bidKeys.forLoad(loadId),
    queryFn: () => bidService.getBidsForLoad(loadId),
    enabled: !!loadId,
  });
}

/** Kullanicinin verdigi teklifler */
export function useMyBids() {
  return useQuery({
    queryKey: bidKeys.my(),
    queryFn: () => bidService.getMyBids(),
  });
}

/** Teklif ver */
export function usePlaceBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { loadId: string; amount: number; note?: string; deliveryDays?: number }) =>
      bidService.placeBid({ ...data, note: data.note || '', estimatedDeliveryDays: data.deliveryDays || 1, hasReturnLoad: false, validDuration: 24 }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: bidKeys.forLoad(vars.loadId) });
      qc.invalidateQueries({ queryKey: bidKeys.my() });
    },
  });
}

/** Karsi teklif */
export function useCounterBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bidId, amount }: { bidId: string; amount: number }) =>
      bidService.counterBid(bidId, amount, ''),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bidKeys.my() });
    },
  });
}
