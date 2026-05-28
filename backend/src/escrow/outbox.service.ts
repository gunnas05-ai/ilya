import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { OutboxEvent, OutboxStatus } from './outbox.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EscrowMetricsService } from './escrow-metrics.service';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private outboxRepo: Repository<OutboxEvent>,
    private wsGateway: WebSocketGateway,
    private eventEmitter: EventEmitter2,
    private metricsService: EscrowMetricsService,
  ) {}

  /**
   * Write an event to the outbox. Returns the created outbox record.
   * A background worker will pick it up and deliver it.
   */
  async emit(eventType: string, payload: any): Promise<OutboxEvent> {
    const event = this.outboxRepo.create({ eventType, payload });
    return this.outboxRepo.save(event);
  }

  /**
   * Background worker: process pending outbox events.
   * Runs every 5 seconds.
   */
  @Cron('*/5 * * * * *')
  async processPending() {
    const pending = await this.outboxRepo.find({
      where: { status: OutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    for (const event of pending) {
      await this.processEvent(event);
    }

    // Update queue depth metric
    try {
      const remaining = await this.outboxRepo.count({
        where: { status: OutboxStatus.PENDING },
      });
      this.metricsService.setOutboxQueueDepth(remaining);
    } catch { /* metric update is best-effort */ }
  }

  /**
   * Retry failed events — runs every 60 seconds.
   */
  @Cron('0 */1 * * * *')
  async retryFailed() {
    const failed = await this.outboxRepo.find({
      where: {
        status: OutboxStatus.FAILED,
        retryCount: LessThan(60), // max practical retries before manual intervention
      },
      order: { updatedAt: 'ASC' },
      take: 10,
    });

    for (const event of failed) {
      event.retryCount += 1;
      event.status = OutboxStatus.PENDING;
      await this.outboxRepo.save(event);
    }

    if (failed.length > 0) {
      this.logger.log(`${failed.length} failed events re-queued for retry`);
    }
  }

  /**
   * Clean up completed events older than 7 days — runs daily.
   */
  @Cron('0 0 3 * * *')
  async cleanOldEvents() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.outboxRepo.delete({
      status: OutboxStatus.COMPLETED,
      createdAt: LessThan(cutoff),
    });
    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned ${result.affected} old outbox events`);
    }
  }

  private async processEvent(event: OutboxEvent) {
    event.status = OutboxStatus.PROCESSING;
    await this.outboxRepo.save(event);

    try {
      await this.deliver(event);
      event.status = OutboxStatus.COMPLETED;
      event.processedAt = new Date();
      await this.outboxRepo.save(event);
    } catch (err: any) {
      this.logger.error(`Outbox event ${event.id} (${event.eventType}) failed: ${err.message}`);
      event.status = OutboxStatus.FAILED;
      event.lastError = err.message;
      event.retryCount = (event.retryCount || 0) + 1;
      await this.outboxRepo.save(event);
    }
  }

  private async deliver(event: OutboxEvent) {
    const { eventType, payload } = event;

    switch (eventType) {
      case 'escrow.created':
        this.eventEmitter.emit('escrow.created', payload);
        this.wsGateway.emitEscrowCreated(payload.loadId, payload);
        break;

      case 'escrow.released':
        this.eventEmitter.emit('escrow.released', payload);
        this.wsGateway.emitEscrowReleased(payload.loadId, payload);
        this.wsGateway.sendToShipment(payload.loadId, 'DELIVERY_CONFIRMED', payload);
        break;

      case 'escrow.disputed':
        this.eventEmitter.emit('escrow.disputed', payload);
        this.wsGateway.emitEscrowDisputed(payload.loadId, payload);
        this.wsGateway.sendToShipment(payload.loadId, 'DISPUTE_OPENED', payload);
        break;

      case 'wallet.balance_changed':
        this.eventEmitter.emit('wallet.balance_changed', payload);
        this.wsGateway.sendToWallet(payload.userId, 'WALLET_BALANCE_CHANGED', payload);
        break;

      case 'wallet.credited':
        this.eventEmitter.emit('wallet.credited', payload);
        this.wsGateway.sendToWallet(payload.userId, 'WALLET_CREDITED', payload);
        break;

      case 'wallet.debited':
        this.eventEmitter.emit('wallet.debited', payload);
        this.wsGateway.sendToWallet(payload.userId, 'WALLET_DEBITED', payload);
        break;

      case 'qr.scanned':
        this.eventEmitter.emit('qr.scanned', payload);
        this.wsGateway.sendToShipment(payload.loadId, 'QR_SCANNED', payload);
        break;

      case 'qr.scan_failed':
        this.eventEmitter.emit('qr.scan_failed', payload);
        this.wsGateway.sendToShipment(payload.loadId, 'QR_SCAN_FAILED', payload);
        break;

      case 'fraud.alert':
        this.eventEmitter.emit('fraud.alert', payload);
        this.wsGateway.sendToShipment(payload.loadId, 'FRAUD_ALERT_TRIGGERED', payload);
        break;

      case 'payment.on_hold':
        this.eventEmitter.emit('payment.on_hold', payload);
        this.wsGateway.sendToShipment(payload.loadId, 'PAYMENT_ON_HOLD', payload);
        break;

      default:
        this.eventEmitter.emit(eventType, payload);
        break;
    }
  }
}
