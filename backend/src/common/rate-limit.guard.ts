import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerRequest } from '@nestjs/throttler/dist/throttler.guard.interface';
import { createClient, RedisClientType } from 'redis';

const MAX_EXCEEDS = 3;
const BLOCK_DURATION_SEC = 15 * 60; // 15 minutes

@Injectable()
export class RateLimitGuard extends ThrottlerGuard implements OnModuleInit {
  private readonly logger = new Logger(RateLimitGuard.name);
  private redis: RedisClientType | null = null;
  private useRedis = false;

  // In-memory fallback for single-instance / no-Redis environments
  private readonly blockedIps = new Map<string, number>();
  private readonly exceedCounts = new Map<string, number>();

  async onModuleInit() {
    try {
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:6379`;
      this.redis = createClient({ url: redisUrl });
      await this.redis.connect();
      this.useRedis = true;
      this.logger.log('RateLimitGuard: Redis connected — distributed rate limiting active');
    } catch (err) {
      this.logger.warn('RateLimitGuard: Redis unavailable — falling back to in-memory rate limiting (not suitable for multi-instance deployment)');
      this.redis = null;
      this.useRedis = false;

      // Periodic cleanup for in-memory fallback
      setInterval(() => {
        const now = Date.now();
        for (const [ip, until] of this.blockedIps) {
          if (now >= until) this.blockedIps.delete(ip);
        }
      }, 60_000);
    }
  }

  private async isBlocked(ip: string): Promise<number | null> {
    if (this.useRedis && this.redis) {
      const blockedUntil = await this.redis.get(`rl:block:${ip}`);
      if (blockedUntil) {
        const remaining = parseInt(blockedUntil, 10) - Math.floor(Date.now() / 1000);
        if (remaining > 0) return remaining;
        await this.redis.del(`rl:block:${ip}`);
      }
      return null;
    }

    const until = this.blockedIps.get(ip);
    if (until && Date.now() < until) {
      return Math.ceil((until - Date.now()) / 1000);
    }
    if (until) this.blockedIps.delete(ip);
    return null;
  }

  private async trackExceed(ip: string) {
    if (this.useRedis && this.redis) {
      const key = `rl:exceed:${ip}`;
      const count = await this.redis.incr(key);
      await this.redis.expire(key, 900); // 15 min TTL
      if (count >= MAX_EXCEEDS) {
        const blockUntil = Math.floor(Date.now() / 1000) + BLOCK_DURATION_SEC;
        await this.redis.set(`rl:block:${ip}`, blockUntil.toString(), { EX: BLOCK_DURATION_SEC });
        await this.redis.del(key);
      }
      return;
    }

    const current = (this.exceedCounts.get(ip) || 0) + 1;
    this.exceedCounts.set(ip, current);
    if (current >= MAX_EXCEEDS) {
      this.blockedIps.set(ip, Date.now() + BLOCK_DURATION_SEC * 1000);
      this.exceedCounts.delete(ip);
    }
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    const blockedSec = await this.isBlocked(ip);
    if (blockedSec !== null) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Çok fazla istek — ${blockedSec} saniye bloke edildiniz`,
        retryAfterSeconds: blockedSec,
        blocked: true,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      return await super.handleRequest(requestProps);
    } catch (e) {
      await this.trackExceed(ip);
      throw e;
    }
  }
}
