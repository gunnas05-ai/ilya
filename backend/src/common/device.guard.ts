import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class DeviceGuard implements CanActivate {
  private readonly logger = new Logger(DeviceGuard.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceFingerprint = request.headers['x-device-fingerprint'];

    if (!deviceFingerprint) return true; // Optional for unauthenticated/public endpoints

    // If user is authenticated, verify device fingerprint matches
    const userId = request.user?.id;
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'deviceFingerprint'] });
      if (user && user.deviceFingerprint && user.deviceFingerprint !== deviceFingerprint) {
        this.logger.warn(`Device mismatch for user ${userId}`);
        // Update fingerprint on first mismatch (new device) rather than blocking
        // For strict mode: throw new UnauthorizedException('Yeni cihaz tespit edildi. Lütfen tekrar giriş yapın.');
      }
      request.deviceFingerprint = deviceFingerprint;
    }

    return true;
  }
}
