import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingRecord } from './tracking.entity';
import { DeliveryVerification } from './delivery-verification.entity';
import { DriverHours } from './driver-hours.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { DriverHoursService } from './driver-hours.service';
import { Load } from '../loads/load.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { ReturnLoadsModule } from '../return-loads/return-loads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackingRecord, DeliveryVerification, DriverHours, Load]),
    WebSocketModule,
    ReturnLoadsModule
  ],
  controllers: [TrackingController],
  providers: [TrackingService, DriverHoursService],
  exports: [TrackingService, DriverHoursService],
})
export class TrackingModule {}
