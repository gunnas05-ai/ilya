import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaxEngineService, TaxCalculationInput } from './tax-engine.service';
import { AccountingService } from './accounting.service';
import { TaxDashboardService } from './tax-dashboard.service';
import { TevkifatEngineService, TevkifatCheckInput } from './tevkifat-engine.service';
import { EDefterExportService } from './edefter-export.service';
import { LegislationService } from './legislation.service';
import { TaxIntegrationService } from './tax-integration.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxPeriodSummary, DeclarationDraft, DeclarationStatus } from './tax.entity';

@Controller({ path: 'tax', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class TaxController {
  constructor(
    private taxEngine: TaxEngineService,
    private accountingService: AccountingService,
    private dashboardService: TaxDashboardService,
    private tevkifatEngine: TevkifatEngineService,
    private edefterExport: EDefterExportService,
    private legislation: LegislationService,
    private taxIntegration: TaxIntegrationService,
    @InjectRepository(TaxPeriodSummary) private summaryRepo: Repository<TaxPeriodSummary>,
    @InjectRepository(DeclarationDraft) private declarationRepo: Repository<DeclarationDraft>,
  ) {}

  // ═══ DASHBOARD ═══
  @Get('dashboard')
  async getDashboard(@Req() req: any, @Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    return this.dashboardService.getDashboard(req.user.id, year ? parseInt(year) : now.getFullYear(), month ? parseInt(month) : now.getMonth() + 1);
  }

  // ═══ HESAPLAMA ═══
  @Post('calculate')
  async calculateTaxes(@Req() req: any, @Body() input: TaxCalculationInput) {
    input.companyId = req.user.id;
    const result = this.taxEngine.calculateTaxes(input);
    const existing = await this.summaryRepo.findOne({ where: { companyId: input.companyId, year: input.year, month: input.month } });
    if (existing) await this.summaryRepo.update(existing.id, result.periodSummary);
    else await this.summaryRepo.save(result.periodSummary);
    return { success: true, data: result };
  }

  @Get('periods')
  async getPeriods(@Req() req: any, @Query('year') year?: string) {
    return this.summaryRepo.find({ where: { companyId: req.user.id, year: year ? parseInt(year) : new Date().getFullYear() }, order: { month: 'ASC' } });
  }

  // ═══ BEYANNAME ═══
  @Get('declarations')
  async getDeclarations(@Req() req: any, @Query('year') year?: string) {
    return this.declarationRepo.find({ where: { companyId: req.user.id, year: year ? parseInt(year) : new Date().getFullYear() }, order: { month: 'DESC' } });
  }

  @Post('declarations')
  async saveDeclaration(@Req() req: any, @Body() body: { declarationType: string; year: number; month: number; draftJson: any; tahakkukAmount?: number }) {
    const draft = this.declarationRepo.create({ companyId: req.user.id, declarationType: body.declarationType, year: body.year, month: body.month, draftJson: JSON.stringify(body.draftJson), tahakkukAmount: body.tahakkukAmount || 0, status: DeclarationStatus.DRAFT });
    await this.declarationRepo.save(draft);
    return { success: true, data: draft };
  }

  @Get('upcoming')
  async getUpcoming(@Req() req: any) {
    const now = new Date();
    return { declarations: this.taxEngine.getUpcomingDeclarations(now.getFullYear(), now.getMonth() + 1) };
  }

  // ═══ TEVKİFAT KONTROL MOTORU ═══
  @Post('tevkifat/check')
  async checkTevkifat(@Body() input: TevkifatCheckInput) {
    return this.tevkifatEngine.determineWithholding(input);
  }

  @Post('tevkifat/calculate-invoice')
  async calculateInvoiceWithholding(@Body() invoice: any) {
    return this.tevkifatEngine.calculateWithholdingFromInvoice(invoice);
  }

  @Post('tevkifat/gross-to-net')
  async grossToNet(@Body() body: { grossAmount: number; serviceType: string; buyerType: string }) {
    return this.tevkifatEngine.calculateGrossToNet(body.grossAmount, body.serviceType, body.buyerType);
  }

  @Post('tevkifat/net-to-gross')
  async netToGross(@Body() body: { netAmount: number; serviceType: string; buyerType: string }) {
    return this.tevkifatEngine.calculateNetToGross(body.netAmount, body.serviceType, body.buyerType);
  }

  @Post('tevkifat/muhtasar-summary')
  async muhtasarSummary(@Body() body: { entries: { type: string; base: number; rate: number; amount: number }[] }) {
    return this.tevkifatEngine.generateMuhtasarSummary(body.entries);
  }

  // ═══ E-DEFTER / XML ═══
  @Post('edefter/journal-xml')
  async generateJournalXML(@Body() body: { metadata: any; journals: any[] }) {
    return { xml: this.edefterExport.generateJournalXML(body.metadata, body.journals) };
  }

  @Post('edefter/ledger-xml')
  async generateLedgerXML(@Body() body: { metadata: any; ledgers: any[] }) {
    return { xml: this.edefterExport.generateLedgerXML(body.metadata, body.ledgers) };
  }

  @Post('edefter/trial-balance-xml')
  async generateTrialBalanceXML(@Body() body: { metadata: any; ledgers: any[] }) {
    return { xml: this.edefterExport.generateTrialBalanceXML(body.metadata, body.ledgers) };
  }

  @Post('edefter/berat')
  async generateBerat(@Body() body: { metadata: any; xmlContent: string }) {
    return { berat: this.edefterExport.generateBerat(body.metadata, body.xmlContent) };
  }

  // ═══ YIL SONU VE ALACAKLAR ═══
  @Post('year-end-summary')
  async yearEndSummary(@Body() body: { summaries: any[] }) {
    return this.edefterExport.generateYearEndSummary(body.summaries);
  }

  @Post('government-receivables')
  async governmentReceivables(@Body() body: { periods: any[] }) {
    return this.edefterExport.generateGovernmentReceivablesSummary(body.periods);
  }

  // ═══ MEVZUAT ═══
  @Get('legislation/config')
  async getLegislationConfig() {
    return this.legislation.getCurrentConfig();
  }

  @Post('legislation/config')
  async updateLegislationConfig(@Req() req: any, @Body() updates: any) {
    return this.legislation.updateConfig(updates, req.user.id);
  }

  @Get('legislation/upcoming-changes')
  async getUpcomingChanges() {
    return { changes: this.legislation.getUpcomingChanges() };
  }

  @Get('legislation/change-history')
  async getChangeHistory() {
    return { history: this.legislation.getChangeHistory() };
  }

  @Get('legislation/calendar/:year')
  async getAnnualCalendar(@Param('year') year: string) {
    return { calendar: this.legislation.generateAnnualDeclarationCalendar(parseInt(year)) };
  }

  // ═══ OTOMATİK ENTEGRASYON ═══
  @Post('integration/calculate-now')
  async calculateNow(@Req() req: any, @Body() body: { year?: number; month?: number }) {
    const now = new Date();
    const result = await this.taxIntegration.calculateAndSaveTaxes(req.user.id, body.year || now.getFullYear(), body.month || now.getMonth());
    return { success: true, data: result };
  }

  // ═══ SGK ═══
  @Post('sgk/calculate')
  async calculateSGK(@Body() body: { grossSalary: number; employeeCount?: number }) {
    return this.taxEngine.calculateSGK(body.grossSalary, body.employeeCount || 1);
  }

  // ═══ İHRACAT KDV ═══
  @Post('export-kdv/calculate')
  async calculateExportKDV(@Body() body: { exportInvoices: any[] }) {
    return this.taxEngine.calculateExportKDV(body.exportInvoices);
  }

  // ═══ ANOMALİ TESPİTİ ═══
  @Post('anomalies/detect')
  async detectAnomalies(@Body() body: { periods: any[] }) {
    return this.taxEngine.detectTaxAnomalies(body.periods);
  }

  // ═══ HIZLI HESAPLAMA ═══
  @Post('quick/vat')
  async quickVat(@Body() body: { revenue: number; vatRate: number; deductibleVat?: number }) {
    return this.taxEngine.quickVatCalculation(body.revenue, body.vatRate, body.deductibleVat || 0);
  }

  @Post('quick/profit-after-tax')
  async quickProfitAfterTax(@Body() body: { revenue: number; expenses: number; taxRate?: number }) {
    return this.taxEngine.quickProfitAfterTax(body.revenue, body.expenses, body.taxRate || 0.25);
  }

  @Post('quick/withholding')
  async quickWithholding(@Body() body: { amount: number; serviceType: string; isPublicSector: boolean }) {
    return this.taxEngine.quickWithholdingCheck(body.amount, body.serviceType, body.isPublicSector);
  }

  @Post('quick/cash-outflow')
  async estimateCashOutflow(@Body() body: { periods: any[] }) {
    return this.taxEngine.estimateCashOutflow(body.periods);
  }

  // ═══ DIŞA AKTARIM (EXCEL/CSV) ═══
  @Post('export/csv')
  async exportCSV(@Req() req: any, @Body() body: { year?: number; type?: string }) {
    const year = body.year || new Date().getFullYear();
    const periods = await this.summaryRepo.find({ where: { companyId: req.user.id, year }, order: { month: 'ASC' } });

    const headers = 'Ay,Yil,Ciro,Toplam Gider,Kar,Odenecek KDV,Stopaj,Gecici Vergi,Damga Vergisi,Net Vergi Yuku,Devlet Alacagi';
    const rows = periods.map(p => [
      p.month, p.year,
      Number(p.revenueTotal).toFixed(2),
      Number(p.expenseTotal).toFixed(2),
      Number(p.profitTotal).toFixed(2),
      Number(p.vatPayable).toFixed(2),
      Number(p.withholdingTotal).toFixed(2),
      Number(p.temporaryTax).toFixed(2),
      Number(p.stampTax).toFixed(2),
      Number(p.netTaxLiability).toFixed(2),
      Number(p.governmentReceivable).toFixed(2),
    ].join(','));
    const csv = [headers, ...rows].join('\n');
    return { csv, filename: `vergi_donem_ozeti_${year}.csv`, rowCount: periods.length };
  }

  @Post('export/excel-json')
  async exportExcelJson(@Req() req: any, @Body() body: { year?: number }) {
    const year = body.year || new Date().getFullYear();
    const periods = await this.summaryRepo.find({ where: { companyId: req.user.id, year }, order: { month: 'ASC' } });
    const decls = await this.declarationRepo.find({ where: { companyId: req.user.id, year } });

    const dashboard = await this.dashboardService.getDashboard(req.user.id, year, new Date().getMonth() + 1);
    return {
      exportDate: new Date().toISOString(),
      year,
      periods: periods.map(p => ({
        month: p.month, revenue: Number(p.revenueTotal), expense: Number(p.expenseTotal),
        profit: Number(p.profitTotal), vatPayable: Number(p.vatPayable),
        withholding: Number(p.withholdingTotal), temporaryTax: Number(p.temporaryTax),
        stampTax: Number(p.stampTax), netTaxLiability: Number(p.netTaxLiability),
        governmentReceivable: Number(p.governmentReceivable),
      })),
      declarations: decls.map(d => ({
        type: d.declarationType, month: d.month, status: d.status, tahakkuk: Number(d.tahakkukAmount),
      })),
      yearEndSummary: {
        totalRevenue: dashboard.yearToDate.totalRevenue,
        totalExpense: dashboard.yearToDate.totalExpense,
        totalProfit: dashboard.yearToDate.totalProfit,
        totalVatPayable: dashboard.yearToDate.totalVatPayable,
        totalTaxLiability: dashboard.yearToDate.totalVatPayable + dashboard.yearToDate.totalWithholding + dashboard.yearToDate.totalTemporaryTax + dashboard.yearToDate.totalStampTax,
        effectiveTaxRate: dashboard.effectiveTaxRate,
        yearEndProjection: dashboard.yearEndProjection,
      },
    };
  }

  // ═══ MUHASEBE ═══
  @Get('chart-of-accounts')
  async getChartOfAccounts() { return { accounts: this.accountingService.getChartOfAccounts() }; }

  @Post('journal/sales-invoice')
  async generateSalesJournal(@Body() body: any) {
    const journals = this.accountingService.generateSalesInvoiceJournal(body);
    return { journals, balance: this.accountingService.verifyTrialBalance(journals) };
  }

  @Post('journal/purchase-invoice')
  async generatePurchaseJournal(@Body() body: any) {
    const journals = this.accountingService.generatePurchaseInvoiceJournal(body);
    return { journals, balance: this.accountingService.verifyTrialBalance(journals) };
  }

  @Post('journal/fuel-expense')
  async generateFuelJournal(@Body() body: any) {
    const journals = this.accountingService.generateFuelExpenseJournal(body);
    return { journals, balance: this.accountingService.verifyTrialBalance(journals) };
  }

  @Post('ledger/summary')
  async getLedgerSummary(@Body() body: { journals: any[] }) { return { ledger: this.accountingService.generateLedgerSummary(body.journals) }; }

  @Post('number-to-text')
  async numberToText(@Body() body: { amount: number }) { return { text: this.accountingService.numberToTurkishLira(body.amount) }; }

  @Post('ba-bs/generate')
  async generateBABs(@Req() req: any, @Body() input: TaxCalculationInput) {
    input.companyId = req.user.id;
    const result = this.taxEngine.calculateTaxes(input);
    return { baForm: result.baForm, bsForm: result.bsForm };
  }
}
