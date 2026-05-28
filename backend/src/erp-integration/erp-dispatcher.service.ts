import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErpIntegrationConfig } from './entities/erp-integration-config.entity';
import { IErpAdapter } from './erp-adapter.interface';
import { SapAdapterService } from './adapters/sap-adapter.service';
import { OracleAdapterService } from './adapters/oracle-adapter.service';
import { NetsuiteAdapterService } from './adapters/netsuite-adapter.service';
import { KafkaConsumerService } from '../common/kafka/kafka.consumer';
import { MessageBusService } from '../common/message-bus.service';

@Injectable()
export class ErpDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(ErpDispatcherService.name);
  private readonly adapters: Map<string, IErpAdapter> = new Map();

  constructor(
    @InjectRepository(ErpIntegrationConfig) private configRepo: Repository<ErpIntegrationConfig>,
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly messageBus: MessageBusService,
    private readonly sapAdapter: SapAdapterService,
    private readonly oracleAdapter: OracleAdapterService,
    private readonly netsuiteAdapter: NetsuiteAdapterService,
  ) {
    // Plugin registry — yeni ERP adaptörü eklenince buraya kaydedilir
    this.adapters.set('SAP', sapAdapter);
    this.adapters.set('ORACLE', oracleAdapter);
    this.adapters.set('NETSUITE', netsuiteAdapter);
  }

  async onModuleInit(): Promise<void> {
    // Kafka event listener: erp.events
    if (this.kafkaConsumer?.isConnected()) {
      await this.kafkaConsumer.registerConsumerGroup({
        groupId: 'erp-dispatcher',
        topics: ['erp.events'],
        handler: async (payload) => {
          const value = payload.message.value?.toString();
          if (!value) return;
          try {
            const event = JSON.parse(value);
            await this.dispatchToErp(event.pattern, event.payload);
          } catch (err) {
            this.logger.error('ERP dispatch hatasi', err instanceof Error ? err.message : undefined);
          }
        },
      });
      this.logger.log('ERP dispatcher Kafka consumer kaydedildi');
    }

    // Fallback: EventEmitter2 dinleyiciler
    this.messageBus.on('shipment.created', (payload: any) => {
      this.dispatchToErp('shipment.created', payload);
    });
    this.messageBus.on('invoice.generated', (payload: any) => {
      this.dispatchToErp('invoice.generated', payload);
    });
    this.messageBus.on('shipment.status.COMPLETED', (payload: any) => {
      this.dispatchToErp('shipment.status.COMPLETED', payload);
    });
  }

  /**
   * Event'i ilgili ERP adaptörlerine yönlendir
   */
  async dispatchToErp(eventType: string, data: Record<string, any>): Promise<void> {
    const companyId = data.companyId || data.creatorId;
    if (!companyId) return;

    const configs = await this.configRepo.find({
      where: { companyId, isActive: true },
    });

    for (const config of configs) {
      const adapter = this.adapters.get(config.erpType);
      if (!adapter) {
        this.logger.warn(`ERP adaptörü bulunamadi: ${config.erpType}`);
        continue;
      }

      try {
        let result;
        switch (eventType) {
          case 'shipment.created':
            result = await adapter.createShipment(data as any, config.fieldMappings || {});
            break;
          case 'invoice.generated':
            result = await adapter.createInvoice(data as any, config.fieldMappings || {});
            break;
          case 'shipment.status.COMPLETED':
            result = await adapter.recordPayment(data as any, config.fieldMappings || {});
            break;
          default:
            return;
        }

        // Sync sonucunu kaydet
        config.lastSyncResult = result;
        config.syncStatus = result.status;
        await this.configRepo.save(config);

        this.logger.log(
          `${config.erpType} ${eventType}: ${result.success ? '✓' : '✗'} (ref: ${result.erpReference || 'N/A'})`,
        );
      } catch (err) {
        this.logger.error(`${config.erpType} dispatch hatasi: ${eventType}`, err instanceof Error ? err.message : undefined);
      }
    }
  }
}
