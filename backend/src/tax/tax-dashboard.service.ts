import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxPeriodSummary } from './tax.entity';
import { TaxEngineService } from './tax-engine.service';

export interface TaxDashboardData {
  currentMonth: Partial<TaxPeriodSummary>;
  yearToDate: { totalVatPayable: number; totalWithholding: number; totalTemporaryTax: number; totalStampTax: number; totalRevenue: number; totalExpense: number; totalProfit: number };
  monthlyBreakdown: { month: number; vatPayable: number; withholding: number; revenue: number; profit: number }[];
  upcomingDeclarations: { type: string; label: string; dueDate: Date; daysLeft: number }[];
  effectiveTaxRate: number;
  taxBurdenRatio: number;
  yearEndProjection: { projectedRevenue: number; projectedProfit: number; projectedTax: number };
}

@Injectable()
export class TaxDashboardService {
  constructor(
    @InjectRepository(TaxPeriodSummary)
    private summaryRepo: Repository<TaxPeriodSummary>,
    private taxEngine: TaxEngineService,
  ) {}

  async getDashboard(companyId: string, year: number, month: number): Promise<TaxDashboardData> {
    const currentMonth = await this.summaryRepo.findOne({
      where: { companyId, year, month },
    });

    // YTD hesaplama
    const yearSummaries = await this.summaryRepo.find({
      where: { companyId, year },
    });

    const yearToDate = {
      totalVatPayable: yearSummaries.reduce((s, r) => s + Number(r.vatPayable), 0),
      totalWithholding: yearSummaries.reduce((s, r) => s + Number(r.withholdingTotal), 0),
      totalTemporaryTax: yearSummaries.reduce((s, r) => s + Number(r.temporaryTax), 0),
      totalStampTax: yearSummaries.reduce((s, r) => s + Number(r.stampTax), 0),
      totalRevenue: yearSummaries.reduce((s, r) => s + Number(r.revenueTotal), 0),
      totalExpense: yearSummaries.reduce((s, r) => s + Number(r.expenseTotal), 0),
      totalProfit: yearSummaries.reduce((s, r) => s + Number(r.profitTotal), 0),
    };

    const monthlyBreakdown = yearSummaries
      .map(r => ({
        month: r.month,
        vatPayable: Number(r.vatPayable),
        withholding: Number(r.withholdingTotal),
        revenue: Number(r.revenueTotal),
        profit: Number(r.profitTotal),
      }))
      .sort((a, b) => a.month - b.month);

    const upcomingDeclarations = this.taxEngine.getUpcomingDeclarations(year, month);

    const effectiveTaxRate = yearToDate.totalRevenue > 0
      ? ((yearToDate.totalVatPayable + yearToDate.totalWithholding + yearToDate.totalTemporaryTax) / yearToDate.totalRevenue) * 100
      : 0;

    const taxBurdenRatio = yearToDate.totalRevenue > 0
      ? ((yearToDate.totalVatPayable + yearToDate.totalWithholding) / yearToDate.totalRevenue) * 100
      : 0;

    const projectedRevenue = yearToDate.totalRevenue > 0
      ? (yearToDate.totalRevenue / month) * 12
      : 0;
    const projectedProfit = yearToDate.totalProfit > 0
      ? (yearToDate.totalProfit / month) * 12
      : 0;
    const projectedTax = projectedProfit * 0.25;

    return {
      currentMonth: currentMonth || {},
      yearToDate,
      monthlyBreakdown,
      upcomingDeclarations,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      taxBurdenRatio: Math.round(taxBurdenRatio * 100) / 100,
      yearEndProjection: {
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        projectedProfit: Math.round(projectedProfit * 100) / 100,
        projectedTax: Math.round(projectedTax * 100) / 100,
      },
    };
  }
}
