import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class DeviceGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceFingerprint = request.headers['x-device-fingerprint'];
    if (!deviceFingerprint) return true; // Optional for now
    request.deviceFingerprint = deviceFingerprint;
    return true;
  }
}
