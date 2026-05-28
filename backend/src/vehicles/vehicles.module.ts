import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle, VehiclePhoto } from './vehicle.entity';
import { VehicleCategory } from './category.entity';
import { VehicleListing, VehicleBid } from './listing.entity';
import { Notification } from '../notifications/notification.entity';
import { Load } from '../loads/load.entity';
import { VehiclesService } from './vehicles.service';
import { FleetService } from './fleet.service';
import { VehiclesController, CategoriesController, ListingsController, EscrowAdminController } from './vehicles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, VehiclePhoto, VehicleCategory, VehicleListing, VehicleBid, Notification, Load])],
  controllers: [VehiclesController, CategoriesController, ListingsController, EscrowAdminController],
  providers: [VehiclesService, FleetService],
  exports: [VehiclesService, FleetService],
})
export class VehiclesModule {}
