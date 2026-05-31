import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { WithdrawalService } from './withdrawal.service';
import { WalletTransaction, TransactionType } from './wallet.entity';
import { WithdrawalRequest, WithdrawalType, WithdrawalStatus } from './withdrawal-request.entity';
import { EscrowTransaction, EscrowStatus } from './escrow-transaction.entity';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentProvider } from './payment-provider.interface';

export interface GatewayConfig {
  platformCommissionRate: number;   // e.g., 3.5 = %3.5
  quickPayEnabled: boolean;
  quickPayReleaseHours: number;      // hours after delivery
  minDepositAmount: number;
  maxDepositAmount: number;
  minWithdrawalAmount: number;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly activeProviders: Map<string, PaymentProvider> = new Map();

  // Default config — overridable via env
  readonly config: GatewayConfig = {
    platformCommissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '3.5'),
    quickPayEnabled: process.env.QUICK_PAY_ENABLED !== 'false',
    quickPayReleaseHours: parseInt(process.env.QUICK_PAY_RELEASE_HOURS || '24', 10),
    minDepositAmount: 100,
    maxDepositAmount: 500000,
    minWithdrawalAmount: 250,
  };

  constructor(
    private walletService: WalletService,
    private withdrawalService: WithdrawalService,
    private mockProvider: MockPaymentProvider,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepo: Repository<WithdrawalRequest>,
    @InjectRepository(EscrowTransaction)
    private escrowRepo: Repository<EscrowTransaction>,
    private eventEmitter: EventEmitter2,
  ) {
    // Register default providers
    this.registerProvider(this.mockProvider);
    this.logger.log(`Registered payment provider: ${this.mockProvider.info.name}`);
  }

  registerProvider(provider: PaymentProvider) {
    this.activeProviders.set(provider.info.code, provider);
  }

  getActiveProvider(): PaymentProvider {
    const code = process.env.PAYMENT_PROVIDER || 'mock';
    const provider = this.activeProviders.get(code);
    if (!provider) throw new BadRequestException(`Ödeme sağlayıcı bulunamadı: ${code}`);
    return provider;
  }

  getProviderInfo(): any {
    const provider = this.getActiveProvider();
    return {
      ...provider.info,
      config: {
        ...this.config,
        commissionRate: provider.info.commissionRate || this.config.platformCommissionRate,
      },
    };
  }

  /** EX-004: Deposit money into wallet via payment provider */
  async deposit(userId: string, amount: number, returnUrl?: string) {
    if (amount < this.config.minDepositAmount || amount > this.config.maxDepositAmount) {
      throw new BadRequestException(
        `Deposit amount must be between ${this.config.minDepositAmount} and ${this.config.maxDepositAmount} TRY`,
      );
    }

    const provider = this.getActiveProvider();
    const idempotencyKey = `dep_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await provider.initiateDeposit({
      userId,
      amount,
      currency: 'TRY',
      idempotencyKey,
      returnUrl,
    });

    if (result.success && result.status === 'completed') {
      // Auto-confirm for instant providers (mock)
      await this.walletService.credit(
        userId,
        amount,
        result.transactionId,
        `Para yatırma — ${provider.info.name}`,
        idempotencyKey,
      );

      this.eventEmitter.emit('payment.deposit.completed', {
        userId,
        amount,
        transactionId: result.transactionId,
        provider: provider.info.code,
      });
    }

    return {
      ...result,
      providerName: provider.info.name,
      gatewayConfig: {
        platformCommissionRate: this.config.platformCommissionRate,
      },
    };
  }

  /** EX-004: Process withdrawal to IBAN */
  async withdraw(userId: string, amount: number, iban: string, bankName: string, accountHolderName: string) {
    if (amount < this.config.minWithdrawalAmount) {
      throw new BadRequestException(`Minimum çekim tutarı: ${this.config.minWithdrawalAmount} TL`);
    }

    const wallet = await this.walletService.getBalance(userId);
    if (wallet.availableBalance < amount) {
      throw new BadRequestException('Yetersiz bakiye');
    }

    // Check daily limit
    if (wallet.lastWithdrawalDate) {
      const today = new Date();
      const lastDate = new Date(wallet.lastWithdrawalDate);
      if (today.toDateString() === lastDate.toDateString()) {
        if (wallet.dailyWithdrawnToday + amount > wallet.dailyWithdrawalLimit) {
          throw new BadRequestException('Günlük çekim limiti aşıldı');
        }
      }
    }

    const provider = this.getActiveProvider();
    const idempotencyKey = `wd_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await provider.processWithdrawal({
      userId,
      amount,
      iban,
      accountHolderName,
      bankName,
      description: `KAPTAN cüzdan çekimi — ${accountHolderName}`,
      idempotencyKey,
    });

    if (result.success) {
      // Debit the wallet
      await this.walletService.debit(
        userId,
        amount,
        result.transactionId,
        `IBAN çekimi: ${iban.substring(0, 6)}... → ${accountHolderName}`,
        idempotencyKey,
      );

      // Record withdrawal request
      const wd = this.withdrawalRepo.create({
        userId,
        walletId: wallet.id,
        amount,
        type: WithdrawalType.IBAN_TRANSFER,
        iban,
        bankName,
        accountHolderName,
        status: result.status === 'completed' ? WithdrawalStatus.COMPLETED : WithdrawalStatus.PENDING,
        referenceId: result.transactionId,
        description: `IBAN çekimi: ${iban.substring(0, 6)}... → ${accountHolderName} (${provider.info.name})`,
      });
      await this.withdrawalRepo.save(wd);

      // Update daily counter
      wallet.dailyWithdrawnToday += amount;
      wallet.lastWithdrawalDate = new Date();
      await this.walletService.getOrCreateWallet(userId); // trigger refresh

      this.eventEmitter.emit('payment.withdrawal.completed', {
        userId,
        amount,
        transactionId: result.transactionId,
        provider: provider.info.code,
      });
    }

    return {
      ...result,
      providerName: provider.info.name,
    };
  }

  /** EX-004: Platform commission engine — calculate and deduct fee */
  calculateCommission(amount: number, providerCode?: string): number {
    const provider = providerCode
      ? this.activeProviders.get(providerCode)
      : this.getActiveProvider();

    const rate = provider?.info.commissionRate || this.config.platformCommissionRate;
    return Math.round(amount * rate) / 100;
  }

  /** Apply commission to an escrow transaction */
  async applyCommission(escrowTxId: string): Promise<void> {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowTxId } });
    if (!escrow) throw new NotFoundException('Escrow işlemi bulunamadı');

    const commission = this.calculateCommission(escrow.amount);
    if (commission <= 0) return;

    // Record commission (doesn't affect wallet balance directly — deducted from released amount)
    await this.walletService.recordCommission(
      escrow.carrierId,
      commission,
      escrowTxId,
      `Platform komisyonu (%${this.config.platformCommissionRate}) — Escrow #${escrowTxId.substring(0, 8)}`,
      `comm_${escrowTxId}`,
    );

    this.logger.log(`Commission applied: ${commission} TRY for escrow ${escrowTxId}`);
  }

  /** Handle commission event from escrow service — record audit trail (no double-charge) */
  @OnEvent('commission.charged')
  async handleCommissionCharged(payload: {
    escrowId: string;
    amount: number;
    commission: number;
    carrierId: string;
    shipperId: string;
  }) {
    // Only record audit trail — actual deduction happens in WalletService.releaseEscrow
    await this.walletService.recordCommission(
      payload.shipperId,
      payload.commission,
      payload.escrowId,
      `Platform komisyonu (%${this.config.platformCommissionRate}) — Escrow #${payload.escrowId.substring(0, 8)}`,
      `comm_${payload.escrowId}`,
    );
  }

  /** EX-004: Quick Pay — auto-release funds after delivery verification (Convoy model) */
  @OnEvent('delivery.completed.verified')
  async handleQuickPay(payload: {
    loadId: string;
    driverId: string;
    shipperId: string;
    amount?: number;
    pdfUrl?: string;
  }) {
    if (!this.config.quickPayEnabled) {
      this.logger.log(`Quick Pay disabled — skipping auto-release for load ${payload.loadId}`);
      return;
    }

    // Find escrow transaction for this load
    const escrow = await this.escrowRepo.findOne({
      where: { loadId: payload.loadId, status: EscrowStatus.BLOKEDE },
      order: { createdAt: 'DESC' },
    });

    if (!escrow) {
      this.logger.warn(`No blocked escrow found for load ${payload.loadId}`);
      return;
    }

    // Apply commission before release
    await this.applyCommission(escrow.id);

    const commission = this.calculateCommission(escrow.amount);
    const releaseAmount = escrow.amount - commission;

    // Release funds to carrier
    escrow.status = EscrowStatus.SERBEST_BIRAKILDI;
    escrow.releasedAmount = releaseAmount;
    await this.escrowRepo.save(escrow);

    // Credit carrier wallet
    await this.walletService.confirmRelease(
      escrow.carrierId,
      releaseAmount,
      escrow.id,
      `quick_pay_${escrow.id}`,
    );

    this.logger.log(
      `Quick Pay: Released ${releaseAmount} TRY (after ${commission} TRY commission) for load ${payload.loadId} — carrier ${escrow.carrierId}`,
    );

    this.eventEmitter.emit('quick_pay.completed', {
      escrowId: escrow.id,
      loadId: payload.loadId,
      carrierId: escrow.carrierId,
      amount: escrow.amount,
      commission,
      released: releaseAmount,
      releaseTime: new Date(),
    });
  }

  /** Get payment gateway dashboard data */
  async getGatewayStats() {
    const [totalDeposits, totalWithdrawals, totalCommissions] = await Promise.all([
      this.txRepo.sum('amount', { type: TransactionType.CREDIT }),
      this.txRepo.sum('amount', { type: TransactionType.WITHDRAWAL }),
      this.txRepo.sum('amount', { type: TransactionType.COMMISSION }),
    ]);

    return {
      totalDeposits: totalDeposits || 0,
      totalWithdrawals: totalWithdrawals || 0,
      totalCommissions: totalCommissions || 0,
      activeProvider: this.getActiveProvider().info.name,
      config: this.config,
    };
  }

  /** EX-004: Webhook receiver for payment provider callbacks */
  async handleProviderWebhook(providerCode: string, event: string, payload: any, signature: string) {
    const provider = this.activeProviders.get(providerCode);
    if (!provider) throw new BadRequestException(`Unknown provider: ${providerCode}`);

    if (!provider.verifyWebhookSignature(payload, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    return provider.handleWebhook(event, payload);
  }
}
