import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemHealthLog } from './test-run.entity';
import axios from 'axios';

@Injectable()
export class HealthMonitoringService {
  private readonly logger = new Logger(HealthMonitoringService.name);
  private intervals: ReturnType<typeof setInterval>[] = [];

  constructor(
    @InjectRepository(SystemHealthLog) private healthRepo: Repository<SystemHealthLog>,
  ) {}

  async checkApiHealth(): Promise<SystemHealthLog> {
    const start = Date.now();
    let status: 'healthy' | 'degraded' | 'down' = 'down';
    let errorDetail: string | null = null;

    try {
      const res = await axios.get(`http://127.0.0.1:${process.env.PORT || 3000}/api/v1/health`, { timeout: 5000 });
      status = res.status === 200 ? 'healthy' : 'degraded';
    } catch (e: any) {
      errorDetail = e.message;
      status = 'down';
    }

    return this.saveHealthLog('api', status, Date.now() - start, errorDetail);
  }

  async checkDatabaseHealth(): Promise<SystemHealthLog> {
    const start = Date.now();
    try {
      await this.healthRepo.query('SELECT 1');
      return this.saveHealthLog('database', 'healthy', Date.now() - start, null);
    } catch (e: any) {
      return this.saveHealthLog('database', 'down', Date.now() - start, e.message);
    }
  }

  async checkRedisHealth(): Promise<SystemHealthLog> {
    const start = Date.now();
    try {
      // Redis kontrolu — Redis yoksa degraded
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || '6379';
      await axios.get(`http://${redisHost}:${redisPort}/health`, { timeout: 2000 }).catch(() => {
        throw new Error('Redis not reachable');
      });
      return this.saveHealthLog('redis', 'healthy', Date.now() - start, null);
    } catch {
      return this.saveHealthLog('redis', 'degraded', Date.now() - start, 'Redis not available — using in-memory fallback');
    }
  }

  async checkWebSocketHealth(): Promise<SystemHealthLog> {
    const start = Date.now();
    try {
      const res = await axios.get(`http://127.0.0.1:${process.env.PORT || 3000}`, { timeout: 3000 });
      return this.saveHealthLog('ws', res.status < 500 ? 'healthy' : 'degraded', Date.now() - start, null);
    } catch (e: any) {
      return this.saveHealthLog('ws', 'down', Date.now() - start, e.message);
    }
  }

  async checkPaymentGateway(): Promise<SystemHealthLog> {
    const start = Date.now();
    if (process.env.PAYMENT_PROVIDER === 'mock') {
      return this.saveHealthLog('payment', 'healthy', Date.now() - start, 'Mock mode — test ortami');
    }
    try {
      await axios.get(process.env.IYZICO_BASE_URL + '/payment/test', { timeout: 5000 });
      return this.saveHealthLog('payment', 'healthy', Date.now() - start, null);
    } catch (e: any) {
      return this.saveHealthLog('payment', 'degraded', Date.now() - start, e.message);
    }
  }

  async checkAll(): Promise<SystemHealthLog[]> {
    const results = await Promise.allSettled([
      this.checkApiHealth(),
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkWebSocketHealth(),
      this.checkPaymentGateway(),
    ]);
    return results
      .filter((r): r is PromiseFulfilledResult<SystemHealthLog> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  async getLatestHealth(): Promise<Record<string, SystemHealthLog>> {
    const services = ['api', 'database', 'redis', 'ws', 'payment'];
    const result: Record<string, SystemHealthLog> = {};
    for (const svc of services) {
      const latest = await this.healthRepo.findOne({
        where: { service: svc },
        order: { createdAt: 'DESC' },
      });
      if (latest) result[svc] = latest;
    }
    return result;
  }

  async getHealthHistory(service: string, limit = 50): Promise<SystemHealthLog[]> {
    return this.healthRepo.find({
      where: { service },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  startScheduledChecks() {
    // Her 5 dakikada bir tum kontrolleri yap
    this.intervals.push(
      setInterval(() => this.checkAll().catch(() => {}), 5 * 60 * 1000),
    );
    // Ilk kontrolu hemen yap
    this.checkAll().catch(() => {});
    this.logger.log('Health monitoring scheduled checks started (every 5 min)');
  }

  stopScheduledChecks() {
    this.intervals.forEach((i) => clearInterval(i));
    this.intervals = [];
  }

  private async saveHealthLog(
    service: string,
    status: 'healthy' | 'degraded' | 'down',
    responseTimeMs: number,
    errorDetail: string | null,
  ): Promise<SystemHealthLog> {
    const log = this.healthRepo.create({ service, status, responseTimeMs, errorDetail });
    return this.healthRepo.save(log);
  }
}
