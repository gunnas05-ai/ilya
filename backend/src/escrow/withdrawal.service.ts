import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Wallet, WalletTransaction, TransactionType } from './wallet.entity';
import { WithdrawalRequest, WithdrawalStatus, WithdrawalType } from './withdrawal-request.entity';
import { AuditLogService, AuditAction } from './audit-log.service';

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepo: Repository<WithdrawalRequest>,
    private auditLogService: AuditLogService,
  ) {}

  async requestWithdrawal(userId: string, amount: number, type: WithdrawalType = WithdrawalType.STANDARD, ibanDetails?: { iban?: string; bankName?: string; accountHolderName?: string }, referenceId?: string, description?: string) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

    if (amount <= 0) throw new BadRequestException('Tutar pozitif olmalıdır');
    if (wallet.availableBalance < amount) throw new BadRequestException('Yetersiz bakiye');

    // Daily limit check
    await this.checkDailyLimit(wallet, amount);

    // Monthly limit check
    await this.checkMonthlyLimit(wallet, amount);

    const request = this.withdrawalRepo.create({
      userId,
      walletId: wallet.id,
      amount,
      type,
      iban: ibanDetails?.iban,
      bankName: ibanDetails?.bankName,
      accountHolderName: ibanDetails?.accountHolderName,
      referenceId,
      description,
      status: WithdrawalStatus.PENDING,
    });

    const saved = await this.withdrawalRepo.save(request);
    await this.auditLogService.log(AuditAction.WITHDRAWAL_REQUESTED, userId, saved.id, 'withdrawal', { amount, type });
    return saved;
  }

  async requestIbanTransfer(userId: string, amount: number, iban: string, bankName: string, accountHolderName: string) {
    if (!iban) throw new BadRequestException('IBAN zorunludur');
    if (!bankName) throw new BadRequestException('Banka adı zorunludur');
    if (!accountHolderName) throw new BadRequestException('Hesap sahibi adı zorunludur');

    return this.requestWithdrawal(userId, amount, WithdrawalType.IBAN_TRANSFER, { iban, bankName, accountHolderName });
  }

  async fuelAdvance(userId: string, amount: number, loadId: string) {
    if (!loadId) throw new BadRequestException('Yük ID zorunludur');
    return this.requestWithdrawal(userId, amount, WithdrawalType.FUEL_ADVANCE, undefined, loadId, `Yakıt avansı - ${loadId}`);
  }

  async milestonePayout(userId: string, amount: number, milestoneId: string) {
    if (!milestoneId) throw new BadRequestException('Milestone ID zorunludur');
    return this.requestWithdrawal(userId, amount, WithdrawalType.MILESTONE_PAYOUT, undefined, milestoneId, `Milestone ödemesi - ${milestoneId}`);
  }

  async cashback(userId: string, amount: number, referenceId: string) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

    if (wallet.cashbackBalance < amount) throw new BadRequestException('Yetersiz cashback bakiyesi');

    wallet.cashbackBalance -= amount;
    wallet.availableBalance += amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.CASHBACK,
      amount,
      balanceBefore: wallet.availableBalance - amount,
      balanceAfter: wallet.availableBalance,
      referenceId,
      description: 'Cashback ödemesi',
    });
    await this.txRepo.save(tx);

    return this.requestWithdrawal(userId, amount, WithdrawalType.CASHBACK, undefined, referenceId, 'Cashback');
  }

  async approveWithdrawal(requestId: string, adminId: string) {
    const request = await this.withdrawalRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Çekim talebi bulunamadı');
    if (request.status !== WithdrawalStatus.PENDING) throw new BadRequestException('Bu talep zaten işlenmiş');

    const wallet = await this.walletRepo.findOne({ where: { id: request.walletId } });
    if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

    // Double-check balance
    if (wallet.availableBalance < request.amount) {
      request.status = WithdrawalStatus.REJECTED;
      request.adminNote = 'Yetersiz bakiye nedeniyle otomatik red';
      request.processedById = adminId;
      request.processedAt = new Date();
      await this.withdrawalRepo.save(request);
      throw new BadRequestException('Yetersiz bakiye - talep reddedildi');
    }

    // Lock funds: move from available to pending
    wallet.availableBalance -= request.amount;
    await this.walletRepo.save(wallet);

    request.status = WithdrawalStatus.APPROVED;
    request.processedById = adminId;
    request.processedAt = new Date();
    await this.withdrawalRepo.save(request);

    await this.auditLogService.log(AuditAction.WITHDRAWAL_APPROVED, adminId, request.id, 'withdrawal', { amount: request.amount, type: request.type });
    return request;
  }

  async rejectWithdrawal(requestId: string, adminId: string, reason: string) {
    const request = await this.withdrawalRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Çekim talebi bulunamadı');
    if (![WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED].includes(request.status)) {
      throw new BadRequestException('Bu talep zaten işlenmiş');
    }

    // If already approved, refund the balance
    if (request.status === WithdrawalStatus.APPROVED) {
      const wallet = await this.walletRepo.findOne({ where: { id: request.walletId } });
      if (wallet) {
        wallet.availableBalance += request.amount;
        await this.walletRepo.save(wallet);
      }
    }

    request.status = WithdrawalStatus.REJECTED;
    request.adminNote = reason;
    request.processedById = adminId;
    request.processedAt = new Date();
    await this.withdrawalRepo.save(request);

    await this.auditLogService.log(AuditAction.WITHDRAWAL_REJECTED, adminId, request.id, 'withdrawal', { amount: request.amount, reason });
    return request;
  }

  async completeWithdrawal(requestId: string, adminId: string) {
    const request = await this.withdrawalRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Çekim talebi bulunamadı');
    if (request.status !== WithdrawalStatus.APPROVED) throw new BadRequestException('Talep onaylanmamış');

    const wallet = await this.walletRepo.findOne({ where: { id: request.walletId } });
    if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

    request.status = WithdrawalStatus.COMPLETED;
    request.processedById = adminId;
    request.processedAt = new Date();
    await this.withdrawalRepo.save(request);

    await this.auditLogService.log(AuditAction.WITHDRAWAL_COMPLETED, adminId, request.id, 'withdrawal', { amount: request.amount, type: request.type });

    // Record the debit transaction
    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: this.mapType(request.type),
      amount: request.amount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: wallet.availableBalance,
      referenceId: request.id,
      description: `${request.description || 'Para çekme'} - ${request.status}`,
    });
    await this.txRepo.save(tx);

    // Update daily/monthly counters
    const today = new Date();
    if (wallet.lastWithdrawalDate) {
      const lastDate = new Date(wallet.lastWithdrawalDate);
      if (lastDate.toDateString() !== today.toDateString()) {
        wallet.dailyWithdrawnToday = 0;
      }
    }
    wallet.dailyWithdrawnToday += request.amount;
    wallet.lastWithdrawalDate = today;
    await this.walletRepo.save(wallet);

    return request;
  }

  async getWithdrawalHistory(userId: string) {
    return this.withdrawalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getPendingWithdrawals() {
    return this.withdrawalRepo.find({
      where: { status: WithdrawalStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async saveIban(userId: string, iban: string, bankName: string, accountHolderName: string) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

    wallet.iban = iban;
    wallet.bankName = bankName;
    wallet.accountHolderName = accountHolderName;
    return this.walletRepo.save(wallet);
  }

  async getIban(userId: string) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

    return {
      iban: wallet.iban,
      bankName: wallet.bankName,
      accountHolderName: wallet.accountHolderName,
    };
  }

  private async checkDailyLimit(wallet: Wallet, amount: number) {
    const today = new Date();
    if (wallet.lastWithdrawalDate) {
      const lastDate = new Date(wallet.lastWithdrawalDate);
      if (lastDate.toDateString() !== today.toDateString()) {
        wallet.dailyWithdrawnToday = 0;
      }
    }
    if (wallet.dailyWithdrawnToday + amount > wallet.dailyWithdrawalLimit) {
      throw new BadRequestException(`Günlük çekim limiti aşıldı (limit: ${wallet.dailyWithdrawalLimit.toLocaleString('tr-TR')} ₺)`);
    }
  }

  private async checkMonthlyLimit(wallet: Wallet, amount: number) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyTotal = await this.withdrawalRepo
      .createQueryBuilder('w')
      .where('w.walletId = :walletId', { walletId: wallet.id })
      .andWhere('w.status IN (:...statuses)', { statuses: [WithdrawalStatus.APPROVED, WithdrawalStatus.COMPLETED] })
      .andWhere('w.createdAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
      .select('COALESCE(SUM(w.amount), 0)', 'total')
      .getRawOne();

    const total = parseFloat(monthlyTotal?.total || 0) + amount;
    if (total > wallet.monthlyWithdrawalLimit) {
      throw new BadRequestException(`Aylık çekim limiti aşıldı (limit: ${wallet.monthlyWithdrawalLimit.toLocaleString('tr-TR')} ₺)`);
    }
  }

  private mapType(type: WithdrawalType): TransactionType {
    switch (type) {
      case WithdrawalType.IBAN_TRANSFER: return TransactionType.IBAN_TRANSFER;
      case WithdrawalType.FUEL_ADVANCE: return TransactionType.FUEL_ADVANCE;
      case WithdrawalType.MILESTONE_PAYOUT: return TransactionType.MILESTONE_PAYOUT;
      case WithdrawalType.CASHBACK: return TransactionType.CASHBACK;
      default: return TransactionType.WITHDRAWAL;
    }
  }
}
