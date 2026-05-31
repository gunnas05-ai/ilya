import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// Yanit zaten { data, total, page } gibi yapilandirilmis bir sayfalama yaniti mi?
function isAlreadyStructured(body: any): boolean {
  if (!body || typeof body !== 'object') return false;
  // Paginated responses: { loads/items, total, page, totalPages }
  if ('total' in body && ('page' in body || 'totalPages' in body)) return true;
  // Already wrapped: { success, data, ... }
  if ('success' in body && 'data' in body) return true;
  // Raw Express response (streams, buffers)
  if (Buffer.isBuffer(body) || body.pipe) return true;
  return false;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (isAlreadyStructured(data)) {
          // Already structured — add timestamp without double-wrapping
          return { success: true, ...data, timestamp: new Date().toISOString() };
        }
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
