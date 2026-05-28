import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Wallet, WalletTransaction } from './wallet.entity';

@Injectable()
export class FintechService {
  private readonly logger = new Logger(FintechService.name);

  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private txRepo: Repository<WalletTransaction>,
  ) {}

  /** QuickPay: Teslimattan sonra hızlı ödeme */
  @OnEvent('shipment.completed', { async: true })
  async processQuickPay(payload: { carrierId: string; amount: number; shipmentId: string }) {
    if (!payload.amount || payload.amount <= 0) return;
    try {
      await this.creditWallet(payload.carrierId, payload.amount, 'quickpay', `QuickPay - Sevkiyat #${payload.shipmentId}`);
      this.logger.log(`⚡ QuickPay: ${payload.amount}₺ → ${payload.carrierId}`);
    } catch (err) {
      this.logger.error(`QuickPay failed: ${err.message}`);
    }
  }

  /** Yakıt avansı talebi */
  async requestFuelAdvance(carrierId: string, amount: number, shipmentId: string) {
    const wallet = await this.getOrCreateWallet(carrierId);
    if (wallet.availableBalance < amount) throw new Error('Yetersiz bakiye');
    wallet.availableBalance -= amount;
    
    await this.walletRepo.save(wallet);
    await this.recordTx(carrierId, 'fuel_advance', -amount, `⛽ Yakıt Avansı - Sevkiyat #${shipmentId}`);
    return { success: true, remaining: wallet.availableBalance, advanced: amount };
  }

  /** Cüzdana para yükle */
  private async creditWallet(carrierId: string, amount: number, type: string, desc: string) {
    const wallet = await this.getOrCreateWallet(carrierId);
    wallet.availableBalance += amount;
    wallet.totalEarned = (wallet.totalEarned || 0) + amount;
    await this.walletRepo.save(wallet);
    await this.recordTx(carrierId, type, amount, desc);
  }

  /** Cüzdan özeti */
  async getWalletSummary(carrierId: string) {
    const wallet = await this.getOrCreateWallet(carrierId);
    const recentTxs = await this.txRepo.find({ where: { walletId: wallet.id }, order: { createdAt: 'DESC' }, take: 20 });
    return {
      availableBalance: wallet.availableBalance,
      escrowBalance: wallet.escrowBalance || 0,
      totalEarned: wallet.totalEarned || 0,
      
      pendingRelease: wallet.pendingRelease || 0,
      recentTransactions: recentTxs,
      // Çoklu kur (gösterimlik)
      multiCurrency: {
        TRY: wallet.availableBalance,
        USD: Math.round(wallet.availableBalance / 30 * 100) / 100,
        EUR: Math.round(wallet.availableBalance / 33 * 100) / 100,
      },
    };
  }

  /** Sefer başına harcama kaydı */
  async logTripExpense(data: { carrierId: string; shipmentId: string; category: string; amount: number; note?: string }) {
    const wallet = await this.getOrCreateWallet(data.carrierId);
    await this.recordTx(data.carrierId, 'trip_expense', -data.amount, `${data.category} - Sevkiyat #${data.shipmentId} - ${data.note || ''}`);
    return { success: true };
  }

  /** Vergi tahmini (basitleştirilmiş) */
  async getTaxEstimate(carrierId: string) {
    const wallet = await this.getOrCreateWallet(carrierId);
    const total = wallet.totalEarned || 0;
    const expenseEstimate = total * 0.6; // %60 gider tahmini
    const taxableIncome = total - expenseEstimate;
    const incomeTax = taxableIncome * 0.15; // %15 gelir vergisi
    const vat = total * 0.20; // %20 KDV
    return {
      totalEarned: total,
      estimatedExpenses: Math.round(expenseEstimate),
      taxableIncome: Math.round(taxableIncome),
      estimatedIncomeTax: Math.round(incomeTax),
      estimatedVAT: Math.round(vat),
      netAfterTax: Math.round(total - incomeTax - vat),
      period: '2026',
    };
  }

  private async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ userId, availableBalance: 0, escrowBalance: 0 });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  private async recordTx(userId: string, txType: string, amount: number, desc: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.txRepo.save(this.txRepo.create({
      walletId: wallet.id, userId, type: txType as any, amount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: wallet.availableBalance + amount,
      description: desc,
    } as any));
  }
}
