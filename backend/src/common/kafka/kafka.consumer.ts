import { Injectable, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaModuleOptions, KAFKA_MODULE_OPTIONS } from './kafka.interfaces';

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

interface ConsumerGroupConfig {
  groupId: string;
  topics: string[];
  handler: MessageHandler;
}

@Injectable()
export class KafkaConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer;
  private connected = false;
  private readonly groups: ConsumerGroupConfig[] = [];

  constructor(@Inject(KAFKA_MODULE_OPTIONS) private readonly options: KafkaModuleOptions) {
    const kafka = new Kafka({
      clientId: `${options.clientId || 'kaptan-backend'}-consumer`,
      brokers: options.brokers,
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });
    this.consumer = kafka.consumer({
      groupId: options.consumerGroupId || 'kaptan-default-group',
      heartbeatInterval: 3000,
      sessionTimeout: 30000,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.consumer.connect();
      this.connected = true;
      this.logger.log('Kafka consumer baglandi');

      // Kayitli tum consumer group'lari subscribe et
      for (const group of this.groups) {
        await this.subscribeGroup(group);
      }
    } catch (err) {
      this.logger.warn('Kafka consumer baglanamadi');
      this.connected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
      this.logger.log('Kafka consumer baglantisi kesildi');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Yeni bir consumer group kaydet ve dinlemeye basla
   */
  async registerConsumerGroup(config: ConsumerGroupConfig): Promise<void> {
    this.groups.push(config);
    if (this.connected) {
      await this.subscribeGroup(config);
    }
  }

  private async subscribeGroup(config: ConsumerGroupConfig): Promise<void> {
    // Her topic icin subscribe
    for (const topic of config.topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.logger.log(`Consumer subscribed: ${topic} (group: ${config.groupId})`);
    }

    // Mesaj isleme dongusu
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await config.handler(payload);
        } catch (err) {
          this.logger.error(
            `Mesaj isleme hatasi: topic=${payload.topic}, offset=${payload.message.offset}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      },
    });
  }
}
