import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxPeriodSummary, DeclarationDraft, TaxDefinition, AuditLog, WithholdingDefinition, EDocumentLog } from './tax.entity';
import { TaxEngineService } from './tax-engine.service';
import { AccountingService } from './accounting.service';
import { TaxDashboardService } from './tax-dashboard.service';
import { TevkifatEngineService } from './tevkifat-engine.service';
import { EDefterExportService } from './edefter-export.service';
import { LegislationService } from './legislation.service';
import { TaxIntegrationService } from './tax-integration.service';
import { TaxController } from './tax.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaxPeriodSummary, DeclarationDraft, TaxDefinition, AuditLog, WithholdingDefinition, EDocumentLog])],
  controllers: [TaxController],
  providers: [
    TaxEngineService,
    AccountingService,
    TaxDashboardService,
    TevkifatEngineService,
    EDefterExportService,
    LegislationService,
    TaxIntegrationService,
  ],
  exports: [
    TaxEngineService,
    AccountingService,
    TaxDashboardService,
    TevkifatEngineService,
    EDefterExportService,
    LegislationService,
  ],
})
export class TaxModule {}
