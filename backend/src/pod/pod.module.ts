import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliverySignature } from './delivery-signature.entity';
import { DeliveryPhoto } from './delivery-photo.entity';
import { Load } from '../loads/load.entity';
import { Dispute } from '../escrow/dispute.entity';
import { DisputeEvidence } from '../escrow/dispute-evidence.entity';
import { EscrowTransaction } from '../escrow/escrow-transaction.entity';
import { PodService } from './pod.service';
import { PodController } from './pod.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliverySignature, DeliveryPhoto, Load, Dispute, DisputeEvidence, EscrowTransaction])],
  controllers: [PodController],
  providers: [PodService],
  exports: [PodService],
})
export class PodModule {}
