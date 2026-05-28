import { Controller, Get, Query } from '@nestjs/common';
import { RateIntelligenceService } from './rate-intelligence.service';

@Controller({ path: 'rates', version: '1' })
export class RateIntelligenceController {
  constructor(private readonly service: RateIntelligenceService) {}

  @Get('route')
  async getRouteRates(@Query('from') from: string, @Query('to') to: string) {
    return this.service.getRouteRates(from, to);
  }

  @Get('top')
  async getTopRoutes(@Query('limit') limit?: string) {
    return { data: await this.service.getTopRoutes(parseInt(limit || '10')) };
  }

  @Get('trending')
  async getTrending() {
    return { data: await this.service.getTrendingRoutes() };
  }
}
