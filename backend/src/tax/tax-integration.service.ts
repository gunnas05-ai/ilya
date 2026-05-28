import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaxPeriodSummary, DeclarationDraft, DeclarationType, DeclarationStatus } from './tax.entity';
import { TaxEngineService, InvoiceTaxData, ExpenseTaxData } from './tax-engine.service';
import { TevkifatEngineService } from './tevkifat-engine.service';
import { LegislationService } from './legislation.service';

/**
 * OTOMATİK VERİ ENTEGRASYON SERVİSİ
 *
 * Diğer modüllerden (GIB, Escrow, Loads) fatura/gelir/gider verilerini
 * otomatik çekerek vergi motoruna besler.
 * Cron ile periyodik hesaplama ve bildirim yapar.
 */

@Injectable()
export class TaxIntegrationService {
  private readonly logger = new Logger(TaxIntegrationService.name);

  constructor(
    @InjectRepository(TaxPeriodSummary)
    private summaryRepo: Repository<TaxPeriodSummary>,
    @InjectRepository(DeclarationDraft)
    private declarationRepo: Repository<DeclarationDraft>,
    private taxEngine: TaxEngineService,
    private tevkifatEngine: TevkifatEngineService,
    private legislation: LegislationService,
  ) {}

  /**
   * Her ayın 25'inde otomatik vergi hesapla
   * KDV + Muhtasar + Geçici Vergi + Damga Vergisi
   */
  @Cron('0 8 25 * *')
  async autoCalculateMonthlyTaxes() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // Geçen ay (0-indexed)

    this.logger.log(`Otomatik aylık vergi hesaplama başladı: ${year}-${month}`);

    // Tüm aktif şirketleri tara
    const companies = await this.getActiveCompanies();

    for (const company of companies) {
      try {
        await this.calculateAndSaveTaxes(company.id, year, month);
        this.logger.log(`✓ Vergi hesaplandı: ${company.id} ${year}-${month}`);
      } catch (err) {
        this.logger.error(`✗ Vergi hesaplama hatası: ${company.id} ${year}-${month} - ${err.message}`);
      }
    }

