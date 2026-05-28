import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { createHmac } from 'crypto';
import { Webhook } from './webhook.entity';
import { WebhookDeadLetter } from './entities/webhook-dead-letter.entity';
import { KafkaConsumerService } from '../common/kafka/kafka.consumer';
import { firstValueFrom } from 'rxjs';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [60000, 300000, 900000, 3600000, 14400000]; // 1dk, 5dk, 15dk, 1sa, 4sa

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    @InjectRepository(Webhook) private webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookDeadLetter) private dlqRepo: Repository<WebhookDeadLetter>,
    private readonly httpService: HttpService,
    private readonly kafkaConsumer?: KafkaConsumerService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Kafka consumer: webhook.delivery topic'ini dinle
    if (this.kafkaConsumer?.isConnected()) {
      await this.kafkaConsumer.registerConsumerGroup({
        groupId: 'webhook-dispatcher',
        topics: ['webhook.delivery'],
        handler: async (payload) => {
          const value = payload.message.value?.toString();
          if (!value) return;
          try {
            const event = JSON.parse(value);
            await this.dispatchEvent(event.payload?.eventType, event.payload?.data);
          } catch (err) {
            this.logger.error('Webhook dispatch hatasi', err instanceof Error ? err.message : undefined);
          }
        },
      });
      this.logger.log('Webhook dispatcher Kafka consumer grubu kaydedildi');
    }
  }

  /**
   * Bir event'i tum eslesen webhook'lara gonder
   */
  async dispatchEvent(eventType: string, data: Record<string, any>): Promise<void> {
    const webhooks = await this.webhookRepo.find({
      where: { isActive: true },
    });

    const matching = webhooks.filter((w) => w.events?.includes(eventType));
    if (matching.length === 0) {
      this.logger.debug(`Eslesen webhook yok: ${eventType}`);
      return;
    }

    this.logger.log(`${eventType} → ${matching.length} webhook'a gonderiliyor`);

    for (const webhook of matching) {
      await this.sendWithRetry(webhook, eventType, data, 1);
    }
  }

  private async sendWithRetry(
    webhook: Webhook,
    eventType: string,
    data: Record<string, any>,
    attempt: number,
  ): Promise<void> {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', webhook.secret || '')
      .update(body)
      .digest('hex');

    try {
      await firstValueFrom(
        this.httpService.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Kaptan-Signature': signature,
            'X-Kaptan-Event': eventType,
            'X-Kaptan-Delivery-Id': `${webhook.id}-${Date.now()}`,
          },
          timeout: 10000,
        }),
      );

      webhook.successCount = (webhook.successCount || 0) + 1;
      webhook.lastSentAt = new Date();
      await this.webhookRepo.save(webhook);
      this.logger.debug(`✓ ${webhook.name}: ${eventType} (deneme ${attempt})`);
    } catch (err) {
      webhook.failureCount = (webhook.failureCount || 0) + 1;
      webhook.lastError = err instanceof Error ? err.message : String(err);
      await this.webhookRepo.save(webhook);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        this.logger.warn(`✗ ${webhook.name}: ${eventType} (deneme ${attempt}/${MAX_RETRIES}), ${delay / 1000}s sonra tekrar`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.sendWithRetry(webhook, eventType, data, attempt + 1);
      } else {
        // Dead Letter Queue
        this.logger.error(`✗ DLQ: ${webhook.name}: ${eventType} — ${MAX_RETRIES} deneme basarisiz`);
        await this.dlqRepo.save({
          webhookId: webhook.id,
          eventType,
          payload: data,
          lastError: webhook.lastError,
          retryCount: MAX_RETRIES,
          status: 'pending',
        });
      }
    }
  }

  async replayDeadLetter(dlqId: string): Promise<void> {
    const dlq = await this.dlqRepo.findOne({ where: { id: dlqId } });
    if (!dlq) return;

    const webhook = await this.webhookRepo.findOne({ where: { id: dlq.webhookId } });
    if (!webhook) return;

    dlq.status = 'replaying';
    await this.dlqRepo.save(dlq);

    try {
      await this.sendWithRetry(webhook, dlq.eventType, dlq.payload, 1);
      dlq.status = 'resolved';
    } catch {
      dlq.status = 'pending';
    } finally {
      await this.dlqRepo.save(dlq);
    }
  }
}
