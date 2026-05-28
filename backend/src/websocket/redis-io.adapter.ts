import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterReady = false;
  private pubClient: any;
  private subClient: any;

  async connectToRedis(): Promise<void> {
    try {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

      this.pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.adapterReady = true;
      this.logger.log(`🔴 Redis IO adapter connected: ${redisHost}:${redisPort}`);
    } catch (err: any) {
      this.logger.warn(`Redis unavailable — fallback to in-memory WS: ${err.message}`);
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (this.adapterReady) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }

    return server;
  }
}
