import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CarrierAnalytics, AnalyticsPeriod } from './carrier-analytics.entity';
import { Load } from '../loads/load.entity';
import { Invoice } from '../gib/invoice.entity';
import { Expense } from '../finance/expense.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CarrierAnalytics)
    private analyticsRepo: Repository<CarrierAnalytics>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
    private notifService: NotificationsService,
  ) {}

  async getEfficiency(carrierId: string, period: AnalyticsPeriod = AnalyticsPeriod.MONTHLY) {
    const now = new Date();
    const { periodStart, periodEnd } = this.getPeriodRange(period, now);

    let record = await this.analyticsRepo.findOne({
      where: { carrierId, period, periodStart, periodEnd },
    });

    if (!record) {
      record = this.analyticsRepo.create({
        carrierId,
        period,
        periodStart,
        periodEnd,
      });
    }

    return record;
  }

  async recordCompletedTrip(data: {
    carrierId: string;
    emptyKm: number;
    loadedKm: number;
    hadReturnLoad: boolean;
    fillRate: number;
    revenue: number;
  }) {
    const now = new Date();
    const periods = [
      { period: AnalyticsPeriod.DAILY, range: this.getPeriodRange(AnalyticsPeriod.DAILY, now) },
      { period: AnalyticsPeriod.WEEKLY, range: this.getPeriodRange(AnalyticsPeriod.WEEKLY, now) },
      { period: AnalyticsPeriod.MONTHLY, range: this.getPeriodRange(AnalyticsPeriod.MONTHLY, now) },
    ];

    for (const { period, range } of periods) {
      let record = await this.analyticsRepo.findOne({
        where: {
          carrierId: data.carrierId,
          period,
          periodStart: range.periodStart,
          periodEnd: range.periodEnd,
        },
      });

      if (!record) {
        record = this.analyticsRepo.create({
          carrierId: data.carrierId,
          period,
          periodStart: range.periodStart,
          periodEnd: range.periodEnd,
          totalEmptyKm: 0,
          totalLoadedKm: 0,
          returnLoadRatio: 0,
          avgFillRate: 0,
          successfulReturnLoads: 0,
          totalTrips: 0,
          estimatedFuelSaving: 0,
          estimatedExtraRevenue: 0,
          efficiencyScore: 0,
        });
      }

      record.totalTrips += 1;
      record.totalEmptyKm += data.emptyKm;
      record.totalLoadedKm += data.loadedKm;
      record.avgFillRate = ((record.avgFillRate * (record.totalTrips - 1)) + data.fillRate) / record.totalTrips;
      if (data.hadReturnLoad) {
        record.successfulReturnLoads += 1;
        record.estimatedFuelSaving += data.emptyKm * 0.4 * 42; // ~0.4L/km * 42TL/L
        record.estimatedExtraRevenue += data.revenue;
      }
      record.returnLoadRatio = record.totalTrips > 0
        ? record.successfulReturnLoads / record.totalTrips
        : 0;

      record.efficiencyScore = this.calculateEfficiencyScore(record);

      await this.analyticsRepo.save(record);
    }

    // Check for incentive triggers
    const monthly = await this.getEfficiency(data.carrierId, AnalyticsPeriod.MONTHLY);
    await this.checkIncentiveTriggers(data.carrierId, monthly);
  }

  async getEfficiencyHistory(carrierId: string, limit = 12) {
    return this.analyticsRepo.find({
      where: { carrierId, period: AnalyticsPeriod.MONTHLY },
      order: { periodStart: 'DESC' },
      take: limit,
    });
  }

  async getLeaderboard(period: AnalyticsPeriod = AnalyticsPeriod.MONTHLY, limit = 20) {
    const now = new Date();
    const { periodStart, periodEnd } = this.getPeriodRange(period, now);

    return this.analyticsRepo.find({
      where: { period, periodStart, periodEnd },
      order: { efficiencyScore: 'DESC' },
      take: limit,
    });
  }

  private calculateEfficiencyScore(record: CarrierAnalytics): number {
    let score = 0;

    // Return load ratio (max 30 points)
    score += Math.round(record.returnLoadRatio * 30);

    // Fill rate (max 30 points)
    if (record.avgFillRate >= 80) score += 30;
    else if (record.avgFillRate >= 60) score += 20;
    else if (record.avgFillRate >= 40) score += 10;

    // Empty km reduction (max 20 points)
    const totalKm = record.totalEmptyKm + record.totalLoadedKm;
    const emptyRatio = totalKm > 0 ? record.totalEmptyKm / totalKm : 1;
    score += Math.round(Math.max(0, 1 - emptyRatio) * 20);

    // Trip count bonus (max 20 points)
    if (record.successfulReturnLoads >= 20) score += 20;
    else if (record.successfulReturnLoads >= 10) score += 15;
    else if (record.successfulReturnLoads >= 5) score += 10;
    else if (record.successfulReturnLoads >= 2) score += 5;

    return Math.min(100, score);
  }

  private async checkIncentiveTriggers(carrierId: string, analytics: CarrierAnalytics) {
    const triggers: Array<{ title: string; message: string; priority: number }> = [];

    if (analytics.totalEmptyKm > 1000) {
      triggers.push({
        title: 'Boş Dönüşünü Azalt',
        message: `Bu ay ${Math.round(analytics.totalEmptyKm)} km boş dönüş yaptınız. Dönüş yükü bularak yakıt maliyetinizi düşürebilirsiniz.`,
        priority: 1,
      });
    }

    if (analytics.returnLoadRatio < 0.3 && analytics.totalTrips >= 3) {
      triggers.push({
        title: 'Dönüş Yükü Fırsatı',
        message: 'Rotalarınıza uygun dönüş yükleri mevcut. Boş dönmeyin, kazanca dönüştürün!',
        priority: 2,
      });
    }

    if (analytics.efficiencyScore >= 70) {
      triggers.push({
        title: 'Verimlilik Ustası',
        message: `Verimlilik puanınız ${analytics.efficiencyScore}! Yüksek performansınızla daha fazla kazanç elde edin.`,
        priority: 3,
      });
    }

    // Send highest priority notification
    if (triggers.length > 0) {
      const top = triggers.sort((a, b) => b.priority - a.priority)[0];
      await this.notifService.create({
        userId: carrierId,
        type: NotificationType.NEW_LOAD_MATCH,
        title: top.title,
        message: top.message,
        data: { analyticsId: analytics.id, efficiencyScore: analytics.efficiencyScore },
      });
    }
  }

  // ── EX-014: Shipper Dashboard ──────────────────────────

  async getShipperDashboard(userId: string) {
    const loads = await this.loadRepo.find({
      where: { creatorId: userId },
      order: { createdAt: 'DESC' },
    });

    const totalLoads = loads.length;
    const activeLoads = loads.filter(l => l.status === 'beklemede' || l.status === 'yolda').length;
    const completedLoads = loads.filter(l => l.status === 'teslim_edildi').length;
    const totalSpent = loads.reduce((s, l) => s + (Number(l.totalPrice) || 0), 0);
    const avgPrice = totalLoads > 0 ? Math.round(totalSpent / totalLoads) : 0;

    // Most used lanes
    const lanes: Record<string, { count: number; totalPrice: number }> = {};
    for (const l of loads) {
      const key = `${l.fromCity} → ${l.toCity}`;
      if (!lanes[key]) lanes[key] = { count: 0, totalPrice: 0 };
      lanes[key].count++;
      lanes[key].totalPrice += Number(l.totalPrice) || 0;
    }
    const topLanes = Object.entries(lanes)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([lane, data]) => ({ lane, count: data.count, avgPrice: Math.round(data.totalPrice / data.count) }));

    // Monthly trend (last 6 months)
    const monthlyTrend: Record<string, { count: number; total: number }> = {};
    for (const l of loads) {
      const month = l.createdAt.toISOString().slice(0, 7);
      if (!monthlyTrend[month]) monthlyTrend[month] = { count: 0, total: 0 };
      monthlyTrend[month].count++;
      monthlyTrend[month].total += Number(l.totalPrice) || 0;
    }
    const trend = Object.entries(monthlyTrend)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => ({ month, count: data.count, total: data.total }));

    return { totalLoads, activeLoads, completedLoads, totalSpent, avgPrice, topLanes, trend };
  }

  // ── EX-014: Lane Analytics ──────────────────────────────

  async getLaneAnalytics() {
    const loads = await this.loadRepo.find({ order: { createdAt: 'DESC' }, take: 500 });

    const laneData: Record<string, {
      count: number; totalPrice: number; minPrice: number; maxPrice: number;
      completed: number; total: number;
    }> = {};

    for (const l of loads) {
      const key = `${l.fromCity} → ${l.toCity}`;
      if (!laneData[key]) {
        laneData[key] = { count: 0, totalPrice: 0, minPrice: Infinity, maxPrice: 0, completed: 0, total: 0 };
      }
      const d = laneData[key];
      d.count++;
      d.total++;
      const price = Number(l.totalPrice) || 0;
      d.totalPrice += price;
      if (price < d.minPrice) d.minPrice = price;
      if (price > d.maxPrice) d.maxPrice = price;
      if (l.status === 'teslim_edildi') d.completed++;
    }

    const lanes = Object.entries(laneData)
      .map(([lane, data]) => ({
        lane,
        totalLoads: data.count,
        avgPrice: Math.round(data.totalPrice / data.count),
        minPrice: data.minPrice === Infinity ? 0 : data.minPrice,
        maxPrice: data.maxPrice,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        delayRate: data.total > 0 ? Math.round(((data.total - data.completed) / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalLoads - a.totalLoads);

    return { lanes, totalLanes: lanes.length };
  }

  // ── EX-014: CSV Export ──────────────────────────────────

  async exportCSV(userId: string, type: string) {
    if (type === 'loads') {
      const loads = await this.loadRepo.find({ where: { creatorId: userId }, order: { createdAt: 'DESC' } });
      const header = 'ID,Yük No,Başlık,Tür,Çıkış,Varış,Fiyat,Durum,Tarih';
      const rows = loads.map(l =>
        `${l.id},${l.loadNo},"${l.title}",${l.loadType},${l.fromCity},${l.toCity},${l.totalPrice || 0},${l.status},${l.createdAt.toISOString()}`,
      );
      return { csv: [header, ...rows].join('\n'), filename: `yukler_${new Date().toISOString().slice(0, 10)}.csv` };
    }

    if (type === 'invoices') {
      const invoices = await this.invoiceRepo.find({ where: { companyId: userId } as any, order: { createdAt: 'DESC' } });
      const header = 'ID,Belge No,Tür,KDV,Toplam,Durum,Tarih';
      const rows = invoices.map(i =>
        `${i.id},${i.invoiceNo},${i.invoiceType},${i.vatTotal},${i.grandTotal},${i.status},${i.issueDate.toISOString()}`,
      );
      return { csv: [header, ...rows].join('\n'), filename: `faturalar_${new Date().toISOString().slice(0, 10)}.csv` };
    }

    if (type === 'expenses') {
      const expenses = await this.expenseRepo.find({ where: { userId } as any, order: { createdAt: 'DESC' } });
      const header = 'ID,Açıklama,Tutar,Tarih,Kategori';
      const rows = expenses.map(e =>
        `${e.id},"${(e as any).vendorName || ''}",${e.amount},${e.date.toISOString()},${e.categoryId || ''}`,
      );
      return { csv: [header, ...rows].join('\n'), filename: `giderler_${new Date().toISOString().slice(0, 10)}.csv` };
    }

    return { csv: '', filename: 'export.csv', message: 'Geçersiz tip. Kullanılabilir: loads, invoices, expenses' };
  }

  private getPeriodRange(period: AnalyticsPeriod, date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth();

    switch (period) {
      case AnalyticsPeriod.DAILY: {
        const ds = new Date(y, m, date.getDate());
        const de = new Date(y, m, date.getDate() + 1);
        return {
          periodStart: ds.toISOString().split('T')[0],
          periodEnd: de.toISOString().split('T')[0],
        };
      }
      case AnalyticsPeriod.WEEKLY: {
        const dow = date.getDay();
        const ws = new Date(y, m, date.getDate() - dow);
        const we = new Date(y, m, date.getDate() - dow + 7);
        return {
          periodStart: ws.toISOString().split('T')[0],
          periodEnd: we.toISOString().split('T')[0],
        };
      }
      case AnalyticsPeriod.MONTHLY:
      default: {
        return {
          periodStart: `${y}-${String(m + 1).padStart(2, '0')}-01`,
          periodEnd: `${y}-${String(m + 2).padStart(2, '0')}-01`,
        };
      }
    }
  }
}
