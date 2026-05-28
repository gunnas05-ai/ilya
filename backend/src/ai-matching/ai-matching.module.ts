import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarrierPreference } from './carrier-preference.entity';
import { MatchingFeedback } from './matching-feedback.entity';
import { AiMatchingService } from './ai-matching.service';
import { AiMatchingController } from './ai-matching.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CarrierPreference, MatchingFeedback])],
  controllers: [AiMatchingController],
  providers: [AiMatchingService],
  exports: [AiMatchingService],
})
export class AiMatchingModule {}
