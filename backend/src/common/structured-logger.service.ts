import { Injectable, Scope } from '@nestjs/common';
import * as crypto from 'crypto';

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  timestamp: string;
  correlationId?: string;
  traceId?: string;
  service: string;
  module?: string;
  message: string;
  context?: Record<string, any>;
  error?: { name: string; message: string; stack?: string };
  durationMs?: number;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger {
  private readonly serviceName = process.env.SERVICE_NAME || 'kaptan-backend';
  private readonly logLevel = (process.env.LOG_LEVEL || 'debug') as string;
  private readonly prettyPrint = process.env.LOG_PRETTY === 'true';
  currentCorrelationId?: string;
  currentTraceId?: string;

  setCorrelationId(id: string) { this.currentCorrelationId = id; }
  setTraceId(id: string) { this.currentTraceId = id; }
  generateCorrelationId(): string { return `kpt-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`; }

  private shouldLog(level: string): boolean {
    const map: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
    return (map[level] ?? 0) >= (map[this.logLevel] ?? 0);
  }

  private emit(level: string, message: string, context?: Record<string, any>, module?: string) {
    if (!this.shouldLog(level)) return;
    const entry: LogEntry = {
      level: level as LogEntry['level'],
      timestamp: new Date().toISOString(),
      correlationId: this.currentCorrelationId,
      traceId: this.currentTraceId,
      service: this.serviceName,
      module, message, context,
    };
    if (this.prettyPrint) {
      const c: Record<string, string> = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', fatal: '\x1b[35m' };
      console.log(`${c[level] || ''}[${entry.timestamp}] ${level.toUpperCase()} ${message}\x1b[0m`);
    } else {
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
  }

  debug(msg: string, ctx?: Record<string, any>) { this.emit('debug', msg, ctx); }
  info(msg: string, ctx?: Record<string, any>) { this.emit('info', msg, ctx); }
  warn(msg: string, ctx?: Record<string, any>) { this.emit('warn', msg, ctx); }
  error(msg: string, trace?: string, ctx?: Record<string, any>, module?: string) {
    this.emit('error', msg, { ...ctx, error: trace ? { name: 'Error', message: msg, stack: trace } : undefined }, module);
  }
  fatal(msg: string, trace?: string, ctx?: Record<string, any>) {
    this.emit('fatal', msg, { ...ctx, error: { name: 'FatalError', message: msg, stack: trace } });
  }
  logRequest(method: string, url: string, userId?: string, ip?: string) {
    this.currentCorrelationId = this.generateCorrelationId();
    this.info(`${method} ${url}`, { http: { method, url, userId, ip } } as any);
  }
  logResponse(method: string, url: string, statusCode: number, durationMs: number) {
    const lv = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.emit(lv, `${method} ${url} → ${statusCode}`, { http: { method, url, statusCode, durationMs }, durationMs } as any);
  }
  logQuery(query: string, durationMs: number) {
    if (durationMs > 1000) this.warn(`Slow query (${durationMs}ms)`, { db: { q: query.substring(0, 200), ms: durationMs } } as any);
  }
}
