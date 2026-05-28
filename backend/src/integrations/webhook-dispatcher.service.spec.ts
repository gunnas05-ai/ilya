import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { Webhook } from './webhook.entity';
import { WebhookDeadLetter } from './entities/webhook-dead-letter.entity';
import { KafkaConsumerService } from '../common/kafka/kafka.consumer';

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  let webhookRepo: any;
  let dlqRepo: any;
  let httpService: any;

  const mockWebhook: Partial<Webhook> = {
    id: 'wh-1',
    name: 'Test Webhook',
    url: 'https://example.com/hook',
    events: ['shipment.created', 'shipment.status.COMPLETED'],
    secret: 'test-secret',
    isActive: true,
    successCount: 0,
    failureCount: 0,
    lastError: null,
    lastSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    webhookRepo = {
      find: jest.fn().mockResolvedValue([mockWebhook]),
      save: jest.fn().mockImplementation((w) => Promise.resolve(w)),
    };
    dlqRepo = {
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      findOne: jest.fn(),
    };
    httpService = {
      post: jest.fn().mockReturnValue(of({ status: 200, data: 'OK' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDispatcherService,
        { provide: getRepositoryToken(Webhook), useValue: webhookRepo },
        { provide: getRepositoryToken(WebhookDeadLetter), useValue: dlqRepo },
        { provide: HttpService, useValue: httpService },
        { provide: KafkaConsumerService, useValue: { isConnected: () => false, registerConsumerGroup: jest.fn() } },
      ],
    }).compile();

    service = module.get<WebhookDispatcherService>(WebhookDispatcherService);
  });

  describe('dispatchEvent', () => {
    it('eslesen webhook\'lara HTTP POST gonderir', async () => {
      await service.dispatchEvent('shipment.created', { loadId: 'ld-1' });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({ event: 'shipment.created' }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Kaptan-Event': 'shipment.created',
          }),
        }),
      );
    });

    it('basarili gonderimde successCount artar', async () => {
      await service.dispatchEvent('shipment.created', { loadId: 'ld-1' });
      expect(webhookRepo.save).toHaveBeenCalled();
    });

    it('eslesmeyen event icin gonderim yapmaz', async () => {
      await service.dispatchEvent('unknown.event', { data: 'test' });
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('hata durumunda failureCount artar', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Connection refused')));
      await service.dispatchEvent('shipment.created', { loadId: 'ld-2' });
      expect(webhookRepo.save).toHaveBeenCalled();
    });
  });
});
