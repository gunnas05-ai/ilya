import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionConfig } from './entities/commission-config.entity';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity';
import { MessageBusService } from '../common/message-bus.service';

export interface CommissionResult {
  amount: number;          // Komisyon tutarı (kuruş)
  rate: number;            // Komisyon oranı (%)
  configName: string;      // Hangi konfigürasyon
  platformAmount: number;  // Platforma giden
  carrierAmount: number;   // Taşıyıcıya giden
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly PLATFORM_WALLET = '00000000-0000-0000-0000-000000000000';
  private cache: Map<string, number> = new Map();
  private cacheTime = 0;
  private readonly CACHE_TTL = 60000; // 1 dakika

  constructor(
    @InjectRepository(CommissionConfig)
    private configRepo: Repository<CommissionConfig>,
    @InjectRepository(PaymentTransaction)
    private paymentTxRepo: Repository<PaymentTransaction>,
    private messageBus: MessageBusService,
  ) {}

  /** Komisyon oranını getir (cache'li) */
  async getRate(configName: string): Promise<number> {
    if (Date.now() - this.cacheTime > this.CACHE_TTL) {
      this.cache.clear();
      const configs = await this.configRepo.find({ where: { isActive: true } });
      for (const c of configs) {
        this.cache.set(c.name, c.rate);
      }
      this.cacheTime = Date.now();
    }

    // Default değerler (cache'te yoksa)
    const defaults: Record<string, number> = {
      platform_match: 2.0,
      own_carrier: 0.5,
      escrow_acceleration: 1.0,
      insurance: 15.0,
      fuel_card: 0.5,
      early_payment: 1.0,
    };

    return this.cache.get(configName) ?? defaults[configName] ?? 2.0;
  }

  /** Tüm aktif konfigürasyonları getir */
  async getAllConfigs(): Promise<CommissionConfig[]> {
    return this.configRepo.find({ where: { isActive: true } });
  }

  /** Konfigürasyon güncelle (admin) */
  async updateConfig(name: string, rate: number): Promise<CommissionConfig> {
    let config = await this.configRepo.findOne({ where: { name } });
    if (!config) {
      config = this.configRepo.create({
        name,
        displayName: name,
        rate,
        isActive: true,
      });
    }
    config.rate = rate;
    const saved = await this.configRepo.save(config);
    this.cache.clear(); // Cache'i temizle
    this.cacheTime = 0;

    this.logger.log(`Komisyon güncellendi: ${name} → %${rate}`);
    return saved;
  }

  /**
   * Escrow serbest bırakıldığında komisyon hesapla ve kes.
   * Mevcut escrow.service.ts'teki releaseEscrow() içinden çağrılır.
   */
  async chargeEscrowCommission(
    escrowAmount: number,       // Kuruş cinsinden
    carrierId: string,
    escrowId: string,
    matchType: string = 'platform_match',
  ): Promise<CommissionResult> {
    const rate = await this.getRate(matchType);
    const commissionAmount = Math.round(escrowAmount * (rate / 100));
    const carrierAmount = escrowAmount - commissionAmount;

    // Komisyon işlemini kaydet
    await this.paymentTxRepo.save({
      userId: carrierId,
      type: 'commission',
      amount: commissionAmount,
      currency: 'TRY',
      status: 'success',
      providerRef: `commission-${escrowId}`,
      idempotencyKey: `comm-${escrowId}-${Date.now()}`,
      referenceId: escrowId,
      referenceType: 'escrow',
      metadata: { rate, matchType, originalAmount: escrowAmount },
      createdAt: new Date(),
    } as any);

    await this.messageBus.emit('commission.charged', {
      escrowId,
      carrierId,
      amount: commissionAmount,
      rate,
      matchType,
    });

    this.logger.log(
      `Komisyon: %${rate} → ${(commissionAmount / 100).toFixed(2)} TL (escrow: ${escrowId})`,
    );

    return {
      amount: commissionAmount,
      rate,
      configName: matchType,
      platformAmount: commissionAmount,
      carrierAmount,
    };
  }

  /** Toplam komisyon raporu (admin panel için) */
  async getCommissionReport(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<any> {
    const now = new Date();
    let since: Date;

    switch (period) {
      case 'today':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        since = new Date(now.getTime() - 7 * 86400000);
        break;
      case 'year':
        since = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        since = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const transactions = await this.paymentTxRepo
      .createQueryBuilder('tx')
      .where('tx.type = :type', { type: 'commission' })
      .andWhere('tx.createdAt >= :since', { since })
      .andWhere('tx.status = :status', { status: 'success' })
      .getMany();

    const totalCommission = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalTransactions = transactions.length;

    // Günlük dağılım
    const dailyBreakdown: Record<string, number> = {};
    for (const tx of transactions) {
      const day = new Date(tx.createdAt).toISOString().slice(0, 10);
      dailyBreakdown[day] = (dailyBreakdown[day] || 0) + Number(tx.amount);
    }

    return {
      period,
      since: since.toISOString(),
      until: now.toISOString(),
      totalCommission: Math.round(totalCommission),
      totalCommissionTL: (totalCommission / 100).toFixed(2),
      totalTransactions,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, amount]) => ({
        date,
        amount: Math.round(amount),
        amountTL: (amount / 100).toFixed(2),
      })),
    };
  }
}
