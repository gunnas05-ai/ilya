export interface KafkaModuleOptions {
  brokers: string[];
  clientId?: string;
  consumerGroupId?: string;
}

export const KAFKA_MODULE_OPTIONS = 'KAFKA_MODULE_OPTIONS';
