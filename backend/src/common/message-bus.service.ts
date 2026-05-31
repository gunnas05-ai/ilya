import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KafkaProducerService } from './kafka/kafka.producer';

/**
 * EX-028: Message Bus Abstraction Layer
 *
 * Kafka birincil transport, EventEmitter2 fallback.
 * KAFKA_BROKERS env tanimli degilse veya Kafka baglanamazsa
 * mesajlar in-process EventEmitter2 ile iletilir.
 *
 * Topic mapping:
 *   EventEmitter2 pattern'leri otomatik olarak Kafka topic'lerine eslenir:
 *   - 'load.*'       → 'shipper.events'
 *   - 'bid.*'        → 'shipper.events'
 *   - 'shipment.*'   → 'shipper.events'
 *   - 'carrier.*'    → 'carrier.events'
 *   - 'rate.*'       → 'rate.events'
 *   - 'tracking.*'   → 'tracking.events'
 *   - 'escrow.*'     → 'shipper.events'  (finans domain)
 *   - 'wallet.*'     → 'notification.events'
 *   - 'delivery.*'   → 'shipper.events'
 *   - 'customs.*'    → 'customs.events'
 *   - 'warehouse.*'  → 'warehouse.events'
 *   - 'erp.*'        → 'erp.events'
 *   - 'notification.*' → 'notification.events'
 */
export interface ServiceMessage<T = any> {
  pattern: string;
  payload: T;
  timestamp: string;
  correlationId?: string;
  source: string;
}

const PATTERN_TO_TOPIC: Record<string, string> = {
  'load.': 'shipper.events',
  'bid.': 'shipper.events',
  'shipment.': 'shipper.events',
  'carrier.': 'carrier.events',
  'rate.': 'rate.events',
  'tracking.': 'tracking.events',
  'escrow.': 'shipper.events',
  'wallet.': 'notification.events',
  'delivery.': 'shipper.events',
  'customs.': 'customs.events',
  'warehouse.': 'warehouse.events',
  'erp.': 'erp.events',
  'notification.': 'notification.events',
  'dispute.': 'shipper.events',
  'insurance.': 'shipper.events',
  'commission.': 'shipper.events',
  'driver.': 'tracking.events',
};

function resolveTopic(pattern: string): string {
  for (const [prefix, topic] of Object.entries(PATTERN_TO_TOPIC)) {
    if (pattern.startsWith(prefix)) return topic;
  }
  return 'system.events';
}

@Injectable()
export class MessageBusService {
  private readonly logger = new Logger(MessageBusService.name);
  private readonly serviceName = process.env.SERVICE_NAME || 'kaptan-monolith';
  private kafkaAvailable = false;

  constructor(
    private eventEmitter: EventEmitter2,
    @Optional() @Inject(KafkaProducerService) private kafkaProducer?: KafkaProducerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.kafkaProducer?.isConnected()) {
      this.kafkaAvailable = true;
      this.logger.log('MessageBus: Kafka transport aktif');
    } else {
      this.logger.warn('MessageBus: Kafka kullanilamiyor, EventEmitter2 fallback modunda');
    }
  }

  /** Emit a command/event to be handled by another service */
  async emit<T>(pattern: string, payload: T): Promise<void> {
    const message: ServiceMessage<T> = {
      pattern,
      payload,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
      source: this.serviceName,
    };

    if (this.kafkaAvailable && this.kafkaProducer) {
      try {
        const topic = resolveTopic(pattern);
        await this.kafkaProducer.emit(topic, message as any, message.correlationId);
        this.logger.debug(`[Kafka] ${this.serviceName} → ${topic}/${pattern}`);
        return;
      } catch (err) {
        this.logger.warn(`Kafka gonderim hatasi: ${pattern}, EventEmitter2 fallback`);
      }
    }

    // Fallback: EventEmitter2
    this.logger.debug(`[EE2] ${this.serviceName} → ${pattern}`);
    this.eventEmitter.emit(pattern, message.payload);
  }

  /** Dinleyici ekle (EventEmitter2 uzerinde, Kafka consumer henuz desteklemiyor) */
  on<T>(pattern: string, handler: (payload: T) => void): void {
    this.eventEmitter.on(pattern, handler);
  }

  /** Request/response pattern (future: gRPC/RabbitMQ RPC) */
  async request<TRequest, TResponse>(pattern: string, payload: TRequest, timeoutMs = 30000): Promise<TResponse> {
    this.logger.debug(`[${this.serviceName}] RPC → ${pattern}`);

    if (this.kafkaAvailable && this.kafkaProducer) {
      try {
        const topic = resolveTopic(pattern);
        const message: ServiceMessage<TRequest> = {
          pattern,
          payload,
          timestamp: new Date().toISOString(),
          correlationId: this.generateCorrelationId(),
          source: this.serviceName,
        };
        await this.kafkaProducer.emit(topic, message as any, message.correlationId);
      } catch (err) {
        this.logger.warn(`Kafka RPC hatasi: ${pattern}`);
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.eventEmitter.removeListener(replyPattern, handler);
        reject(new Error(`RPC timeout: ${pattern} (${timeoutMs}ms)`));
      }, timeoutMs);

      const replyPattern = `${pattern}.reply`;
      const handler = (response: TResponse) => {
        clearTimeout(timeout);
        this.eventEmitter.removeListener(replyPattern, handler);
        resolve(response);
      };
      this.eventEmitter.on(replyPattern, handler);
      this.eventEmitter.emit(pattern, payload);
    });
  }

  /** Get registered event patterns (for service discovery) */
  async getRegisteredPatterns(): Promise<string[]> {
    return [
      'load.created', 'load.status_changed', 'load.instant_booked',
      'bid.placed', 'bid.accepted', 'bid.rejected',
      'delivery.completed.verified', 'shipment.delivered',
      'escrow.created', 'escrow.released', 'escrow.disputed',
      'wallet.credited', 'wallet.debited',
      'notification.created', 'new_matching_load',
      'dispute.opened', 'dispute.resolved',
      'insurance.policy_issued', 'insurance.claim_filed',
      'driver.started_driving', 'commission.charged',
      'shipment.created', 'shipment.cancelled',
      'shipment.status.IN_TRANSIT', 'shipment.status.COMPLETED',
      'rate.updated', 'invoice.generated',
      'customs.cleared', 'warehouse.appointment_confirmed',
      'carrier.assigned', 'carrier.dispatched', 'carrier.arrived',
    ];
  }

  private generateCorrelationId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
