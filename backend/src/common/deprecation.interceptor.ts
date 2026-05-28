import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';

export const DEPRECATION_KEY = 'deprecation';

export interface DeprecationMeta {
  deprecatedAt: string;       // ISO date
  sunsetAt: string;           // ISO date when the endpoint will be removed
  alternative?: string;       // e.g., '/api/v2/loads'
  message?: string;
}

export const Deprecated = (meta: DeprecationMeta) => SetMetadata(DEPRECATION_KEY, meta);

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const deprecationMeta = this.reflector.getAllAndOverride<DeprecationMeta>(DEPRECATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (deprecationMeta) {
      const response = context.switchToHttp().getResponse<Response>();

      response.setHeader('Deprecation', 'true');
      response.setHeader('Sunset', new Date(deprecationMeta.sunsetAt).toUTCString());
      response.setHeader('Deprecation-Date', deprecationMeta.deprecatedAt);

      if (deprecationMeta.alternative) {
        response.setHeader('Link', `<${deprecationMeta.alternative}>; rel="successor-version"`);
      }

      return next.handle().pipe(
        map((data) => ({
          ...data,
          _deprecation: {
            message: deprecationMeta.message || 'Bu API versiyonu kullanımdan kalkıyor. Lütfen yeni versiyona geçin.',
            sunsetAt: deprecationMeta.sunsetAt,
            alternative: deprecationMeta.alternative,
          },
        })),
      );
    }

    return next.handle();
  }
}
