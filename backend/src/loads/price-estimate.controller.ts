import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceEstimateService } from './price-estimate.service';
import { EpdkScraperService } from './epdk-scraper.service';
import { SystemSetting } from '../common/system-setting.entity';

@Controller('loads')
export class PriceEstimateController {
  constructor(
    private readonly priceEstimateService: PriceEstimateService,
    private readonly epdkService: EpdkScraperService,
    @InjectRepository(SystemSetting)
    private settingsRepo: Repository<SystemSetting>,
  ) {}

  @Post('price-estimate')
  @UseGuards(AuthGuard('jwt'))
  async estimatePrice(@Body() body: any) {
    return this.priceEstimateService.calculate(body);
  }

  @Post('lane-rates')
  @UseGuards(AuthGuard('jwt'))
  async getLaneRates(@Body() body: { fromCity: string; toCity: string }) {
    return this.priceEstimateService.getLaneRates(body.fromCity, body.toCity);
  }

  @Get('lane-rates-history')
  @UseGuards(AuthGuard('jwt'))
  async getLaneRatesHistory(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('months') months?: string,
  ) {
    return this.priceEstimateService.getLaneRatesHistory(from, to, months ? parseInt(months) : 6);
  }

  @Get('market-heatmap')
  @UseGuards(AuthGuard('jwt'))
  async getMarketHeatmap() {
    return this.priceEstimateService.getMarketHeatmap();
  }

  /** EX-006: Get current fuel prices and history */
  @Get('fuel-prices')
  @UseGuards(AuthGuard('jwt'))
  async getFuelPrices(@Query('history') history?: string) {
    const latest = await this.epdkService.getLatestPrices();
    const priceHistory = history === 'true'
      ? await this.epdkService.getPriceHistory(30)
      : undefined;
    return { latest, history: priceHistory };
  }

  /** EX-006: Manually trigger EPDK fuel price scrape (admin only) */
  @Post('trigger-fuel-scrape')
  @UseGuards(AuthGuard('jwt'))
  async triggerFuelScrape(@Req() req: any) {
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return { success: false, message: 'Yalnızca admin kullanıcılar tetikleyebilir.' };
    }
    const result = await this.epdkService.scrapeFuelPrices();
    return { success: true, data: result };
  }

  /** GÖREV 2: Admin — Fiyat formülü sabitlerini güncelle */
  @Post('formula-constants')
  @UseGuards(AuthGuard('jwt'))
  async updateFormulaConstants(@Body() body: { A?: number; D?: number }, @Req() req: any) {
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return { success: false, message: 'Yetkisiz erişim' };
    }
    const results: Record<string, any> = {};
    if (body.A != null) {
      const existing = await this.settingsRepo.findOne({ where: { key: 'formula_A' } });
      if (existing) { existing.value = String(body.A); await this.settingsRepo.save(existing); }
      else { await this.settingsRepo.save(this.settingsRepo.create({ key: 'formula_A', value: String(body.A), description: 'Yakıt tüketimi litre/km' })); }
      results.A = body.A;
    }
    if (body.D != null) {
      const existing = await this.settingsRepo.findOne({ where: { key: 'formula_D' } });
      if (existing) { existing.value = String(body.D); await this.settingsRepo.save(existing); }
      else { await this.settingsRepo.save(this.settingsRepo.create({ key: 'formula_D', value: String(body.D), description: 'Operasyonel maliyet çarpanı' })); }
      results.D = body.D;
    }
    return { success: true, ...results };
  }
}
