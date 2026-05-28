import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateRecord } from './rate-record.entity';
import { RateIntelligenceService } from './rate-intelligence.service';
import { RateIntelligenceController } from './rate-intelligence.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RateRecord])],
  controllers: [RateIntelligenceController],
  providers: [RateIntelligenceService],
  exports: [RateIntelligenceService],
})
export class RateIntelligenceModule {}
