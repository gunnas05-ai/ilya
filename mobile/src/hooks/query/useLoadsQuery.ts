import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadService } from '../../services/loadService';
import { apiClient } from '../../services/api';

export const loadKeys = {
  all: ['loads'] as const,
  list: (filters?: Record<string, any>) => ['loads', 'list', filters] as const,
  detail: (id: string) => ['loads', 'detail', id] as const,
  recent: () => ['loads', 'recent'] as const,
  recommended: () => ['loads', 'recommended'] as const,
  ranking: (role?: string) => ['loads', 'ranking', role] as const,
  marketHeatmap: () => ['loads', 'market-heatmap'] as const,
  fuelPrices: () => ['loads', 'fuel-prices'] as const,
};

/** Tum yukleri getir (filtreli) */
export function useLoadsList(filters?: Record<string, any>) {
  return useQuery({
    queryKey: loadKeys.list(filters),
    queryFn: () => loadService.getAll(filters),
  });
}

/** Son yuklenen yukler */
export function useRecentLoads() {
  return useQuery({
    queryKey: loadKeys.recent(),
    queryFn: () => loadService.getRecent(),
  });
}

/** AI onerileri — kullanici rolune gore */
export function useRecommendedLoads(role?: string) {
  return useQuery({
    queryKey: loadKeys.recommended(),
    queryFn: () => loadService.getRanking(role),
    enabled: !!role,
  });
}

/** Yük detay */
export function useLoadDetail(id: string) {
  return useQuery({
    queryKey: loadKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get(`/loads/${id}`);
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });
}

/** Yük olusturma mutasyonu */
export function useCreateLoad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/loads', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loadKeys.all });
    },
  });
}
