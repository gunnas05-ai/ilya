import { Injectable, NotFoundException, Optional, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Wallet, WalletTransaction, TransactionType } from './wallet.entity';
import { AuditLogService, AuditAction } from './audit-log.service';
import { OutboxService } from './outbox.service';
import { ICommissionService } from '../common/service-interfaces';

let _txSigningKey: string | null = null;

function getTxSigningKey(): string {
  if (_txSigningKey) return _txSigningKey;
  const secret = process.env.TX_SIGNING_SECRET;
  if (!secret) throw new Error('TX_SIGNING_SECRET env var is required for transaction security');
  _txSigningKey = crypto.createHash('sha256').update(secret).digest('hex');
  return _txSigningKey;
}

/**
 * EX-001: Deterministic transaction signing (No Date.now() in payload)
 */
function signTransaction(walletId: string, type: TransactionType, amount: number, balanceBefore: number, balanceAfter: number, referenceId: string): string {
  const payload = `${walletId}|${type}|${amount.toFixed(2)}|${balanceBefore.toFixed(2)}|${balanceAfter.toFixed(2)}|${referenceId}`;
  return crypto.createHmac('sha256', getTxSigningKey()).update(payload).digest('hex');
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private auditLogService: AuditLogService,
    private outboxService: OutboxService,
    @Optional() private commissionService?: ICommissionService,
  ) {}

  async getOrCreateWallet(userId: string, manager?: EntityManager): Promise<Wallet> {
    const repo = manager ? manager.getRepository(Wallet) : this.walletRepo;
    let wallet = await repo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = repo.create({ userId });
      wallet = await repo.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet;
  }

  /**
   * EX-002: ACID Transactional Credit with Concurrency Control
   */
  async credit(userId: string, amount: number, referenceId: string, description: string, idempotencyKey?: string) {
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      // 1. Idempotency check
      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } });
        if (existing) return { wallet: await this.getOrCreateWallet(userId, manager), existingTx: existing };
      }

      // 2. Lock wallet for update
      const wallet = await walletRepo.createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) {
        // Create if doesn't exist (handle edge case)
        await this.getOrCreateWallet(userId, manager);
        throw new BadRequestException('Cüzdan hazırlandı, lütfen işlemi tekrar deneyin.');
      }

      const balanceBefore = wallet.availableBalance;
      const roundedAmount = Math.round(amount * 100) / 100;
      wallet.availableBalance = Math.round((wallet.availableBalance + roundedAmount) * 100) / 100;
      await walletRepo.save(wallet);

      const tx = txRepo.create({
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount: roundedAmount,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        referenceId,
        description,
        idempotencyKey,
      });
      tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
      await txRepo.save(tx);

      // Post-transaction tasks (events & logging)
      this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
      await this.auditLogService.log(AuditAction.WALLET_CREDITED, userId, referenceId, 'wallet', { amount: roundedAmount, description });
      this.eventEmitter.emit('wallet.credited', { userId, walletId: wallet.id, amount: roundedAmount, referenceId, description });
      await this.outboxService.emit('wallet.credited', { userId, walletId: wallet.id, amount: roundedAmount, referenceId, description, type: 'credit' });

      return wallet;
    });
  }

  /**
   * EX-003: ACID Transactional Debit with Concurrency Control
   */
  async debit(userId: string, amount: number, referenceId: string, description: string, idempotencyKey?: string) {
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } });
        if (existing) return { wallet: await this.getOrCreateWallet(userId, manager), existingTx: existing };
      }

      const wallet = await walletRepo.createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

      const roundedAmount = Math.round(amount * 100) / 100;
      if (wallet.availableBalance < roundedAmount) {
        throw new BadRequestException('Yetersiz bakiye');
      }

      const balanceBefore = wallet.availableBalance;
      wallet.availableBalance = Math.round((wallet.availableBalance - roundedAmount) * 100) / 100;
      await walletRepo.save(wallet);

      const tx = txRepo.create({
        walletId: wallet.id,
        type: TransactionType.DEBIT,
        amount: roundedAmount,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        referenceId,
        description,
        idempotencyKey,
      });
      tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
      await txRepo.save(tx);

      this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
      await this.outboxService.emit('wallet.debited', { userId, walletId: wallet.id, amount: roundedAmount, referenceId, description, type: 'debit' });
      
      return wallet;
    });
  }

  async lockEscrow(userId: string, amount: number, referenceId: string, idempotencyKey?: string) {
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } });
        if (existing) return { wallet: await this.getOrCreateWallet(userId, manager), existingTx: existing };
      }

      const wallet = await walletRepo.createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

      const roundedAmount = Math.round(amount * 100) / 100;
      if (wallet.availableBalance < roundedAmount) {
        throw new BadRequestException('Escrow için yetersiz bakiye');
      }

      const balanceBefore = wallet.availableBalance;
      wallet.availableBalance = Math.round((wallet.availableBalance - roundedAmount) * 100) / 100;
      wallet.escrowBalance = Math.round((wallet.escrowBalance + roundedAmount) * 100) / 100;
      await walletRepo.save(wallet);

      const tx = txRepo.create({
        walletId: wallet.id,
        type: TransactionType.ESCROW_LOCK,
        amount: roundedAmount,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        referenceId,
        description: 'Escrow blokajı',
        idempotencyKey,
      });
      tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
      await txRepo.save(tx);

      this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
      await this.auditLogService.log(AuditAction.ESCROW_FUNDS_LOCKED, userId, referenceId, 'escrow', { amount: roundedAmount });
      
      return wallet;
    });
  }

  async releaseEscrow(userId: string, amount: number, referenceId: string, idempotencyKey?: string) {
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } });
        if (existing) return { wallet: await this.getOrCreateWallet(userId, manager), existingTx: existing };
      }

      const roundedAmount = Math.round(amount * 100) / 100;
      let netAmount = roundedAmount;
      let commissionAmount = 0;

      if (this.commissionService) {
        try {
          const result = await this.commissionService.chargeEscrowCommission(
            roundedAmount, userId, referenceId, 'platform_match',
          );
          commissionAmount = Math.round(result.platformAmount * 100) / 100;
          netAmount = Math.round(result.carrierAmount * 100) / 100;
        } catch (err) {
          // Fallback to full amount if commission service fails
        }
      }

      const wallet = await walletRepo.createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

      const balanceBefore = wallet.escrowBalance;
      wallet.escrowBalance = Math.round((wallet.escrowBalance - (netAmount + commissionAmount)) * 100) / 100;
      wallet.pendingRelease = Math.round((wallet.pendingRelease + netAmount) * 100) / 100;
      await walletRepo.save(wallet);

      const tx = txRepo.create({
        walletId: wallet.id,
        type: TransactionType.ESCROW_RELEASE,
        amount: netAmount,
        balanceBefore,
        balanceAfter: wallet.escrowBalance,
        referenceId,
        description: 'Escrow serbest bırakıldı',
        idempotencyKey,
      });
      tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
      await txRepo.save(tx);

      await this.auditLogService.log(AuditAction.ESCROW_FUNDS_RELEASED, userId, referenceId, 'escrow', { amount: netAmount });
      await this.outboxService.emit('wallet.balance_changed', { userId, walletId: wallet.id, escrowBalance: wallet.escrowBalance, pendingRelease: wallet.pendingRelease });

      return wallet;
    });
  }

  async confirmRelease(userId: string, amount: number, referenceId: string, idempotencyKey?: string) {
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } });
        if (existing) return { wallet: await this.getOrCreateWallet(userId, manager), existingTx: existing };
      }

      const wallet = await walletRepo.createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.userId = :userId', { userId })
        .getOne();

      if (!wallet) throw new NotFoundException('Cüzdan bulunamadı');

      const roundedAmount = Math.round(amount * 100) / 100;
      const balanceBefore = wallet.availableBalance;
      wallet.pendingRelease = Math.round((wallet.pendingRelease - roundedAmount) * 100) / 100;
      wallet.availableBalance = Math.round((wallet.availableBalance + roundedAmount) * 100) / 100;
      await walletRepo.save(wallet);

      const tx = txRepo.create({
        walletId: wallet.id,
        type: TransactionType.ESCROW_RELEASE,
        amount: roundedAmount,
        balanceBefore,
        balanceAfter: wallet.availableBalance,
        referenceId,
        description: 'Escrow release confirmed',
        idempotencyKey,
      });
      tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
      await txRepo.save(tx);

      this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
      await this.auditLogService.log(AuditAction.WALLET_CREDITED, userId, referenceId, 'wallet', { amount: roundedAmount, description: 'Escrow release confirmed' });
      
      return wallet;
    });
  }

  async recordCommission(userId: string, amount: number, referenceId: string, description: string, idempotencyKey?: string) {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } });
        if (existing) return { tx: existing };
      }

      const wallet = await this.getOrCreateWallet(userId, manager);
      const roundedAmount = Math.round(amount * 100) / 100;
      const tx = txRepo.create({
        walletId: wallet.id,
        type: TransactionType.COMMISSION,
        amount: roundedAmount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: wallet.availableBalance,
        referenceId,
        description,
        idempotencyKey,
      });
      tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
      await txRepo.save(tx);
      return tx;
    });
  }

  async getTransactions(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return this.txRepo.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
