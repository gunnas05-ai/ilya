import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscrowTransaction } from './escrow-transaction.entity';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet.entity';
import { MessageBusService } from '../common/message-bus.service';

export interface QuickPayResult {
  success: boolean;
  releasedAmount: number;
  estimatedMinutes: number;
  transactionId: string;
  message: string;
}

@Injectable()
export class QuickPayService {
  private readonly logger = new Logger(QuickPayService.name);

  // QuickPay icin minimum kosullar
  private readonly MIN_COMPLETED_LOADS = 3;   // En az 3 tamamlanmis yuk
  private readonly MAX_QUICKPAY_AMOUNT = 50000; // Max 50,000 TL aninda odeme
  private readonly STANDARD_RELEASE_MINUTES = 120; // Standart: 2 saat
  private readonly QUICK_RELEASE_MINUTES = 5;     // QuickPay: 5 dakika

  constructor(
    @InjectRepository(EscrowTransaction)
    private escrowRepo: Repository<EscrowTransaction>,
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private walletTxRepo: Repository<WalletTransaction>,
    private messageBus: MessageBusService,
  ) {}

  /**
   * Teslimat onayinda QuickPay uygulanabilirligini kontrol et
   */
  async checkQuickPayEligibility(
    carrierId: string,
    escrowAmount: number,
    completedLoads: number,
  ): Promise<QuickPayResult> {
    // QuickPay uygunluk kontrolleri
    const eligibilityChecks: string[] = [];

    if (completedLoads < this.MIN_COMPLETED_LOADS) {
      eligibilityChecks.push(`En az ${this.MIN_COMPLETED_LOADS} tamamlanmis yuk gerekli (suan: ${completedLoads})`);
    }

    if (escrowAmount > this.MAX_QUICKPAY_AMOUNT) {
      eligibilityChecks.push(
        `Maksimum ${this.MAX_QUICKPAY_AMOUNT.toLocaleString('tr-TR')} TL aninda odeme yapilabilir`,
      );
    }

    const isEligible = eligibilityChecks.length === 0;

    return {
      success: isEligible,
      releasedAmount: isEligible ? escrowAmount : 0,
      estimatedMinutes: isEligible ? this.QUICK_RELEASE_MINUTES : this.STANDARD_RELEASE_MINUTES,
      transactionId: '',
      message: isEligible
        ? `QuickPay aktif! ${escrowAmount.toLocaleString('tr-TR')} TL ~${this.QUICK_RELEASE_MINUTES} dakika icinde hesabinizda.`
        : `Standart odeme: ${escrowAmount.toLocaleString('tr-TR')} TL ~${this.STANDARD_RELEASE_MINUTES} dakika. ${eligibilityChecks.join(' ')}`,
    };
  }

  /**
   * Escrow'yu serbest birak (QuickPay veya standart)
   */
  async releaseEscrow(
    escrowId: string,
    useQuickPay: boolean,
  ): Promise<QuickPayResult> {
    const escrow = await this.escrowRepo.findOne({
      where: { id: escrowId },
      relations: ['shipper', 'carrier'],
    });

    if (!escrow) {
      return {
        success: false,
        releasedAmount: 0,
        estimatedMinutes: 0,
        transactionId: '',
        message: 'Escrow islemi bulunamadi',
      };
    }

    const releaseAmount = escrow.amount;
    const estimatedMinutes = useQuickPay ? this.QUICK_RELEASE_MINUTES : this.STANDARD_RELEASE_MINUTES;

    // Wallet'a ekle
    const wallet = await this.walletRepo.findOne({
      where: { userId: (escrow as any).carrierId },
    });

    if (wallet) {
      wallet.availableBalance += releaseAmount;
      wallet.escrowBalance = Math.max(0, wallet.escrowBalance - releaseAmount);
      await this.walletRepo.save(wallet);

      // Wallet transaction kaydi
      await this.walletTxRepo.save({
        walletId: wallet.id,
        type: 'escrow_release',
        amount: releaseAmount,
        balanceBefore: wallet.availableBalance - releaseAmount,
        balanceAfter: wallet.availableBalance,
        referenceId: escrowId,
        description: useQuickPay
          ? `QuickPay: ${releaseAmount.toLocaleString('tr-TR')} TL aninda serbest birakildi`
          : `Escrow: ${releaseAmount.toLocaleString('tr-TR')} TL serbest birakildi`,
        idempotencyKey: `qp-${escrowId}-${Date.now()}`,
      } as any);
    }

    // Escrow durumunu guncelle
    escrow.status = 'serbest_birakildi' as any;
    escrow.releasedAmount = releaseAmount;
    await this.escrowRepo.save(escrow);

    // Event
    await this.messageBus.emit('escrow.released', {
      escrowId,
      carrierId: (escrow as any).carrierId,
      amount: releaseAmount,
      quickPay: useQuickPay,
      estimatedMinutes,
    });

    this.logger.log(
      `${useQuickPay ? 'QuickPay' : 'Standart'} odeme: ${releaseAmount.toLocaleString('tr-TR')} TL (~${estimatedMinutes}dk)`,
    );

    return {
      success: true,
      releasedAmount: releaseAmount,
      estimatedMinutes,
      transactionId: escrowId,
      message: `${releaseAmount.toLocaleString('tr-TR')} TL ${useQuickPay ? 'aninda' : '2 saat icinde'} hesabiniza aktariliyor.`,
    };
  }
}
