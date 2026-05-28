import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarrierAnalytics } from './carrier-analytics.entity';
import { CarrierScorecard } from './carrier-scorecard.entity';
import { CarrierBadge } from './carrier-badge.entity';
import { AnalyticsService } from './analytics.service';
import { CarrierScorecardService } from './carrier-scorecard.service';
import { CarrierQualityService } from './carrier-quality.service';
import { CarrierQualityController } from './carrier-quality.controller';
import { AnalyticsController } from './analytics.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { Load } from '../loads/load.entity';
import { Invoice } from '../gib/invoice.entity';
import { Expense } from '../finance/expense.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CarrierAnalytics, CarrierScorecard, CarrierBadge, Load, Invoice, Expense]),
    NotificationsModule,
  ],
  controllers: [AnalyticsController, CarrierQualityController],
  providers: [AnalyticsService, CarrierScorecardService, CarrierQualityService],
  exports: [AnalyticsService, CarrierScorecardService, CarrierQualityService],
})
export class AnalyticsModule {}
