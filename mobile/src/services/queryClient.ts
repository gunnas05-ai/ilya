import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,          // 30sn — bu sure sonunda veri "stale" sayilir
      gcTime: 5 * 60 * 1000,     // 5dk — garbage collection suresi (eski cacheTime)
      retry: 2,                  // 2 kere retry
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});