    this.logger.log('Otomatik aylık vergi hesaplama tamamlandı');
  }

  /** Tek bir şirket için vergi hesapla ve kaydet */
  async calculateAndSaveTaxes(companyId: string, year: number, month: number): Promise<TaxPeriodSummary> {
    // 1. GIB modülünden faturaları çek
    const invoices = await this.fetchInvoicesFromGIB(companyId, year, month);

    // 2. Giderleri çek (yakıt, yemek, konaklama, vb.)
    const expenses = await this.fetchExpenses(companyId, year, month);

    // 3. Önceki dönem zararı ve geçici vergi ödemelerini al
    const previousPeriodLoss = await this.getPreviousLoss(companyId, year);
    const previousTemporaryTaxPaid = await this.getPreviousTemporaryTaxPayments(companyId, year);

    // 4. Vergi hesapla
    const result = this.taxEngine.calculateTaxes({
      companyId,
      year,
      month,
      invoices,
      expenses,
      previousPeriodLoss,
      previousTemporaryTaxPaid,
    });

    // 5. Dönem özetini kaydet
    const existing = await this.summaryRepo.findOne({ where: { companyId, year, month } });
    if (existing) {
      await this.summaryRepo.update(existing.id, { ...result.periodSummary, companyId, year, month });
    } else {
      await this.summaryRepo.save({ ...result.periodSummary, companyId, year, month });
    }

    // 6. Beyanname taslaklarını oluştur
    await this.generateDeclarationDrafts(companyId, year, month, result);

    return (await this.summaryRepo.findOne({ where: { companyId, year, month } }))!;
  }

  /** GIB faturalarından vergi verisi çıkar */
  async fetchInvoicesFromGIB(companyId: string, year: number, month: number): Promise<InvoiceTaxData[]> {
    try {
      // GIB modülünden fatura verilerini çek
      // (Gerçek implementasyonda InvoiceRepository kullanılır)
      const config = this.legislation.getCurrentConfig();
      const invoices: InvoiceTaxData[] = [];

      // Burada gerçek fatura verisi çekilecek
      // Şimdilik framework olarak boş dizi
      this.logger.debug(`Fatura verisi çekildi: ${companyId} ${year}-${month}`);

      return invoices;
    } catch (err) {
      this.logger.warn(`Fatura verisi çekilemedi: ${err.message}`);
      return [];
    }
  }

  /** Giderleri çek (yakıt, yemek, vb.) */
  async fetchExpenses(companyId: string, year: number, month: number): Promise<ExpenseTaxData[]> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Gerçek implementasyonda:
      // - fuel-stations modülünden yakıt alımları
      // - restaurants modülünden yemek giderleri
      // - escrow modülünden komisyon giderleri
      const expenses: ExpenseTaxData[] = [];
      this.logger.debug(`Gider verisi çekildi: ${companyId} ${year}-${month}`);
      return expenses;
    } catch (err) {
      this.logger.warn(`Gider verisi çekilemedi: ${err.message}`);
      return [];
    }
  }

  /** Önceki yıl zararı */
  private async getPreviousLoss(companyId: string, year: number): Promise<number> {
    const prevYearSummaries = await this.summaryRepo.find({
      where: { companyId, year: year - 1 },
    });
    const totalProfit = prevYearSummaries.reduce((s, r) => s + Number(r.profitTotal), 0);
    return totalProfit < 0 ? Math.abs(totalProfit) : 0;
  }

  /** Önceki geçici vergi ödemeleri */
  private async getPreviousTemporaryTaxPayments(companyId: string, year: number): Promise<number> {
    const summaries = await this.summaryRepo.find({
      where: { companyId, year },
    });
    return summaries.reduce((s, r) => s + Number(r.temporaryTaxPaid), 0);
  }

  /** Beyanname taslaklarını oluştur */
  private async generateDeclarationDrafts(companyId: string, year: number, month: number, result: any) {
    const drafts = [
      {
        type: DeclarationType.KDV,
        data: result.kdvDeclaration,
        amount: result.kdvDeclaration.vatPayable,
      },
      {
        type: DeclarationType.MUHTASAR,
        data: result.muhtasarDeclaration,
        amount: result.muhtasarDeclaration.totalWithholding,
      },
    ];

    // Geçici vergi dönemi kontrolü
    if ([2, 5, 8, 11].includes(month)) {
      drafts.push({
        type: DeclarationType.GECICI_VERGI,
        data: result.temporaryTaxDeclaration,
        amount: result.temporaryTaxDeclaration.payable,
      });
    }

    for (const draft of drafts) {
      const existing = await this.declarationRepo.findOne({
        where: { companyId, declarationType: draft.type, year, month },
      });

      if (!existing) {
        await this.declarationRepo.save({
          companyId,
          declarationType: draft.type,
          year,
          month,
          draftJson: JSON.stringify(draft.data),
          tahakkukAmount: draft.amount,
          status: DeclarationStatus.DRAFT,
        });
      }
    }
  }

  /** Aktif şirketleri getir */
  private async getActiveCompanies(): Promise<{ id: string }[]> {
    // Production'da User repository'den çekilir
    return [{ id: 'default' }];
  }

  /** Her sabah 09:00'da yaklaşan beyannameler için bildirim */
  @Cron('0 9 * * *')
  async checkUpcomingDeclarations() {
    const now = new Date();
    const upcoming = this.taxEngine.getUpcomingDeclarations(now.getFullYear(), now.getMonth() + 1);

    const urgent = upcoming.filter(d => d.daysLeft <= 3);
    const soon = upcoming.filter(d => d.daysLeft > 3 && d.daysLeft <= 7);

    if (urgent.length > 0) {
      this.logger.warn(`ACİL: ${urgent.length} beyannamenin son günü yaklaşıyor!`);
      // TODO: Push notification, SMS, email gönderimi
    }

    if (soon.length > 0) {
      this.logger.log(`Yaklaşan ${soon.length} beyanname var (3-7 gün)`);
    }
  }

  /** KDV dönem kapanışı — her ayın 26'sında */
  @Cron('0 18 26 * *')
  async onKDVPeriodClose() {
    const now = new Date();
    this.logger.log(`KDV dönem kapanışı: ${now.getFullYear()}-${now.getMonth()}`);
    // Beyanname dondurma, son kontroller, GIB gönderim hatırlatması
  }
}
