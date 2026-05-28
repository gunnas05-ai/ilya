import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Webhook } from './webhook.entity';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepo: Repository<Webhook>,
  ) {}

  async create(data: { userId: string; url: string; name: string; events: string[]; secret?: string }) {
    const webhook = this.webhookRepo.create({
      ...data,
      secret: data.secret || crypto.randomBytes(16).toString('hex'),
    });
    return this.webhookRepo.save(webhook);
  }

  async findAll(userId: string) {
    return this.webhookRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string, userId: string) {
    return this.webhookRepo.findOne({ where: { id, userId } });
  }

  async update(id: string, userId: string, data: Partial<Webhook>) {
    await this.webhookRepo.update({ id, userId }, data);
    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    await this.webhookRepo.delete({ id, userId });
    return { success: true };
  }

  async toggleActive(id: string, userId: string) {
    const wh = await this.findById(id, userId);
    if (!wh) return null;
    wh.isActive = !wh.isActive;
    return this.webhookRepo.save(wh);
  }

  /** EX-012: Fire webhook event to all matching subscribers */
  async dispatchEvent(eventName: string, payload: any) {
    const webhooks = await this.webhookRepo.find({
      where: { isActive: true },
    });

    const matching = webhooks.filter(wh => wh.events.includes(eventName));
    if (matching.length === 0) return;

    const body = JSON.stringify({
      event: eventName,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    for (const wh of matching) {
      try {
        const signature = wh.secret
          ? crypto.createHmac('sha256', wh.secret).update(body).digest('hex')
          : '';

        const response = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kaptan-Event': eventName,
            'X-Kaptan-Signature': signature,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          wh.successCount++;
          wh.lastSentAt = new Date();
          wh.lastError = '';
        } else {
          wh.failureCount++;
          wh.lastError = `HTTP ${response.status}: ${await response.text().catch(() => '')}`;
        }
      } catch (err: any) {
        wh.failureCount++;
        wh.lastError = err.message;
      }
      await this.webhookRepo.save(wh);
    }

    this.logger.log(`Webhook "${eventName}" → ${matching.length} aboneye gönderildi`);
  }

  // ── Event Listeners for EX-012 ──

  @OnEvent('load.created')
  async onLoadCreated(payload: any) {
    await this.dispatchEvent('load.created', payload);
  }

  @OnEvent('load.status_changed')
  async onLoadStatusChanged(payload: any) {
    await this.dispatchEvent('load.status_changed', payload);
  }

  @OnEvent('shipment.delivered')
  async onShipmentDelivered(payload: any) {
    await this.dispatchEvent('shipment.delivered', payload);
  }

  @OnEvent('delivery.completed.verified')
  async onDeliveryCompletedVerified(payload: any) {
    await this.dispatchEvent('shipment.delivered', payload);
  }
}
