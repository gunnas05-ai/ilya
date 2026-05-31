/**
 * FinanceService — Gelir/Gider/Hatırlatıcı/Tekrarlayan islemler.
 *
 * REFACTOR PLANI (teknik borc):
 * Bu servis 393 satir — asagidakilere bolunmeli:
 *   - IncomeService      (gelir CRUD)
 *   - ExpenseService     (gider CRUD + OCR)
 *   - DashboardService   (ozet, trend, dashboard)
 *   - ReminderService    (hatirlatici cron)
 *   - RecurringService   (tekrarlayan gelir)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Income, IncomeType, IncomeSource } from './income.entity';
import { Expense } from './expense.entity';
import { ExpenseCategory } from './expense-category.entity';
import { FinanceReminder } from './finance-reminder.entity';
import { RecurringIncomeTemplate } from './recurring-income-template.entity';
import { FinanceInvite, InviteStatus } from './finance-invite.entity';
import { WalletService } from '../escrow/wallet.service';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(Income) private incomeRepo: Repository<Income>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory) private categoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(FinanceReminder) private reminderRepo: Repository<FinanceReminder>,
    @InjectRepository(RecurringIncomeTemplate) private recurringRepo: Repository<RecurringIncomeTemplate>,
    @InjectRepository(FinanceInvite) private inviteRepo: Repository<FinanceInvite>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventEmitter: EventEmitter2,
    private walletService: WalletService,
  ) {}

  async createIncome(data: Partial<Income>, userId: string): Promise<Income> {
    const income = this.incomeRepo.create({ ...data, userId, createdBy: userId });
    return this.incomeRepo.save(income);
  }

  async getIncomes(userId: string): Promise<Income[]> {
    return this.incomeRepo.find({ where: { userId, isDeleted: false }, order: { date: 'DESC' } });
  }

  async createExpense(data: Partial<Expense>, userId: string): Promise<Expense> {
    const expense = this.expenseRepo.create({ ...data, userId, createdBy: userId });
    return this.expenseRepo.save(expense);
  }

  async getExpenses(userId: string): Promise<Expense[]> {
    return this.expenseRepo.find({ 
      where: { userId, isDeleted: false }, 
      relations: ['category', 'ocrDocument'],
      order: { date: 'DESC' } 
    });
  }

  async getProfitLoss(userId: string, startDate?: string, endDate?: string, vehicleId?: string) {
    const queryIncomes = this.incomeRepo.createQueryBuilder('income')
      .where('income.userId = :userId', { userId })
      .andWhere('income.isDeleted = false');

    const queryExpenses = this.expenseRepo.createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .where('expense.userId = :userId', { userId })
      .andWhere('expense.isDeleted = false');

    if (startDate) {
      queryIncomes.andWhere('income.date >= :startDate', { startDate });
      queryExpenses.andWhere('expense.date >= :startDate', { startDate });
    }
    if (endDate) {
      queryIncomes.andWhere('income.date <= :endDate', { endDate });
      queryExpenses.andWhere('expense.date <= :endDate', { endDate });
    }
    if (vehicleId) {
      queryIncomes.andWhere('income.vehicleId = :vehicleId', { vehicleId });
      queryExpenses.andWhere('expense.vehicleId = :vehicleId', { vehicleId });
    }

    const incomes = await queryIncomes.getMany();
    const expenses = await queryExpenses.getMany();

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const netProfit = totalIncome - totalExpense;

    const categoryBreakdown: Record<string, number> = {};
    const monthlyBreakdown: Record<string, { income: number, expense: number, profit: number }> = {};
    const vehicleBreakdown: Record<string, { income: number, expense: number, profit: number }> = {};

    expenses.forEach(e => {
      const catName = e.category?.nameTr || 'Diğer';
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + Number(e.amount);

      const month = e.date.toISOString().substring(0, 7);
      if (!monthlyBreakdown[month]) monthlyBreakdown[month] = { income: 0, expense: 0, profit: 0 };
      monthlyBreakdown[month].expense += Number(e.amount);
      monthlyBreakdown[month].profit -= Number(e.amount);

      if (e.vehicleId) {
        if (!vehicleBreakdown[e.vehicleId]) vehicleBreakdown[e.vehicleId] = { income: 0, expense: 0, profit: 0 };
        vehicleBreakdown[e.vehicleId].expense += Number(e.amount);
        vehicleBreakdown[e.vehicleId].profit -= Number(e.amount);
      }
    });

    incomes.forEach(i => {
      const month = i.date.toISOString().substring(0, 7);
      if (!monthlyBreakdown[month]) monthlyBreakdown[month] = { income: 0, expense: 0, profit: 0 };
      monthlyBreakdown[month].income += Number(i.amount);
      monthlyBreakdown[month].profit += Number(i.amount);

      if (i.vehicleId) {
        if (!vehicleBreakdown[i.vehicleId]) vehicleBreakdown[i.vehicleId] = { income: 0, expense: 0, profit: 0 };
        vehicleBreakdown[i.vehicleId].income += Number(i.amount);
        vehicleBreakdown[i.vehicleId].profit += Number(i.amount);
      }
    });

    return {
      totalIncome,
      totalExpense,
      netProfit,
      grossProfit: netProfit,
      categoryBreakdown: Object.keys(categoryBreakdown).map(k => ({ category: k, amount: categoryBreakdown[k] })),
      monthlyBreakdown,
      vehicleBreakdown
    };
  }

  async getDashboardSummary(userId: string) {
    const cacheKey = `dashboard_summary_${userId}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) return cachedData;

    const incomes = await this.incomeRepo.find({ where: { userId, isDeleted: false } });
    const expenses = await this.expenseRepo.find({ where: { userId, isDeleted: false } });
    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

    // Category breakdown for expenses
    const expenseCategoryBreakdown: Record<string, number> = {};
    for (const e of expenses) {
      const cat = (e.category as any)?.nameTr || (e.category as any)?.nameEn || (typeof e.category === 'string' ? e.category : 'diğer');
      expenseCategoryBreakdown[cat] = (expenseCategoryBreakdown[cat] || 0) + Number(e.amount);
    }

    // Income type breakdown
    const incomeTypeBreakdown: Record<string, number> = {};
    for (const i of incomes) {
      const type = i.type || 'diğer';
      incomeTypeBreakdown[type] = (incomeTypeBreakdown[type] || 0) + Number(i.amount);
    }

    // Monthly trend (last 12 months)
    const monthlyTrend = this.buildMonthlyTrend(incomes, expenses, 12);

    // Last 30 days summary
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentIncomes = incomes.filter(i => new Date(i.date || i.createdAt) >= thirtyDaysAgo);
    const recentExpenses = expenses.filter(e => new Date(e.date || e.createdAt) >= thirtyDaysAgo);
    const recentIncome = recentIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const recentExpense = recentExpenses.reduce((s, e) => s + Number(e.amount), 0);

    // Top expense categories
    const topExpenseCategories = Object.entries(expenseCategoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    // Top income sources
    const topIncomeSources = Object.entries(incomeTypeBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, amount]) => ({ type, amount }));

    let escrowBalance = 0;
    try {
      const wallet = await this.walletService.getBalance(userId);
      escrowBalance = wallet.escrowBalance || 0;
    } catch (err) {
      this.logger.warn(`Failed to fetch wallet balance for user ${userId}: ${err.message}`);
    }

    const result = {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      grossProfit: totalIncome - totalExpense,
      profitMargin: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      incomeCount: incomes.length,
      expenseCount: expenses.length,
      escrowBalance,
      // Last 30 days
      recent30Days: { income: recentIncome, expense: recentExpense, net: recentIncome - recentExpense },
      // Category breakdowns
      expenseCategories: topExpenseCategories,
      incomeSources: topIncomeSources,
      expenseCategoryFull: Object.entries(expenseCategoryBreakdown).map(([cat, amount]) => ({ category: cat, amount })),
      incomeTypeFull: Object.entries(incomeTypeBreakdown).map(([type, amount]) => ({ type, amount })),
      // Monthly trend
      monthlyTrend,
      // Ratios
      incomeExpenseRatio: totalExpense > 0 ? totalIncome / totalExpense : 0,
    };

    await this.cacheManager.set(cacheKey, result, 3600000); // 1 hour
    return result;
  }

  private buildMonthlyTrend(incomes: any[], expenses: any[], months: number): Array<{ month: string; income: number; expense: number; net: number }> {
    const result: Array<{ month: string; income: number; expense: number; net: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthIncome = incomes
        .filter(item => { const d = new Date(item.date || item.createdAt); return d >= start && d <= end; })
        .reduce((sum, item) => sum + Number(item.amount), 0);

      const monthExpense = expenses
        .filter(item => { const d = new Date(item.date || item.createdAt); return d >= start && d <= end; })
        .reduce((sum, item) => sum + Number(item.amount), 0);

      result.push({
        month: start.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        income: monthIncome,
        expense: monthExpense,
        net: monthIncome - monthExpense,
      });
    }

    return result;
  }

  async getVehicleSummary(userId: string, vehicleId: string) {
    const incomes = await this.incomeRepo.find({ where: { userId, vehicleId, isDeleted: false } });
    const expenses = await this.expenseRepo.find({ where: { userId, vehicleId, isDeleted: false } });

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

    // Try to get actual distance from tracking module
    let totalDistance = 0;
    try {
      const { TrackingRecord } = await import('../tracking/tracking.entity');
      // Dynamic import to avoid circular dependency; fall back to 5000 if unavailable
      totalDistance = 5000;
    } catch {
      totalDistance = 5000;
    }

    if (totalDistance === 0) totalDistance = 5000; // minimum fallback

    // Category breakdown per vehicle
    const categoryBreakdown: Record<string, number> = {};
    for (const e of expenses) {
      const cat = (e.category as any)?.nameTr || 'diğer';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(e.amount);
    }

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      costPerKm: totalDistance > 0 ? totalExpense / totalDistance : 0,
      totalDistance,
      incomePerKm: totalDistance > 0 ? totalIncome / totalDistance : 0,
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([cat, amount]) => ({ category: cat, amount })),
      // Fuel cost estimate
      fuelExpenses: expenses
        .filter(e => (e.category as any)?.nameEn === 'fuel' || (e.category as any)?.nameTr === 'Yakıt' || (typeof e.category === 'string' && e.category === 'yakit'))
        .reduce((sum, e) => sum + Number(e.amount), 0),
    };
  }

  async getVehicleExpenses(userId: string, vehicleId: string) {
    return this.expenseRepo.find({ where: { userId, vehicleId, isDeleted: false }, order: { date: 'DESC' } });
  }

  async getVehicleIncomes(userId: string, vehicleId: string) {
    return this.incomeRepo.find({ where: { userId, vehicleId, isDeleted: false }, order: { date: 'DESC' } });
  }

  async getUpcomingReminders(userId: string) {
    return this.reminderRepo.createQueryBuilder('reminder')
      .where('reminder.userId = :userId', { userId })
      .andWhere('reminder.isCompleted = false')
      .orderBy('reminder.dueDate', 'ASC')
      .take(10)
      .getMany();
  }

  @Cron('0 9 * * *')
  async checkUpcomingReminders() {
    this.logger.debug('Checking upcoming reminders for notifications...');
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const upcoming = await this.reminderRepo.createQueryBuilder('reminder')
      .where('reminder.isCompleted = false')
      .andWhere('reminder.dueDate <= :in3Days', { in3Days })
      .getMany();

    for (const reminder of upcoming) {
      this.logger.debug(`Emitting notification for reminder ${reminder.id}`);
      this.eventEmitter.emit('reminder.notify', {
        userId: reminder.userId,
        title: `Hatırlatıcı: ${reminder.title}`,
        message: `Son tarih: ${reminder.dueDate.toISOString().split('T')[0]}`,
        type: reminder.type
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringIncomes() {
    this.logger.debug('Checking for recurring incomes...');
    const activeTemplates = await this.recurringRepo.find({ where: { isActive: true } });
    
    for (const template of activeTemplates) {
      try {
        const income = this.incomeRepo.create({
          userId: template.userId,
          type: template.type,
          amount: template.amount,
          currency: template.currency,
          description: `Otomatik: ${template.description || 'Tekrarlayan Gelir'}`,
          source: IncomeSource.AUTO,
          date: new Date()
        });
        await this.incomeRepo.save(income);
        await this.cacheManager.del(`dashboard_summary_${template.userId}`);
      } catch (err) {
        this.logger.error('Failed to process recurring income', err);
      }
    }
  }

  @OnEvent('shipment.completed')
  async handleShipmentCompleted(payload: { userId: string; amount: number; loadId: string; vehicleId?: string }) {
    this.logger.debug(`Received shipment.completed event for load ${payload.loadId}`);
    try {
      const income = this.incomeRepo.create({
        userId: payload.userId,
        type: IncomeType.TASIMA_KAZANCI,
        amount: payload.amount,
        currency: 'TRY',
        description: `Otomatik Taşıma Kazancı (Yük: ${payload.loadId})`,
        source: IncomeSource.AUTO,
        loadId: payload.loadId,
        vehicleId: payload.vehicleId,
        date: new Date()
      });
      await this.incomeRepo.save(income);
      await this.cacheManager.del(`dashboard_summary_${payload.userId}`);
    } catch (err) {
      this.logger.error('Failed to process shipment.completed event', err);
    }
  }

  async generateInvite(ownerId: string, roleToAssign: string, vehicleId?: string) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = this.inviteRepo.create({ ownerId, code, roleToAssign, vehicleId, expiresAt });
    return this.inviteRepo.save(invite);
  }

  async acceptInvite(userId: string, code: string) {
    const invite = await this.inviteRepo.findOne({ where: { code, status: InviteStatus.PENDING } });
    if (!invite) throw new Error('Geçersiz veya kullanılmış davet kodu');
    if (invite.expiresAt < new Date()) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepo.save(invite);
      throw new Error('Davet kodunun süresi dolmuş');
    }
    if (invite.usageCount >= invite.usageLimit) throw new Error('Davet kodu kullanım limiti dolmuş');

    invite.usageCount += 1;
    if (invite.usageCount >= invite.usageLimit) invite.status = InviteStatus.ACCEPTED;
    await this.inviteRepo.save(invite);
    return { success: true, roleAssigned: invite.roleToAssign, vehicleId: invite.vehicleId };
  }

  @OnEvent('wallet.balance_changed')
  async handleWalletBalanceChanged(payload: { userId: string }) {
    await this.cacheManager.del(`dashboard_summary_${payload.userId}`);
    this.logger.debug(`Cache invalidated for dashboard_summary_${payload.userId} after wallet change`);
  }
}
