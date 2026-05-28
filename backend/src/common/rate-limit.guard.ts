import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerRequest } from '@nestjs/throttler/dist/throttler.guard.interface';

const BLOCKED_IPS = new Map<string, number>();
const EXCEED_COUNTS = new Map<string, number>();
const MAX_EXCEEDS = 3;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

// Periodic cleanup of expired blocks
setInterval(() => {
  const now = Date.now();
  for (const [ip, until] of BLOCKED_IPS) {
    if (now >= until) BLOCKED_IPS.delete(ip);
  }
  for (const [ip] of EXCEED_COUNTS) {
    if (!BLOCKED_IPS.has(ip) && Math.random() < 0.3) EXCEED_COUNTS.delete(ip);
  }
}, CLEANUP_INTERVAL_MS);

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Check 15-minute block
    const blockedUntil = BLOCKED_IPS.get(ip);
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingSec = Math.ceil((blockedUntil - Date.now()) / 1000);
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Çok fazla istek — ${remainingSec} saniye bloke edildiniz`,
        retryAfterSeconds: remainingSec,
        blocked: true,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (blockedUntil) BLOCKED_IPS.delete(ip);

    try {
      return await super.handleRequest(requestProps);
    } catch (e) {
      // Track rate-limit exceedances
      const current = (EXCEED_COUNTS.get(ip) || 0) + 1;
      EXCEED_COUNTS.set(ip, current);
      if (current >= MAX_EXCEEDS) {
        BLOCKED_IPS.set(ip, Date.now() + BLOCK_DURATION_MS);
        EXCEED_COUNTS.delete(ip);
      }
      throw e;
    }
  }
}
