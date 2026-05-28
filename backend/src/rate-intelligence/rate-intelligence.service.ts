import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { RateRecord } from './rate-record.entity';

@Injectable()
export class RateIntelligenceService {
  private readonly logger = new Logger(RateIntelligenceService.name);

  constructor(
    @InjectRepository(RateRecord) private repo: Repository<RateRecord>,
  ) {}

  /** Tamamlanan yükleri rate kaydı olarak sisteme ekle */
  @OnEvent('load.completed', { async: true })
  async onLoadCompleted(payload: { loadId: string; fromCity: string; toCity: string; price: number; distance: number; vehicleType?: string; loadType?: string; carrierId?: string }) {
    await this.repo.save(this.repo.create({ ...payload, transactionType: 'completed', weight: 1 }));
    this.logger.log(`📊 Rate kaydedildi: ${payload.fromCity}→${payload.toCity} = ${payload.price}₺`);
  }

  /** Teklif kabul edildiğinde de kaydet (daha fazla veri) */
  @OnEvent('bid.accepted', { async: true })
  async onBidAccepted(payload: { loadId: string; fromCity: string; toCity: string; price: number; distance: number; vehicleType?: string; loadType?: string; carrierId?: string }) {
    await this.repo.save(this.repo.create({ ...payload, transactionType: 'accepted_bid', weight: 0.5 }));
  }

  /** Rota bazlı fiyat analizi */
  async getRouteRates(fromCity: string, toCity: string): Promise<{
    route: string;
    avg7d: number; avg15d: number; avg30d: number;
    min7d: number; max7d: number;
    trend: 'up' | 'down' | 'stable';
    trendPct: number;
    sampleCount: number;
    recommendedRange: { min: number; max: number; suggested: number };
    supplyDemandRatio: number; // <1 = az yük çok taşıyıcı, >1 = çok yük az taşıyıcı
  }> {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const base = this.repo.createQueryBuilder('r')
      .where('r.fromCity = :from', { from: fromCity })
      .andWhere('r.toCity = :to', { to: toCity });

    const [all7d, all15d, all30d, prev7d] = await Promise.all([
      base.clone().andWhere('r.createdAt >= :d7', { d7: d7.toISOString() }).getMany(),
      base.clone().andWhere('r.createdAt >= :d15', { d15: d15.toISOString() }).getMany(),
      base.clone().andWhere('r.createdAt >= :d30', { d30: d30.toISOString() }).getMany(),
      base.clone().andWhere('r.createdAt >= :d14', { d14: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() }).andWhere('r.createdAt < :d7', { d7: d7.toISOString() }).getMany(),
    ]);

    const avg = (records: RateRecord[]) => records.length ? records.reduce((s, r) => s + r.price, 0) / records.length : 0;
    const min = (records: RateRecord[]) => records.length ? Math.min(...records.map(r => r.price)) : 0;
    const max = (records: RateRecord[]) => records.length ? Math.max(...records.map(r => r.price)) : 0;

    const a7 = avg(all7d), a15 = avg(all15d), a30 = avg(all30d);
    const prevAvg = avg(prev7d);

    // Trend hesapla
    let trendPct = 0;
    if (prevAvg > 0 && a7 > 0) trendPct = Math.round(((a7 - prevAvg) / prevAvg) * 100);
    const trend: 'up' | 'down' | 'stable' = trendPct > 5 ? 'up' : trendPct < -5 ? 'down' : 'stable';

    // Önerilen fiyat aralığı (son 7 günün %10 altı - %10 üstü)
    const suggested = a7 > 0 ? a7 : a15 > 0 ? a15 : a30;
    const rangeMin = Math.round(suggested * 0.90);
    const rangeMax = Math.round(suggested * 1.10);

    // Arz/talep oranı (basitleştirilmiş)
    const supplyDemandRatio = all7d.length > 0 ? Math.min(3, all7d.length / 5) : 0.5;

    return {
      route: `${fromCity} → ${toCity}`,
      avg7d: Math.round(a7), avg15d: Math.round(a15), avg30d: Math.round(a30),
      min7d: Math.round(min(all7d)), max7d: Math.round(max(all7d)),
      trend, trendPct,
      sampleCount: all7d.length,
      recommendedRange: { min: rangeMin, max: rangeMax, suggested: Math.round(suggested) },
      supplyDemandRatio: Math.round(supplyDemandRatio * 100) / 100,
    };
  }

  /** En çok kazandıran rotalar */
  async getTopRoutes(limit = 10) {
    const records = await this.repo
      .createQueryBuilder('r')
      .select('r.fromCity, r.toCity, AVG(r.price) as avgPrice, COUNT(*) as count')
      .where("r.createdAt > :d30", { d30: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() })
      .groupBy('r.fromCity, r.toCity')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return records.map((r: any) => ({
      fromCity: r.fromCity, toCity: r.toCity,
      avgPrice: Math.round(parseFloat(r.avgPrice)),
      count: parseInt(r.count),
    }));
  }

  /** Fiyat trendleri (son 7 gün vs önceki 7 gün) */
  async getTrendingRoutes() {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recent = await this.repo
      .createQueryBuilder('r')
      .select('r.fromCity, r.toCity, AVG(r.price) as avgPrice, COUNT(*) as count')
      .where('r.createdAt > :d7', { d7: d7.toISOString() })
      .groupBy('r.fromCity, r.toCity')
      .having('COUNT(*) >= 2')
      .getRawMany();

    const results: any[] = [];
    for (const r of recent.slice(0, 10)) {
      const older = await this.repo
        .createQueryBuilder('r')
        .select('AVG(r.price) as avgPrice')
        .where('r.fromCity = :from', { from: r.fromCity })
        .andWhere('r.toCity = :to', { to: r.toCity })
        .andWhere('r.createdAt BETWEEN :d14 AND :d7', { d14: d14.toISOString(), d7: d7.toISOString() })
        .getRawOne();

      const recentAvg = parseFloat(r.avgPrice);
      const olderAvg = parseFloat(older?.avgPrice || '0');
      const change = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

      results.push({
        fromCity: r.fromCity, toCity: r.toCity,
        recentAvg: Math.round(recentAvg), olderAvg: Math.round(olderAvg),
        change, count: parseInt(r.count),
      });
    }

    return results.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  @Cron('0 */1 * * *')
  async cleanup() {
    const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await this.repo.createQueryBuilder().delete().where('createdAt < :d90', { d90: d90.toISOString() }).execute();
  }
}
