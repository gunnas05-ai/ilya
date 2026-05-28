/**
 * Kafka Topic Yapilandirmasi
 * Her topic icin partition sayisi, replikasyon ve key stratejisi
 */

export interface TopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  keyStrategy: 'shipmentId' | 'loadId' | 'laneKey' | 'userId' | 'webhookId' | 'companyId' | 'warehouseId' | 'declarationId' | 'none';
  description: string;
}

export const KAFKA_TOPICS: TopicConfig[] = [
  {
    name: 'shipper.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'shipmentId',
    description: 'Yuk olusturma, iptal, durum degisikligi — shipment.* eventleri',
  },
  {
    name: 'carrier.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'loadId',
    description: 'Tasiyici yuk kabul, durum guncelleme, POD — carrier.* eventleri',
  },
  {
    name: 'rate.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'laneKey',
    description: 'Fiyat teklifi, toplu sorgu, tarife guncelleme — rate.* eventleri',
  },
  {
    name: 'tracking.events',
    partitions: 6,
    replicationFactor: 1,
    keyStrategy: 'shipmentId',
    description: 'GPS konum guncellemeleri, geofence, rota sapmasi',
  },
  {
    name: 'notification.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'userId',
    description: 'Push bildirim, in-app notification, e-posta — notification.* eventleri',
  },
  {
    name: 'webhook.delivery',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'webhookId',
    description: 'Webhook HTTP POST gonderimleri ve retry mekanizmasi',
  },
  {
    name: 'webhook.delivery.dlq',
    partitions: 1,
    replicationFactor: 1,
    keyStrategy: 'none',
    description: '5 basarisiz deneme sonrasi dead letter queue',
  },
  {
    name: 'erp.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'companyId',
    description: 'ERP senkronizasyonu — fatura, sevkiyat, odeme',
  },
  {
    name: 'warehouse.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'warehouseId',
    description: 'Depo randevu talepleri, rampa atamalari',
  },
  {
    name: 'customs.events',
    partitions: 3,
    replicationFactor: 1,
    keyStrategy: 'declarationId',
    description: 'Gumruk beyannamesi durum guncellemeleri',
  },
  {
    name: 'system.events',
    partitions: 1,
    replicationFactor: 1,
    keyStrategy: 'none',
    description: 'Sistem/audit eventleri — log, metrik, alarm',
  },
];

export const TOPIC_NAMES = KAFKA_TOPICS.map((t) => t.name);

export function getTopicConfig(name: string): TopicConfig | undefined {
  return KAFKA_TOPICS.find((t) => t.name === name);
}
