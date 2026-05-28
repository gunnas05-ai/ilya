import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Load } from './load.entity';
import { EpdkFuelPrice } from './epdk-fuel-price.entity';
import { LoadsController } from './loads.controller';
import { LoadsService } from './loads.service';
import { PriceEstimateController } from './price-estimate.controller';
import { PriceEstimateService } from './price-estimate.service';
import { EpdkScraperService } from './epdk-scraper.service';
import { MatchingService } from './matching.service';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { SystemSetting } from '../common/system-setting.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Load, EpdkFuelPrice, User, Notification, SystemSetting]), NotificationsModule],
  controllers: [LoadsController, PriceEstimateController],
  providers: [LoadsService, PriceEstimateService, EpdkScraperService, MatchingService],
  exports: [LoadsService, PriceEstimateService],
})
export class LoadsModule {}
