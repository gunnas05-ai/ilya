import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateApiController } from './rate-api.controller';
import { RateApiService } from './rate-api.service';
import { RateAgreement } from './entities/rate-agreement.entity';
import { LoadsModule } from '../loads/loads.module';

@Module({
  imports: [TypeOrmModule.forFeature([RateAgreement]), LoadsModule],
  controllers: [RateApiController],
  providers: [RateApiService],
  exports: [RateApiService],
})
export class RateApiModule {}
