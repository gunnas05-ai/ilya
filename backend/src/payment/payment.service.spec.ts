import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { IyzicoProvider } from './providers/iyzico.provider';
import { MessageBusService } from '../common/message-bus.service';

describe('PaymentService — PCI-DSS Test Senaryolari', () => {
  let service: PaymentService;
  let methodRepo: any;
  let txRepo: any;
  let iyzico: any;

  beforeEach(async () => {
    methodRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() };
    txRepo = { create: jest.fn(), save: jest.fn(), findAndCount: jest.fn() };
    iyzico = {
      registerCard: jest.fn().mockResolvedValue({
        success: true, cardToken: 'tok_test_123', last4: '0008',
        brand: 'visa', cardHolderName: 'Test', expiryMonth: '12', expiryYear: '2028',
      }),
      charge: jest.fn().mockResolvedValue({ success: true, providerRef: 'pay_123', status: 'success' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(PaymentMethod), useValue: methodRepo },
        { provide: getRepositoryToken(PaymentTransaction), useValue: txRepo },
        { provide: IyzicoProvider, useValue: iyzico },
        { provide: MessageBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('registerCard — Kart Kaydetme (PCI-DSS)', () => {
    it('kart basariyla tokenize edilir', async () => {
      methodRepo.findOne.mockResolvedValue(null);
      methodRepo.create.mockReturnValue({ id: 'pm-1', last4: '0008', brand: 'visa' });
      methodRepo.save.mockResolvedValue({ id: 'pm-1', last4: '0008' });

      const result = await service.registerCard('user-1', {
        cardNumber: '5528790000000008', expiryMonth: '12',
        expiryYear: '2028', cvc: '123', cardHolderName: 'TEST USER',
      });

      expect(result.last4).toBe('0008');
      expect(iyzico.registerCard).toHaveBeenCalled();
    });

    it('basarisiz kart kaydinda hata firlatir', async () => {
      iyzico.registerCard.mockResolvedValueOnce({
        success: false, cardToken: '', last4: '0008', brand: '',
        cardHolderName: '', expiryMonth: '', expiryYear: '',
        errorMessage: 'Kart geçersiz',
      });

      await expect(service.registerCard('user-1', {
        cardNumber: '1111111111111111', expiryMonth: '01',
        expiryYear: '2020', cvc: '999', cardHolderName: 'BAD',
      })).rejects.toThrow('Kart geçersiz');
    });

    it('kart tokeni veritabaninda SIFRELENMIS olarak saklanir', async () => {
      methodRepo.findOne.mockResolvedValue(null);
      methodRepo.create.mockImplementation((data: any) => ({
        ...data, id: 'pm-2',
      }));
      methodRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.registerCard('user-1', {
        cardNumber: '5528790000000008', expiryMonth: '12',
        expiryYear: '2028', cvc: '123', cardHolderName: 'TEST',
      });

      // Token ham haliyle 'tok_test_123' olmamali (AES-256 sifreli)
      expect(result.token).not.toBe('tok_test_123');
      expect(result.token).toContain('='); // Base64 enkode belirtisi
    });

    it('kart listelemede token ASLA donulmez', async () => {
      methodRepo.find.mockResolvedValue([{
        id: 'pm-1', last4: '0008', brand: 'visa',
        cardHolderName: 'TEST', expiryMonth: '12', expiryYear: '2028',
        isDefault: true, createdAt: new Date(),
      }]);

      const cards = await service.listCards('user-1');
      expect(cards[0]).not.toHaveProperty('token');
      expect(cards[0].last4).toBe('0008');
    });
  });

  describe('charge — Odeme Islemi', () => {
    it('basarili odeme', async () => {
      methodRepo.findOne.mockResolvedValue({
        id: 'pm-1', token: 'encrypted_token', isActive: true,
        userId: 'user-1',
      });
      txRepo.create.mockReturnValue({ id: 'tx-1' });
      txRepo.save.mockResolvedValue({ id: 'tx-1' });

      const result = await service.charge(
        'user-1', 'pm-1', 19900, 'Test Odeme', 'subscription',
      );

      expect(result.status).toBe('success');
      expect(iyzico.charge).toHaveBeenCalled();
    });

    it('basarisiz odemede hata mesaji doner', async () => {
      methodRepo.findOne.mockResolvedValue({
        id: 'pm-1', token: 'encrypted_token', isActive: true,
        userId: 'user-1',
      });
      iyzico.charge.mockResolvedValueOnce({
        success: false, providerRef: '', status: 'failed',
        errorMessage: 'Yetersiz bakiye',
      });
      txRepo.create.mockReturnValue({ id: 'tx-2' });
      txRepo.save.mockResolvedValue({ id: 'tx-2' });

      const result = await service.charge(
        'user-1', 'pm-1', 99999900, 'Buyuk Odeme', 'subscription',
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Yetersiz bakiye');
    });
  });
});
