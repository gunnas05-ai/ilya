import { Controller, Get, Query, Param } from '@nestjs/common';
import { CarrierQualityService } from './carrier-quality.service';

@Controller({ path: 'carrier-quality', version: '1' })
export class CarrierQualityController {
  constructor(private readonly service: CarrierQualityService) {}

  @Get('scorecard/:carrierId')
  async getScorecard(@Param('carrierId') carrierId: string) {
    return { data: await this.service.getScorecard(carrierId) };
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return { data: await this.service.getLeaderboard(parseInt(limit || '20')) };
  }

  @Get('filter')
  async filterByScore(@Query('minScore') minScore: string) {
    return { data: await this.service.filterCarriersByScore(parseInt(minScore || '70')) };
  }
}
