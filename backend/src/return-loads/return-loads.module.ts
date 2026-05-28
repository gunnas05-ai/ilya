import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Load } from '../loads/load.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { ReturnLoadsService } from './return-loads.service';
import { ReturnLoadsController } from './return-loads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Load]), WebSocketModule],
  controllers: [ReturnLoadsController],
  providers: [ReturnLoadsService],
  exports: [ReturnLoadsService],
})
export class ReturnLoadsModule {}
