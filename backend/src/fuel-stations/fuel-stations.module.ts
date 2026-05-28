import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuelStation } from './fuel-station.entity';
import { FuelPrice } from './fuel-price.entity';
import { StationService } from './station-service.entity';
import { Brand } from './brand.entity';
import { StationImage } from './station-image.entity';
import { StationReview } from './station-review.entity';
import { FavoriteStation } from './favorite-station.entity';
import { FuelAlert } from './fuel-alert.entity';
import { FuelPriceHistory } from './fuel-price-history.entity';
import { RouteStationMatch } from './route-station-match.entity';
import { StationAuditLog } from './station-audit-log.entity';
import { FuelStationsController } from './fuel-stations.controller';
import { FuelStationsService } from './fuel-stations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SavedStationFilter } from './saved-station-filter.entity';
import { FuelCard, FuelCardTransaction } from './fuel-card.entity';
import { FuelCardService } from './fuel-card.service';
import { Expense } from '../finance/expense.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FuelStation, FuelPrice, StationService, StationImage, StationReview,
      Brand, FavoriteStation, FuelAlert, FuelPriceHistory, RouteStationMatch, StationAuditLog, SavedStationFilter,
      FuelCard, FuelCardTransaction, Expense,
    ]),
    NotificationsModule,
    WebSocketModule,
  ],
  controllers: [FuelStationsController],
  providers: [FuelStationsService, FuelCardService],
  exports: [FuelStationsService, FuelCardService],
})
export class FuelStationsModule {}
