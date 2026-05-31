import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Wallet, WalletTransaction, TransactionType } from './wallet.entity';
import { AuditLogService, AuditAction } from './audit-log.service';
import { OutboxService } from './outbox.service';

let _txSigningKey: string | null = null;

function getTxSigningKey(): string {
  if (_txSigningKey) return _txSigningKey;
  const secret = process.env.TX_SIGNING_SECRET;
  if (!secret) throw new Error('TX_SIGNING_SECRET env var is required for transaction security');
  _txSigningKey = crypto.createHash('sha256').update(secret).digest('hex');
  return _txSigningKey;
}

function signTransaction(walletId: string, type: TransactionType, amount: number, balanceBefore: number, balanceAfter: number, referenceId: string): string {
  const payload = `${walletId}|${type}|${amount}|${balanceBefore}|${balanceAfter}|${referenceId}|${Date.now()}`;
  return crypto.createHmac('sha256', getTxSigningKey()).update(payload).digest('hex');
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    private eventEmitter: EventEmitter2,
    private auditLogService: AuditLogService,
    private outboxService: OutboxService,
    @Optional() private commissionService?: any,
  ) {}

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ userId });
      wallet = await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet;
  }

  async credit(userId: string, amount: number, referenceId: string, description: string, idempotencyKey?: string) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return { wallet: await this.getOrCreateWallet(userId), existingTx: existing };
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance += amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.CREDIT,
      amount,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      referenceId,
      description,
      idempotencyKey,
    });
    tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
    await this.txRepo.save(tx);
    this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
    await this.auditLogService.log(AuditAction.WALLET_CREDITED, userId, referenceId, 'wallet', { amount, description });
    this.eventEmitter.emit('wallet.credited', { userId, walletId: wallet.id, amount, referenceId, description });
    // Outbox
    await this.outboxService.emit('wallet.credited', { userId, walletId: wallet.id, amount, referenceId, description, type: 'credit' });
    return wallet;
  }

  async debit(userId: string, amount: number, referenceId: string, description: string, idempotencyKey?: string) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return { wallet: await this.getOrCreateWallet(userId), existingTx: existing };
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.availableBalance < amount) {
      throw new Error('Yetersiz bakiye');
    }
    const balanceBefore = wallet.availableBalance;
    wallet.availableBalance -= amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.DEBIT,
      amount,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      referenceId,
      description,
      idempotencyKey,
    });
    tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
    await this.txRepo.save(tx);
    this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
    // Outbox
    await this.outboxService.emit('wallet.debited', { userId, walletId: wallet.id, amount, referenceId, description, type: 'debit' });
    return wallet;
  }

  async lockEscrow(userId: string, amount: number, referenceId: string, idempotencyKey?: string) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return { wallet: await this.getOrCreateWallet(userId), existingTx: existing };
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.availableBalance < amount) {
      throw new Error('Escrow için yetersiz bakiye');
    }
    wallet.availableBalance -= amount;
    wallet.escrowBalance += amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.ESCROW_LOCK,
      amount,
      balanceBefore: wallet.availableBalance + amount,
      balanceAfter: wallet.availableBalance,
      referenceId,
      description: 'Escrow blokajı',
      idempotencyKey,
    });
    tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
    await this.txRepo.save(tx);
    this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
    await this.auditLogService.log(AuditAction.ESCROW_FUNDS_LOCKED, userId, referenceId, 'escrow', { amount });
    return wallet;
  }

  async releaseEscrow(userId: string, amount: number, referenceId: string, idempotencyKey?: string) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return { wallet: await this.getOrCreateWallet(userId), existingTx: existing };
    }

    // Komisyon hesapla (Faz C)
    let commissionAmount = 0;
    if (this.commissionService) {
      try {
        const result = await this.commissionService.chargeEscrowCommission(
          amount, userId, referenceId, 'platform_match',
        );
        commissionAmount = result.platformAmount;
        amount = result.carrierAmount; // Taşıyıcıya gidecek net tutar
      } catch (err) {
        // Komisyon alınamazsa işlemi durdurma, tam tutarı gönder
      }
    }

    const wallet = await this.getOrCreateWallet(userId);
    wallet.escrowBalance -= (amount + commissionAmount);
    wallet.pendingRelease += amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.ESCROW_RELEASE,
      amount,
      balanceBefore: wallet.escrowBalance + amount,
      balanceAfter: wallet.escrowBalance,
      referenceId,
      description: 'Escrow serbest bırakıldı',
      idempotencyKey,
    });
    tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
    await this.txRepo.save(tx);
    await this.auditLogService.log(AuditAction.ESCROW_FUNDS_RELEASED, userId, referenceId, 'escrow', { amount });
    // Outbox
    await this.outboxService.emit('wallet.balance_changed', { userId, walletId: wallet.id, escrowBalance: wallet.escrowBalance, pendingRelease: wallet.pendingRelease });
    return wallet;
  }

  async confirmRelease(userId: string, amount: number, referenceId: string, idempotencyKey?: string) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return { wallet: await this.getOrCreateWallet(userId), existingTx: existing };
    }

    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = wallet.availableBalance;
    wallet.pendingRelease -= amount;
    wallet.availableBalance += amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.ESCROW_RELEASE,
      amount,
      balanceBefore,
      balanceAfter: wallet.availableBalance,
      referenceId,
      description: 'Escrow release confirmed',
      idempotencyKey,
    });
    tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
    await this.txRepo.save(tx);

    this.eventEmitter.emit('wallet.balance_changed', { userId, walletId: wallet.id, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance });
    await this.auditLogService.log(AuditAction.WALLET_CREDITED, userId, referenceId, 'wallet', { amount, description: 'Escrow release confirmed' });
    return wallet;
  }

  async recordCommission(userId: string, amount: number, referenceId: string, description: string, idempotencyKey?: string) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await this.txRepo.findOne({ where: { idempotencyKey } });
      if (existing) return { tx: existing };
    }

    const wallet = await this.getOrCreateWallet(userId);
    const tx = this.txRepo.create({
      walletId: wallet.id,
      type: TransactionType.COMMISSION,
      amount,
      balanceBefore: wallet.availableBalance,
      balanceAfter: wallet.availableBalance,
      referenceId,
      description,
      idempotencyKey,
    });
    tx.hmacSignature = signTransaction(tx.walletId, tx.type, tx.amount, tx.balanceBefore, tx.balanceAfter, tx.referenceId || '');
    await this.txRepo.save(tx);
    return tx;
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
