import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepo: Repository<ApiKey>,
  ) {}

  /** Generate a new API key. Returns the raw key once (not stored). */
  async generate(data: {
    userId: string;
    name: string;
    permissions?: string[];
    rateLimitPerHour?: number;
    expiresAt?: Date;
  }) {
    const rawKey = `kpt_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = this.apiKeyRepo.create({
      userId: data.userId,
      name: data.name,
      keyHash,
      keyPrefix,
      permissions: data.permissions || ['loads:read'],
      rateLimitPerHour: data.rateLimitPerHour || 1000,
      expiresAt: data.expiresAt || undefined,
    });

    await this.apiKeyRepo.save(apiKey);

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Only returned once
      keyPrefix,
      permissions: apiKey.permissions,
      rateLimitPerHour: apiKey.rateLimitPerHour,
      expiresAt: apiKey.expiresAt,
    };
  }

  async findAll(userId: string) {
    const keys = await this.apiKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'keyPrefix', 'permissions', 'rateLimitPerHour', 'usageCount', 'lastUsedAt', 'expiresAt', 'isActive', 'createdAt'],
    });
    return keys;
  }

  async revoke(id: string, userId: string) {
    await this.apiKeyRepo.update({ id, userId }, { isActive: false });
    return { success: true };
  }

  async delete(id: string, userId: string) {
    await this.apiKeyRepo.delete({ id, userId });
    return { success: true };
  }

  /** Validate API key from request header. Returns userId if valid. */
  async validateApiKey(rawKey: string): Promise<{ userId: string; permissions: string[] } | null> {
    if (!rawKey || !rawKey.startsWith('kpt_')) return null;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return null;

    // Rate limit check
    if (apiKey.usageCount >= apiKey.rateLimitPerHour) {
      this.logger.warn(`API key rate limit exceeded: ${apiKey.name}`);
      return null;
    }

    // Update usage
    apiKey.usageCount++;
    apiKey.lastUsedAt = new Date();
    await this.apiKeyRepo.save(apiKey);

    return { userId: apiKey.userId, permissions: apiKey.permissions || [] };
  }

  /** Reset hourly usage counters */
  @Cron(CronExpression.EVERY_HOUR)
  async resetUsageCounters() {
    await this.apiKeyRepo.update({}, { usageCount: 0 });
    this.logger.log('API key usage counters reset');
  }
}
