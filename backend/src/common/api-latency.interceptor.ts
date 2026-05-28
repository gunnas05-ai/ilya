import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { EscrowMetricsService } from '../escrow/escrow-metrics.service';
import { StructuredLogger } from './structured-logger.service';

@Injectable()
export class ApiLatencyInterceptor implements NestInterceptor {
  constructor(
    private metricsService: EscrowMetricsService,
    private logger: StructuredLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const method = req.method || 'UNKNOWN';
    const path = req.route?.path || req.url || 'unknown';
    const userId = req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;

    // EX-031: Structured request logging
    this.logger.logRequest(method, path, userId, ip);

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - start;
        this.metricsService.recordApiLatency(duration / 1000, method, path);
        const statusCode = context.switchToHttp().getResponse()?.statusCode || 200;
        this.logger.logResponse(method, path, statusCode, duration);
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        this.logger.error(`${method} ${path} → ${err.status || 500}`, err.stack, {
          http: { method, path, statusCode: err.status || 500, durationMs: duration },
          userId,
        });
        throw err;
      }),
    );
  }
}
