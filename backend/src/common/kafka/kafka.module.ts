import { Global, Module, DynamicModule, Logger } from '@nestjs/common';
import { KafkaProducerService } from './kafka.producer';
import { KafkaConsumerService } from './kafka.consumer';
import { KafkaModuleOptions, KAFKA_MODULE_OPTIONS } from './kafka.interfaces';

export { KafkaModuleOptions } from './kafka.interfaces';

@Global()
@Module({})
export class KafkaModule {
  private static readonly logger = new Logger(KafkaModule.name);

  static forRoot(options: KafkaModuleOptions): DynamicModule {
    const brokersEnv = process.env.KAFKA_BROKERS;
    const resolvedBrokers = brokersEnv
      ? brokersEnv.split(',').map((b) => b.trim())
      : options.brokers;

    const resolvedOptions: KafkaModuleOptions = {
      ...options,
      brokers: resolvedBrokers,
    };

    KafkaModule.logger.log(
      `Kafka modulu yapilandiriliyor: ${resolvedOptions.brokers.join(', ')}`,
    );

    return {
      module: KafkaModule,
      providers: [
        { provide: KAFKA_MODULE_OPTIONS, useValue: resolvedOptions },
        KafkaProducerService,
        KafkaConsumerService,
      ],
      exports: [KafkaProducerService, KafkaConsumerService],
    };
  }

  /**
   * Development fallback — Kafka olmayan ortamlarda calismaz,
   * MessageBusService EventEmitter2'ye geri duser
   */
  static forRootAsync(): DynamicModule {
    const brokersEnv = process.env.KAFKA_BROKERS;
    if (!brokersEnv) {
      KafkaModule.logger.warn(
        'KAFKA_BROKERS tanimli degil. Kafka modulu devre disi. EventEmitter2 fallback kullanilacak.',
      );
    }

    return KafkaModule.forRoot({
      brokers: brokersEnv ? brokersEnv.split(',').map((b) => b.trim()) : ['localhost:9092'],
      clientId: 'kaptan-backend',
      consumerGroupId: 'kaptan-consumer-group',
    });
  }
}
