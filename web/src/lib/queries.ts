/**
 * Organized React Query hooks — following mobile hooks/query/ pattern.
 * Faz-1: useLoadsQuery, useUsersQuery, useBidsQuery — merkezi cache yönetimi.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Load, User, Bid } from '@/types/api';

// ── Query Key Factory ─────────────────────────────────────────────────────

export const queryKeys = {
  loads: ['loads'] as const,
  load: (id: string) => ['loads', id] as const,
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  bids: ['bids'] as const,
  bidsByLoad: (loadId: string) => ['bids', loadId] as const,
  financeIncomes: ['finance', 'incomes'] as const,
  financeExpenses: ['finance', 'expenses'] as const,
  tracking: ['tracking'] as const,
  wallet: ['wallet'] as const,
};

// ── Loads ─────────────────────────────────────────────────────────────────

export function useLoadsQuery() {
  return useQuery<Load[]>({
    queryKey: queryKeys.loads,
    queryFn: async () => { const r = await api.get('/loads'); return Array.isArray(r.data) ? r.data : []; },
    staleTime: 30_000,
  });
}

export function useLoadQuery(id: string) {
  return useQuery<Load>({
    queryKey: queryKeys.load(id),
    queryFn: async () => { const r = await api.get(`/loads/${id}`); return r.data; },
    enabled: !!id,
  });
}

// ── Users ─────────────────────────────────────────────────────────────────

export function useUsersQuery() {
  return useQuery<User[]>({
    queryKey: queryKeys.users,
    queryFn: async () => { const r = await api.get('/users'); const list = r.data?.data || r.data || []; return Array.isArray(list) ? list : []; },
    staleTime: 60_000,
  });
}

// ── Bids ──────────────────────────────────────────────────────────────────

export function useBidsQuery() {
  return useQuery<Bid[]>({
    queryKey: queryKeys.bids,
    queryFn: async () => { const r = await api.get('/bids'); return Array.isArray(r.data) ? r.data : []; },
    staleTime: 15_000,
  });
}

export function useBidsForLoadQuery(loadId: string) {
  return useQuery<Bid[]>({
    queryKey: queryKeys.bidsByLoad(loadId),
    queryFn: async () => { const r = await api.get(`/bids/load/${loadId}`); return Array.isArray(r.data) ? r.data : []; },
    enabled: !!loadId,
    staleTime: 10_000,
  });
}

// ── Finance ───────────────────────────────────────────────────────────────

export function useFinanceIncomesQuery() {
  return useQuery<any[]>({
    queryKey: queryKeys.financeIncomes,
    queryFn: async () => { const r = await api.get('/finance/incomes'); return Array.isArray(r.data) ? r.data : []; },
    staleTime: 30_000,
  });
}

export function useFinanceExpensesQuery() {
  return useQuery<any[]>({
    queryKey: queryKeys.financeExpenses,
    queryFn: async () => { const r = await api.get('/finance/expenses'); return Array.isArray(r.data) ? r.data : []; },
    staleTime: 30_000,
  });
}

// ── Tracking ──────────────────────────────────────────────────────────────

export function useTrackingQuery() {
  return useQuery<any[]>({
    queryKey: queryKeys.tracking,
    queryFn: async () => { const r = await api.get('/tracking'); return Array.isArray(r.data) ? r.data : []; },
    staleTime: 10_000,
    refetchInterval: 15_000, // Auto-poll for live tracking
  });
}

// ── Wallet ────────────────────────────────────────────────────────────────

export function useWalletQuery() {
  return useQuery<any>({
    queryKey: queryKeys.wallet,
    queryFn: async () => { const r = await api.get('/wallet/balance'); return r.data; },
    staleTime: 30_000,
  });
}
