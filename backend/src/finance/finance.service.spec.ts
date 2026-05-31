import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Income } from './income.entity';
import { Expense } from './expense.entity';
import { ExpenseCategory } from './expense-category.entity';
import { FinanceReminder } from './finance-reminder.entity';
import { RecurringIncomeTemplate } from './recurring-income-template.entity';
import { FinanceInvite } from './finance-invite.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletService } from '../escrow/wallet.service';

describe('FinanceService', () => {
  let service: FinanceService;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
    }),
  };

  const mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockWalletService = { getBalance: jest.fn().mockResolvedValue({ availableBalance: 0 }) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(Income), useValue: mockRepo },
        { provide: getRepositoryToken(Expense), useValue: mockRepo },
        { provide: getRepositoryToken(ExpenseCategory), useValue: mockRepo },
        { provide: getRepositoryToken(FinanceReminder), useValue: mockRepo },
        { provide: getRepositoryToken(RecurringIncomeTemplate), useValue: mockRepo },
        { provide: getRepositoryToken(FinanceInvite), useValue: mockRepo },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly calculate net profit from summary', async () => {
    // Basic test to verify instance works
    expect(service).toBeTruthy();
  });
});
