/**
 * Abonelik ve Odeme Entegrasyon Testleri
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionService } from './subscription.service';
import { CreditService } from './credit.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { CreditPackage } from './entities/credit-package.entity';
import { UserCredit, CreditTransaction } from './entities/user-credit.entity';

describe('Billing — Abonelik & Kontor', () => {
  describe('SubscriptionService — Abonelik', () => {
    let service: SubscriptionService;
    let planRepo: any;
    let subRepo: any;
    let paymentService: any;

    beforeEach(async () => {
      planRepo = { find: jest.fn(), findOne: jest.fn() };
      subRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn() };
      paymentService = { charge: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionService,
          { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
          { provide: getRepositoryToken(UserSubscription), useValue: subRepo },
          { provide: 'PaymentService', useValue: paymentService },
          { provide: 'MessageBusService', useValue: { emit: jest.fn() } },
        ],
      }).compile();

      service = module.get<SubscriptionService>(SubscriptionService);
    });

    it('aktif abonelik yoksa yuk eklenemez', async () => {
      subRepo.findOne.mockResolvedValue(null);
      const canCreate = await service.canCreateLoad('user-1');
      expect(canCreate).toBe(false);
    });

    it('abonelik satin alma — basarili odeme', async () => {
      planRepo.findOne.mockResolvedValue({
        id: 'plan-1', displayName: 'Profesyonel', monthlyPrice: 499, features: { webhook: true },
      });
      subRepo.findOne.mockResolvedValue(null);
      paymentService.charge.mockResolvedValue({ status: 'success' });
      subRepo.create.mockReturnValue({ userId: 'user-1', planId: 'plan-1', status: 'active' });
      subRepo.save.mockResolvedValue({ id: 'sub-1' });

      const result = await service.purchase('user-1', 'plan-1', 'pm-1');
      expect(result.status).toBe('active');
    });

    it('abonelik satin alma — basarisiz odemede hata', async () => {
      planRepo.findOne.mockResolvedValue({
        id: 'plan-1', displayName: 'Profesyonel', monthlyPrice: 499,
      });
      paymentService.charge.mockResolvedValue({
        status: 'failed', errorMessage: 'Kart reddedildi',
      });

      await expect(service.purchase('user-1', 'plan-1', 'pm-1'))
        .rejects.toThrow('Odeme basarisiz');
    });
  });

  describe('CreditService — Kontor', () => {
    let service: CreditService;
    let creditRepo: any;
    let txRepo: any;

    beforeEach(async () => {
      creditRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
      txRepo = { save: jest.fn(), find: jest.fn() };
      const packageRepo = { find: jest.fn(), findOne: jest.fn() };
      const paymentService = { charge: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CreditService,
          { provide: getRepositoryToken(CreditPackage), useValue: packageRepo },
          { provide: getRepositoryToken(UserCredit), useValue: creditRepo },
          { provide: getRepositoryToken(CreditTransaction), useValue: txRepo },
          { provide: 'PaymentService', useValue: paymentService },
        ],
      }).compile();

      service = module.get<CreditService>(CreditService);
    });

    it('kontor yetersizse fatura olusturulamaz', async () => {
      creditRepo.findOne.mockResolvedValue({ userId: 'user-1', balance: 0 });
      await expect(service.deduct('user-1', 1, 'invoice', 'inv-1'))
        .rejects.toThrow('Yetersiz kontor');
    });

    it('kontor dusumu basarili', async () => {
      creditRepo.findOne.mockResolvedValue({ userId: 'user-1', balance: 50, totalUsed: 10 });
      await service.deduct('user-1', 1, 'invoice', 'inv-1');
      expect(creditRepo.save).toHaveBeenCalled();
    });
  });
});
