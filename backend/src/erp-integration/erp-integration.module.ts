import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErpIntegrationConfig } from './entities/erp-integration-config.entity';
import { ErpDispatcherService } from './erp-dispatcher.service';
import { SapAdapterService } from './adapters/sap-adapter.service';
import { OracleAdapterService } from './adapters/oracle-adapter.service';
import { NetsuiteAdapterService } from './adapters/netsuite-adapter.service';

@Module({
  imports: [TypeOrmModule.forFeature([ErpIntegrationConfig])],
  providers: [ErpDispatcherService, SapAdapterService, OracleAdapterService, NetsuiteAdapterService],
  exports: [ErpDispatcherService],
})
export class ErpIntegrationModule {}
