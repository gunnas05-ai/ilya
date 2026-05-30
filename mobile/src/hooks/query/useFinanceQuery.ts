import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/financeService';

export const financeKeys = {
  all: ['finance'] as const,
  dashboard: (period?: string) => ['finance', 'dashboard', period] as const,
  expenses: (filters?: Record<string, any>) => ['finance', 'expenses', filters] as const,
  expenseDetail: (id: string) => ['finance', 'expense', id] as const,
};

/** Finans ozeti (gunluk / haftalik / aylik) */
export function useFinanceDashboard(period: string = 'today') {
  return useQuery({
    queryKey: financeKeys.dashboard(period),
    queryFn: () => financeService.getDashboardSummary(),
    staleTime: 60000,
  });
}

/** Gider listesi */
export function useExpenses(filters?: Record<string, any>) {
  return useQuery({
    queryKey: financeKeys.expenses(filters),
    queryFn: () => financeService.getExpenses(),
  });
}

/** Gider ekle */
export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; description: string; date: string; categoryId?: string }) =>
      financeService.addExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/** OCR fis yukleme */
export function useUploadReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType: string }) =>
      financeService.uploadOcrReceipt(uri, mimeType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
