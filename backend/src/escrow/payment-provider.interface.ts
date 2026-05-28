export interface PaymentDepositRequest {
  userId: string;
  amount: number;       // TL
  currency: string;     // 'TRY'
  idempotencyKey: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface PaymentDepositResponse {
  success: boolean;
  transactionId: string;
  providerTransactionId?: string;
  paymentUrl?: string;     // redirect URL for 3D secure
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

export interface PaymentWithdrawalRequest {
  userId: string;
  amount: number;
  iban: string;
  accountHolderName: string;
  bankName?: string;
  description: string;
  idempotencyKey: string;
}

export interface PaymentWithdrawalResponse {
  success: boolean;
  transactionId: string;
  providerReference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletionHours: number;
  message?: string;
}

export interface PaymentProviderInfo {
  name: string;
  code: string;           // 'iyzico' | 'paytr' | 'stripe' | 'mock'
  isActive: boolean;
  supportedCurrencies: string[];
  depositMinAmount: number;
  depositMaxAmount: number;
  withdrawalMinAmount: number;
  withdrawalMaxAmount: number;
  commissionRate: number; // platform fee percentage (e.g., 3.5 = %3.5)
  features: {
    deposit: boolean;
    withdrawal: boolean;
    recurring: boolean;
    factoring: boolean;
    threeDSecure: boolean;
  };
}

export interface PaymentProvider {
  readonly info: PaymentProviderInfo;

  /** Initialize deposit — returns payment URL or confirmation */
  initiateDeposit(req: PaymentDepositRequest): Promise<PaymentDepositResponse>;

  /** Confirm deposit (called by webhook or after 3D redirect) */
  confirmDeposit(providerTransactionId: string): Promise<PaymentDepositResponse>;

  /** Process withdrawal to IBAN */
  processWithdrawal(req: PaymentWithdrawalRequest): Promise<PaymentWithdrawalResponse>;

  /** Check withdrawal status */
  checkWithdrawalStatus(providerReference: string): Promise<PaymentWithdrawalResponse>;

  /** Verify webhook signature from provider */
  verifyWebhookSignature(payload: any, signature: string): boolean;

  /** Handle incoming webhook event */
  handleWebhook(event: string, payload: any): Promise<any>;
}
