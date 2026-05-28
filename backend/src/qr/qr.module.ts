import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QRCode } from './qr-code.entity';
import { Load } from '../loads/load.entity';
import { TrackingRecord } from '../tracking/tracking.entity';
import { User } from '../users/user.entity';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [TypeOrmModule.forFeature([QRCode, Load, TrackingRecord, User]), WebSocketModule, forwardRef(() => EscrowModule)],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
