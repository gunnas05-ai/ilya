import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { ProfileVerificationController } from './profile-verification.controller';
import { ProfileVerificationService } from './profile-verification.service';
import { RequireVerifiedGuard } from './require-verified.guard';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), WebSocketModule],
  controllers: [UsersController, VerificationController, ProfileVerificationController],
  providers: [UsersService, VerificationService, ProfileVerificationService, RequireVerifiedGuard],
  exports: [UsersService, VerificationService, ProfileVerificationService, RequireVerifiedGuard],
})
export class UsersModule {}
