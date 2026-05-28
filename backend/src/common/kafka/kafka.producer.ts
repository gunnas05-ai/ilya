import { Injectable, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';
import { KafkaModuleOptions, KAFKA_MODULE_OPTIONS } from './kafka.interfaces';

@Injectable()
export class KafkaProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer;
  private connected = false;

  constructor(@Inject(KAFKA_MODULE_OPTIONS) private readonly options: KafkaModuleOptions) {
    const kafka = new Kafka({
      clientId: options.clientId || 'kaptan-backend',
      brokers: options.brokers,
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });
    this.producer = kafka.producer({
      allowAutoTopicCreation: true,
      maxInFlightRequests: 5,
      idempotent: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      this.logger.log('Kafka producer baglandi');
    } catch (err) {
      this.logger.warn('Kafka producer baglanamadi, eventler EventEmitter2 fallback\'e yonlendirilecek');
      this.connected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer baglantisi kesildi');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Kafka topic'ine mesaj gonder
   * @param topic - Hedef topic adi
   * @param messages - Gonderilecek mesajlar
   * @param key - Partition key (null ise round-robin)
   */
  async send(
    topic: string,
    messages: Array<{ key?: string | null; value: any; headers?: Record<string, string> }>,
  ): Promise<RecordMetadata[]> {
    if (!this.connected) {
      throw new Error('Kafka producer bagli degil');
    }

    const record: ProducerRecord = {
      topic,
      messages: messages.map((m) => ({
        key: m.key ?? null,
        value: typeof m.value === 'string' ? m.value : JSON.stringify(m.value),
        headers: m.headers ? Object.entries(m.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) : undefined,
      })),
    };

    return this.producer.send(record);
  }

  /**
   * Tekil event gonderimi (en yaygin kullanim)
   */
  async emit(
    topic: string,
    payload: Record<string, any>,
    key?: string,
  ): Promise<RecordMetadata[]> {
    return this.send(topic, [{ key: key ?? null, value: payload }]);
  }
}
