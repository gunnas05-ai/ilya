import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WebSocketModule } from '../websocket/websocket.module';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private notifService: NotificationsService,
    private wsGateway: WebSocketGateway,
  ) {}

  onModuleInit() {
    this.notifService.setWsGateway(this.wsGateway);
  }
}
