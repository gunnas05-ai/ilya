import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EpdkFuelPrice } from './epdk-fuel-price.entity';

// Shared reference updated by scraper, read by PriceEstimateService
export let LIVE_FUEL_PRICES = {
  motorin: 45.50,
  benzin: 43.20,
  lpg: 23.80,
  adblue: 28.00,
  updatedAt: new Date().toISOString(),
};

// EPDK default prices (updated with realistic Turkish market rates)
const EPDK_DEFAULTS = {
  motorin: 45.50,
  benzin: 43.20,
  lpg: 23.80,
  adblue: 28.00,
};

@Injectable()
export class EpdkScraperService {
  private readonly logger = new Logger(EpdkScraperService.name);

  constructor(
    @InjectRepository(EpdkFuelPrice)
    private epdkRepo: Repository<EpdkFuelPrice>,
  ) {}

  /**
   * Her gece 00:10'da EPDK sitesinden güncel akaryakıt fiyatlarını çeker.
   * Production'da gerçek EPDK scraping yapılır; şu an simülasyon modunda.
   */
  @Cron('10 0 * * *', { name: 'epdk-fuel-scraper' })
  async scrapeFuelPrices() {
    this.logger.log('⛽ EPDK yakıt fiyatı çekme başladı...');
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if already scraped today
      const existing = await this.epdkRepo.findOne({ where: { date: today } });
      if (existing) {
        this.logger.log(`Bugünün fiyatları zaten kaydedilmiş (${today}). Atlanıyor.`);
        return existing;
      }

      // Simulate EPDK scraping with realistic price variations (±3%)
      const vary = (base: number) => {
        const pct = (Math.random() - 0.5) * 6; // -3% to +3%
        return Math.round(base * (1 + pct / 100) * 100) / 100;
      };

      const prices = {
        motorin: vary(EPDK_DEFAULTS.motorin),
        benzin: vary(EPDK_DEFAULTS.benzin),
        lpg: vary(EPDK_DEFAULTS.lpg),
        adblue: vary(EPDK_DEFAULTS.adblue),
      };

      const record = this.epdkRepo.create({
        date: today,
        ...prices,
        source: 'epdk_scraper_simulation',
      });

      await this.epdkRepo.save(record);

      // Update shared live prices
      LIVE_FUEL_PRICES.motorin = prices.motorin;
      LIVE_FUEL_PRICES.benzin = prices.benzin;
      LIVE_FUEL_PRICES.lpg = prices.lpg;
      LIVE_FUEL_PRICES.adblue = prices.adblue;
      LIVE_FUEL_PRICES.updatedAt = new Date().toISOString();

      this.logger.log(
        `✅ EPDK fiyatları güncellendi: Motorin ${prices.motorin}₺/L, ` +
        `Benzin ${prices.benzin}₺/L, LPG ${prices.lpg}₺/L`,
      );

      return record;
    } catch (err) {
      this.logger.error(`EPDK scraping başarısız: ${err.message}`);
      // Fallback: keep previous prices, don't crash
    }
  }

  /** Get latest fuel prices (for API responses) */
  async getLatestPrices() {
    const latest = await this.epdkRepo.find({
      order: { date: 'DESC' },
      take: 1,
    });

    if (latest.length > 0) {
      const p = latest[0];
      return {
        motorin: Number(p.motorin),
        benzin: Number(p.benzin),
        lpg: Number(p.lpg),
        adblue: Number(p.adblue),
        updatedAt: p.createdAt.toISOString(),
        source: p.source,
      };
    }

    // Fallback to live prices if DB is empty
    return { ...LIVE_FUEL_PRICES, source: 'fallback' };
  }

  /** Get price history for trend analysis (last N days) */
  async getPriceHistory(days = 30) {
    const records = await this.epdkRepo.find({
      order: { date: 'DESC' },
      take: days,
    });

    return records.map(r => ({
      date: r.date,
      motorin: Number(r.motorin),
      benzin: Number(r.benzin),
      lpg: Number(r.lpg),
      adblue: Number(r.adblue),
    })).reverse();
  }
}
