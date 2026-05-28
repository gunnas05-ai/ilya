import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from './bid.entity';
import { Load } from '../loads/load.entity';
import { User } from '../users/user.entity';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { EscrowModule } from '../escrow/escrow.module';
import { UetdsModule } from '../uetds/uetds.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, Load, User]),
    NotificationsModule,
    WebSocketModule,
    forwardRef(() => EscrowModule),
    UetdsModule,
    AnalyticsModule,
  ],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
