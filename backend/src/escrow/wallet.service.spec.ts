import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { Wallet, WalletTransaction } from './wallet.entity';
import { AuditLogService } from './audit-log.service';
import { OutboxService } from './outbox.service';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: jest.Mocked<Partial<Repository<Wallet>>>;
  let txRepo: jest.Mocked<Partial<Repository<WalletTransaction>>>;

  const mockWallet: Partial<Wallet> = {
    id: 'wallet-1',
    userId: 'user-1',
    availableBalance: 50000,
    escrowBalance: 0,
    pendingRelease: 0,
    dailyWithdrawnToday: 0,
    dailyWithdrawalLimit: 50000,
  };

  beforeEach(async () => {
    walletRepo = {
      findOne: jest.fn().mockResolvedValue(mockWallet),
      create: jest.fn().mockReturnValue(mockWallet),
      save: jest.fn().mockResolvedValue(mockWallet),
    } as any;

    txRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: walletRepo },
        { provide: getRepositoryToken(WalletTransaction), useValue: txRepo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: OutboxService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet', async () => {
      const wallet = await service.getOrCreateWallet('user-1');
      expect(wallet.id).toBe('wallet-1');
      expect(wallet.availableBalance).toBe(50000);
    });

    it('should create new wallet if none exists', async () => {
      walletRepo.findOne.mockResolvedValue(null);
      walletRepo.create.mockReturnValue({ userId: 'user-2', availableBalance: 0 } as Wallet);
      walletRepo.save.mockResolvedValue({ id: 'wallet-2', userId: 'user-2', availableBalance: 0 } as Wallet);

      const wallet = await service.getOrCreateWallet('user-2');
      expect(wallet.userId).toBe('user-2');
    });
  });

  describe('credit', () => {
    it('should increase available balance', async () => {
      walletRepo.save.mockResolvedValue({ ...mockWallet, availableBalance: 60000 } as Wallet);
      const wallet = await service.credit('user-1', 10000, 'ref-1', 'Deposit');
      expect(wallet.availableBalance).toBe(60000);
    });

    it('should return existing tx for duplicate idempotency key', async () => {
      txRepo.findOne.mockResolvedValue({ id: 'tx-1' } as WalletTransaction);
      const result = await service.credit('user-1', 10000, 'ref-dup', 'Deposit', 'idem-1');
      expect(result).toHaveProperty('existingTx');
    });
  });

  describe('debit', () => {
    it('should throw on insufficient balance', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet, availableBalance: 100 } as Wallet);
      await expect(
        service.debit('user-1', 50000, 'ref-1', 'Overdraft'),
      ).rejects.toThrow('Yetersiz bakiye');
    });

    it('should decrease available balance', async () => {
      walletRepo.save.mockResolvedValue({ ...mockWallet, availableBalance: 40000 } as Wallet);
      const wallet = await service.debit('user-1', 10000, 'ref-1', 'Withdrawal');
      expect(wallet.availableBalance).toBe(40000);
    });
  });
});
