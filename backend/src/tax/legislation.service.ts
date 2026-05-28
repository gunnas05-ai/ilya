import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxDefinition } from './tax.entity';

/**
 * MEVZUAT GÜNCELLEME MOTORU (Section K)
 *
 * Dinamik vergi oranı güncellemeleri, beyanname tarihleri,
 * tevkifat kuralları, admin panel entegrasyonu.
 */

export interface TaxRateConfig {
  vatRates: { code: string; rate: number; label: string; active: boolean }[];
  withholdingRates: { code: string; rate: number; type: string; label: string }[];
  stampTaxRate: number;
  corporateTaxRate: number;
  temporaryTaxRate: number;
  baBsThreshold: number;
  declarationDates: { type: string; dayOfMonth: number; months: number[] }[];
  effectiveDate: string;
  updatedBy: string;
}

@Injectable()
export class LegislationService {
  private readonly logger = new Logger(LegislationService.name);

  /** Varsayılan 2026 vergi oranları */
  private currentConfig: TaxRateConfig = {
    vatRates: [
      { code: 'KDV_1', rate: 1, label: '%1 (Temel Gıda, Tarım)', active: true },
      { code: 'KDV_10', rate: 10, label: '%10 (Genel Hizmet)', active: true },
      { code: 'KDV_20', rate: 20, label: '%20 (Standart)', active: true },
    ],
    withholdingRates: [
      { code: 'TVK_621', rate: 20, type: 'logistics', label: 'Lojistik/Taşımacılık %20 (2/10)', },
      { code: 'TVK_625', rate: 50, type: 'freight_public', label: 'Taşımacılık Kamu %50 (5/10)' },
      { code: 'TVK_601', rate: 20, type: 'consulting', label: 'Serbest Meslek %20' },
      { code: 'TVK_641', rate: 20, type: 'rent', label: 'Kira Stopajı %20' },
      { code: 'TVK_627', rate: 50, type: 'service_public', label: 'Hizmet Kamu %50 (5/10)' },
    ],
    stampTaxRate: 0.00948,
    corporateTaxRate: 0.25,
    temporaryTaxRate: 0.25,
    baBsThreshold: 5000,
    declarationDates: [
      { type: 'kdv', dayOfMonth: 26, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      { type: 'muhtasar', dayOfMonth: 26, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      { type: 'gecici_vergi', dayOfMonth: 14, months: [2, 5, 8, 11] },
      { type: 'damga', dayOfMonth: 26, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      { type: 'ba', dayOfMonth: 31, months: [1] },
      { type: 'bs', dayOfMonth: 31, months: [1] },
      { type: 'kurumlar', dayOfMonth: 25, months: [4] },
    ],
    effectiveDate: new Date().toISOString().slice(0, 10),
    updatedBy: 'system',
  };

  /** Mevcut vergi yapılandırmasını getir */
  getCurrentConfig(): TaxRateConfig {
    // Production'da veritabanından okunur
    return { ...this.currentConfig };
  }

  /** Admin panelden vergi oranı güncelleme */
  updateConfig(updates: Partial<TaxRateConfig>, adminUser: string): TaxRateConfig {
    this.logger.log(`Mevzuat güncellemesi: ${adminUser} tarafından`);

    if (updates.vatRates) this.currentConfig.vatRates = updates.vatRates;
    if (updates.withholdingRates) this.currentConfig.withholdingRates = updates.withholdingRates;
    if (updates.stampTaxRate !== undefined) this.currentConfig.stampTaxRate = updates.stampTaxRate;
    if (updates.corporateTaxRate !== undefined) this.currentConfig.corporateTaxRate = updates.corporateTaxRate;
    if (updates.temporaryTaxRate !== undefined) this.currentConfig.temporaryTaxRate = updates.temporaryTaxRate;
    if (updates.baBsThreshold !== undefined) this.currentConfig.baBsThreshold = updates.baBsThreshold;
    if (updates.declarationDates) this.currentConfig.declarationDates = updates.declarationDates;

    this.currentConfig.effectiveDate = new Date().toISOString().slice(0, 10);
    this.currentConfig.updatedBy = adminUser;

    this.logger.log(`Mevzuat güncellendi — geçerlilik: ${this.currentConfig.effectiveDate}`);
    return this.getCurrentConfig();
  }

  /** Belirli bir tarih için geçerli vergi oranlarını getir (ileriye dönük) */
  getConfigForDate(date: Date): TaxRateConfig {
    // Şimdilik güncel konfigürasyonu döndürür
    // Production'da effectiveDate ile tarih karşılaştırması yapılır
    return this.getCurrentConfig();
  }

  /** Gelecek mevzuat değişikliklerini listele (planlanmış) */
  getUpcomingChanges(): { date: string; description: string; impact: string }[] {
    // Örnek: Gelecekteki planlı değişiklikler
    return [
      { date: '2026-07-01', description: 'KDV oran güncellemesi planlanıyor', impact: 'Genel KDV oranı %20 → %22' },
      { date: '2027-01-01', description: 'BA/BS bildirim sınırı güncellemesi', impact: 'Sınır 5.000 TL → 8.000 TL' },
    ];
  }

  /** Vergi oranı değişiklik logu */
  getChangeHistory(): { date: string; field: string; oldValue: string; newValue: string; updatedBy: string }[] {
    return [
      { date: '2026-01-01', field: 'corporateTaxRate', oldValue: '0.25', newValue: '0.25', updatedBy: 'system' },
      { date: '2026-01-01', field: 'baBsThreshold', oldValue: '3000', newValue: '5000', updatedBy: 'system' },
    ];
  }

  /** Gelecek 12 aylık beyanname takvimi oluştur */
  generateAnnualDeclarationCalendar(year: number): { month: number; declarations: { type: string; label: string; dueDay: number }[] }[] {
    const calendar: { month: number; declarations: { type: string; label: string; dueDay: number }[] }[] = [];

    for (let month = 1; month <= 12; month++) {
      const declarations: { type: string; label: string; dueDay: number }[] = [];
      for (const dd of this.currentConfig.declarationDates) {
        if (dd.months.includes(month)) {
          declarations.push({ type: dd.type, label: this.getDeclarationLabel(dd.type), dueDay: dd.dayOfMonth });
        }
      }
      calendar.push({ month, declarations });
    }

    return calendar;
  }

  private getDeclarationLabel(type: string): string {
    const map: Record<string, string> = {
      kdv: 'KDV Beyannamesi',
      muhtasar: 'Muhtasar Beyanname',
      gecici_vergi: 'Geçici Vergi',
      damga: 'Damga Vergisi',
      ba: 'BA Formu',
      bs: 'BS Formu',
      kurumlar: 'Kurumlar Vergisi',
    };
    return map[type] || type;
  }
}
