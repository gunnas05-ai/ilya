import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarrierApiController } from './carrier-api.controller';
import { CarrierApiService } from './carrier-api.service';
import { Carrier } from './entities/carrier.entity';
import { CarrierStatusHistory } from './entities/carrier-status-history.entity';
import { Load } from '../loads/load.entity';
import { Bid } from '../bids/bid.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carrier, CarrierStatusHistory, Load, Bid])],
  controllers: [CarrierApiController],
  providers: [CarrierApiService],
  exports: [CarrierApiService],
})
export class CarrierApiModule {}
