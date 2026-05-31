/** Shared service interfaces — optional DI için `any` yerine kullanilir */

export interface ICommissionService {
  chargeEscrowCommission(
    amount: number, userId: string, referenceId: string, source: string,
  ): Promise<{ platformAmount: number; carrierAmount: number }>;
}

export interface IMetricsService {
  recordApiLatency?(durationSec: number, method: string, path: string): void;
}

export interface ICreditService {
  getActiveSubscription?(userId: string): Promise<{ status: string; planId: string } | null>;
  canCreateLoad?(userId: string): Promise<boolean>;
}
