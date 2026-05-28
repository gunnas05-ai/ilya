import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReloadBundle } from './reload-bundle.entity';
import { AutomatedReloadsService } from './automated-reloads.service';
import { AutomatedReloadsController } from './automated-reloads.controller';
import { ReturnLoadsModule } from '../return-loads/return-loads.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReloadBundle]),
    ReturnLoadsModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [AutomatedReloadsController],
  providers: [AutomatedReloadsService],
  exports: [AutomatedReloadsService],
})
export class AutomatedReloadsModule {}
