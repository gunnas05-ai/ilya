import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { UetdsTransaction } from './uetds-transaction.entity';
import { UetdsService } from './uetds.service';
import { UetdsProcessor } from './uetds.processor';
import { UetdsController } from './uetds.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UetdsTransaction]),
    BullModule.registerQueue({
      name: 'uetds-queue',
    }),
  ],
  controllers: [UetdsController],
  providers: [UetdsService, UetdsProcessor],
  exports: [UetdsService],
})
export class UetdsModule {}
