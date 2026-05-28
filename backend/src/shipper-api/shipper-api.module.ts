import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipperApiController } from './shipper-api.controller';
import { ShipperApiService } from './shipper-api.service';
import { Shipper } from './entities/shipper.entity';
import { ShipmentStatusHistory } from './entities/shipment-status-history.entity';
import { Load } from '../loads/load.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shipper, ShipmentStatusHistory, Load])],
  controllers: [ShipperApiController],
  providers: [ShipperApiService],
  exports: [ShipperApiService],
})
export class ShipperApiModule {}
