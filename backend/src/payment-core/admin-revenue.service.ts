import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionConfig } from '../billing/entities/commission-config.entity';
import { CreditPackage } from '../billing/entities/credit-package.entity';
import { SubscriptionPlan } from '../billing/entities/subscription-plan.entity';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity';

@Injectable()
export class AdminRevenueService {
  private readonly logger = new Logger(AdminRevenueService.name);
  private siteFeeAmount = 0; // Site aidati (TL/ay) — varsayilan 0

  constructor(
    @InjectRepository(CommissionConfig) private commRepo: Repository<CommissionConfig>,
    @InjectRepository(CreditPackage) private creditRepo: Repository<CreditPackage>,
    @InjectRepository(SubscriptionPlan) private planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(PaymentTransaction) private txRepo: Repository<PaymentTransaction>,
  ) {}

  /** Tüm gelir config'lerini tek seferde getir */
  async getAllConfigs() {
    const [commissions, credits, plans] = await Promise.all([
      this.commRepo.find({ order: { createdAt: 'DESC' } }),
      this.creditRepo.find({ order: { sortOrder: 'ASC' } }),
      this.planRepo.find({ order: { sortOrder: 'ASC' } }),
    ]);
    return { commissions, credits, plans, siteFee: this.siteFeeAmount };
  }

  /** Site aidati guncelle */
  async setSiteFee(amount: number) {
    this.siteFeeAmount = amount;
    this.logger.log(`Site aidati güncellendi: ${amount} TL/ay`);
    return { siteFee: amount };
  }

  /** Gelir raporu */
  async getRevenueReport(period: string = 'month') {
    const now = new Date();
    let since: Date;
    switch (period) {
      case 'today': since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': since = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': since = new Date(now.getFullYear(), now.getMonth(), 1); break;
      default: since = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const txs = await this.txRepo.createQueryBuilder('tx')
      .where('tx.createdAt >= :since', { since })
      .andWhere('tx.status = :status', { status: 'success' })
      .getMany();

    const total = txs.reduce((s, tx) => s + Number(tx.amount), 0);

    return {
      period,
      since: since.toISOString(),
      until: now.toISOString(),
      totalAmount: Math.round(total),
      totalAmountTL: (total / 100).toFixed(2),
      transactionCount: txs.length,
    };
  }

  // ── Komisyon CRUD ──
  async updateCommission(id: string, data: Partial<CommissionConfig>) {
    const config = await this.commRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Bulunamadi');
    Object.assign(config, data);
    const saved = await this.commRepo.save(config);
    this.logger.log(`Komisyon güncellendi: ${config.displayName} → %${config.rate}`);
    return saved;
  }

  async deleteCommission(id: string) {
    const config = await this.commRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Bulunamadi');
    config.isActive = false;
    await this.commRepo.save(config);
    this.logger.log(`Komisyon pasif: ${config.displayName}`);
    return { success: true };
  }

  async createCommission(data: Partial<CommissionConfig>) {
    const saved = await this.commRepo.save(data as any);
    this.logger.log(`Komisyon eklendi: ${data.displayName} → %${data.rate}`);
    return saved;
  }

  // ── Kontör CRUD ──
  async updateCreditPackage(id: string, data: Partial<CreditPackage>) {
    const pkg = await this.creditRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Bulunamadi');
    Object.assign(pkg, data);
    const saved = await this.creditRepo.save(pkg);
    this.logger.log(`Kontör paketi güncellendi: ${pkg.name}`);
    return saved;
  }

  async deleteCreditPackage(id: string) {
    const pkg = await this.creditRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Bulunamadi');
    pkg.isActive = false;
    await this.creditRepo.save(pkg);
    return { success: true };
  }

  async createCreditPackage(data: Partial<CreditPackage>) {
    const saved = await this.creditRepo.save(data as any);
    this.logger.log(`Kontör paketi eklendi: ${data.name}`);
    return saved;
  }

  // ── Plan CRUD ──
  async updatePlan(id: string, data: Partial<SubscriptionPlan>) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Bulunamadi');
    Object.assign(plan, data);
    const saved = await this.planRepo.save(plan);
    this.logger.log(`Plan güncellendi: ${plan.displayName}`);
    return saved;
  }

  async deletePlan(id: string) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Bulunamadi');
    plan.isActive = false;
    await this.planRepo.save(plan);
    return { success: true };
  }

  async createPlan(data: Partial<SubscriptionPlan>) {
    const saved = await this.planRepo.save(data as any);
    this.logger.log(`Plan eklendi: ${data.displayName}`);
    return saved;
  }
}
