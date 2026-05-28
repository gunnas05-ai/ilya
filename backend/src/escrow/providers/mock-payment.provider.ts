import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentDepositRequest, PaymentDepositResponse, PaymentWithdrawalRequest, PaymentWithdrawalResponse, PaymentProviderInfo } from '../payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  private pendingDeposits = new Map<string, PaymentDepositResponse>();
  private pendingWithdrawals = new Map<string, PaymentWithdrawalResponse>();

  readonly info: PaymentProviderInfo = {
    name: 'Mock Payment (Sandbox)',
    code: 'mock',
    isActive: true,
    supportedCurrencies: ['TRY'],
    depositMinAmount: 100,
    depositMaxAmount: 500000,
    withdrawalMinAmount: 250,
    withdrawalMaxAmount: 250000,
    commissionRate: 0, // mock has no commission
    features: {
      deposit: true,
      withdrawal: true,
      recurring: false,
      factoring: true,
      threeDSecure: false,
    },
  };

  async initiateDeposit(req: PaymentDepositRequest): Promise<PaymentDepositResponse> {
    this.logger.log(`Mock deposit initiated: ${req.amount} ${req.currency} for user ${req.userId}`);

    const providerTxId = `mock_dep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const response: PaymentDepositResponse = {
      success: true,
      transactionId: req.idempotencyKey,
      providerTransactionId: providerTxId,
      status: 'completed',
      message: 'Mock deposit instantly confirmed',
    };

    this.pendingDeposits.set(providerTxId, response);
    return response;
  }

  async confirmDeposit(providerTransactionId: string): Promise<PaymentDepositResponse> {
    const existing = this.pendingDeposits.get(providerTransactionId);
    if (existing) return existing;

    this.logger.warn(`Unknown deposit confirmation: ${providerTransactionId}`);
    return {
      success: false,
      transactionId: providerTransactionId,
      status: 'failed',
      message: 'Transaction not found',
    };
  }

  async processWithdrawal(req: PaymentWithdrawalRequest): Promise<PaymentWithdrawalResponse> {
    this.logger.log(`Mock withdrawal: ${req.amount} TRY to IBAN ${req.iban.substring(0, 6)}... for user ${req.userId}`);

    const providerRef = `mock_wd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const response: PaymentWithdrawalResponse = {
      success: true,
      transactionId: req.idempotencyKey,
      providerReference: providerRef,
      status: 'completed',
      estimatedCompletionHours: 0,
      message: 'Mock withdrawal instantly completed (sandbox)',
    };

    this.pendingWithdrawals.set(providerRef, response);
    return response;
  }

  async checkWithdrawalStatus(providerReference: string): Promise<PaymentWithdrawalResponse> {
    const existing = this.pendingWithdrawals.get(providerReference);
    if (existing) return existing;
    return {
      success: false,
      transactionId: providerReference,
      status: 'failed',
      estimatedCompletionHours: 0,
      message: 'Withdrawal not found',
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return true; // mock always trusts
  }

  async handleWebhook(event: string, payload: any): Promise<any> {
    this.logger.log(`Mock webhook: ${event}`, payload);
    return { received: true, event };
  }
}
