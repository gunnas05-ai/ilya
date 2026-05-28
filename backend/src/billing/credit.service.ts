import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { CreditPackage } from './entities/credit-package.entity';
import { UserCredit, CreditTransaction } from './entities/user-credit.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    @InjectRepository(CreditPackage) private packageRepo: Repository<CreditPackage>,
    @InjectRepository(UserCredit) private creditRepo: Repository<UserCredit>,
    @InjectRepository(CreditTransaction) private txRepo: Repository<CreditTransaction>,
    private paymentService: PaymentService,
  ) {}

  /** Aktif kontör paketlerini listele */
  async getPackages(): Promise<CreditPackage[]> {
    return this.packageRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Kullanıcının kontör bakiyesi */
  async getBalance(userId: string): Promise<number> {
    const credit = await this.creditRepo.findOne({ where: { userId } });
    return credit?.balance || 0;
  }

  /** Kontör bakiyesi detayı */
  async getUserCredits(userId: string): Promise<UserCredit> {
    let credit = await this.creditRepo.findOne({ where: { userId } });
    if (!credit) {
      credit = this.creditRepo.create({ userId, balance: 0, totalPurchased: 0, totalUsed: 0 });
      await this.creditRepo.save(credit);
    }
    return credit;
  }

  /** Kontör satın al */
  async purchase(userId: string, packageId: string, paymentMethodId: string): Promise<UserCredit> {
    const pkg = await this.packageRepo.findOne({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Kontör paketi bulunamadi');

    // Ödeme al
    const tx = await this.paymentService.charge(
      userId, paymentMethodId, Math.round(pkg.price * 100),
      `${pkg.name} Kontör Paketi`, 'credits', packageId, 'credits',
    );

    if (tx.status !== 'success') {
      throw new ForbiddenException('Odeme basarisiz: ' + (tx.errorMessage || 'Bilinmeyen hata'));
    }

    // Kontörleri ekle
    const totalCredits = pkg.credits + (pkg.bonusCredits || 0);
    let credit = await this.creditRepo.findOne({ where: { userId } });
    if (!credit) {
      credit = this.creditRepo.create({ userId, balance: 0, totalPurchased: 0, totalUsed: 0 });
    }

    credit.balance += totalCredits;
    credit.totalPurchased += totalCredits;
    await this.creditRepo.save(credit);

    // İşlem kaydı
    await this.txRepo.save({
      id: uuid(), userId, type: 'purchase', amount: totalCredits,
      balanceAfter: credit.balance, referenceType: 'package', referenceId: packageId,
      createdAt: new Date(),
    });

    if (pkg.bonusCredits > 0) {
      await this.txRepo.save({
        id: uuid(), userId, type: 'bonus', amount: pkg.bonusCredits,
        balanceAfter: credit.balance, referenceType: 'package', referenceId: packageId,
        createdAt: new Date(),
      });
    }

    this.logger.log(`Kontör satın alındı: ${userId} — ${totalCredits} kontör (${pkg.price} TL)`);
    return credit;
  }

  /** Kontör düş (fatura oluşturmada çağrılır) */
  async deduct(userId: string, amount: number, referenceType: string, referenceId: string): Promise<void> {
    const credit = await this.creditRepo.findOne({ where: { userId } });
    if (!credit || credit.balance < amount) {
      throw new ForbiddenException(`Yetersiz kontör. Gerekli: ${amount}, Mevcut: ${credit?.balance || 0}`);
    }

    credit.balance -= amount;
    credit.totalUsed += amount;
    await this.creditRepo.save(credit);

    await this.txRepo.save({
      id: uuid(), userId, type: 'usage', amount: -amount,
      balanceAfter: credit.balance, referenceType, referenceId,
      createdAt: new Date(),
    });

    // Otomatik yükleme kontrolü
    if (credit.autoReload && credit.balance <= credit.autoReloadThreshold && credit.autoReloadPackageId) {
      this.logger.log(`Otomatik kontör yükleme tetiklendi: ${userId} (bakiye: ${credit.balance})`);
      // Otomatik yükleme için ödeme methodu lazım — subscription üzerinden alınabilir
    }
  }

  /** Kontör iade (teknik hatada) */
  async refund(userId: string, amount: number, referenceType: string, referenceId: string): Promise<void> {
    const credit = await this.creditRepo.findOne({ where: { userId } });
    if (!credit) return;

    credit.balance += amount;
    credit.totalUsed -= amount;
    await this.creditRepo.save(credit);

    await this.txRepo.save({
      id: uuid(), userId, type: 'refund', amount,
      balanceAfter: credit.balance, referenceType, referenceId,
      createdAt: new Date(),
    });

    this.logger.log(`Kontör iade: ${userId} — ${amount} (sebep: ${referenceType})`);
  }

  /** İşlem geçmişi */
  async updatePackage(id: string, data: Partial<CreditPackage>): Promise<CreditPackage> {
    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Paket bulunamadi');
    Object.assign(pkg, data);
    const saved = await this.packageRepo.save(pkg);
    this.logger.log(`Kontör paketi güncellendi: ${pkg.name}`);
    return saved;
  }

  async getTransactions(userId: string, limit = 20): Promise<CreditTransaction[]> {
    return this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
