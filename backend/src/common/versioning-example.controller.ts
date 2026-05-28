import { Controller, Get } from '@nestjs/common';
import { Deprecated } from './deprecation.interceptor';

/**
 * EX-029: Example v2 controller demonstrating API versioning.
 *
 * NestJS URI Versioning is enabled in main.ts:
 *   - Default version: v1 (all existing endpoints work as-is)
 *   - v2 endpoints: add @Controller({ version: '2' })
 *   - Deprecated v1 endpoints: add @Deprecated() decorator
 *
 * Version strategy:
 *   - v1: Current stable (deprecated 2027-01-01, sunset 2027-07-01)
 *   - v2: Next version with improved response format
 */

@Controller({ path: 'loads', version: '2' })
export class LoadsV2Controller {
  /** v2 loads endpoint with enriched response */
  @Get()
  getLoadsV2() {
    return {
      version: '2',
      message: 'v2 loads endpoint — improved response format with pagination metadata',
      _links: {
        self: '/api/v2/loads',
        create: '/api/v2/loads',
      },
    };
  }
}

@Controller({ path: 'loads', version: '1' })
export class LoadsV1DeprecatedController {
  /** Example deprecated v1 endpoint */
  @Get('legacy')
  @Deprecated({
    deprecatedAt: '2026-06-01',
    sunsetAt: '2027-01-01',
    alternative: '/api/v2/loads',
    message: 'Bu endpoint v2 ile değiştirildi. Lütfen /api/v2/loads kullanın.',
  })
  getLoadsLegacy() {
    return {
      version: '1',
      message: 'Bu endpoint kullanımdan kalkıyor. Deprecation header\'larını kontrol edin.',
    };
  }
}
