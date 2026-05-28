import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstantBooking } from './instant-booking.entity';
import { InstantBookingService } from './instant-booking.service';
import { InstantBookingController } from './instant-booking.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([InstantBooking]), forwardRef(() => WebSocketModule)],
  controllers: [InstantBookingController],
  providers: [InstantBookingService],
  exports: [InstantBookingService],
})
export class InstantBookingModule {}
