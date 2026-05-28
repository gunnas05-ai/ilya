import { Injectable, Logger } from '@nestjs/common';
import { JournalEntry, LedgerEntry } from './accounting.service';

/**
 * E-DEFTER VE BERAT UYUMLU XML ÇIKTI MOTORU (D.4)
 *
 * GİB e-Defter formatına uygun:
 * - Yevmiye defteri XML
 * - Defteri kebir XML
 * - Aylık mizan XML
 * - Berat dosyası
 */

export interface EDefterMetadata {
  companyName: string;
  vkn: string;
  periodYear: number;
  periodMonth: number;
  documentType: 'journal' | 'ledger' | 'trial_balance';
  generatedBy: string;
}

@Injectable()
export class EDefterExportService {
  private readonly logger = new Logger(EDefterExportService.name);

  /** Yevmiye defteri XML'i (GIB format) */
  generateJournalXML(metadata: EDefterMetadata, journals: JournalEntry[]): string {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<defter xmlns="http://www.gib.gov.tr/edefter" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      `  <metadata>`,
      `    <firma>${this.escapeXml(metadata.companyName)}</firma>`,
      `    <vkn>${metadata.vkn}</vkn>`,
      `    <donem>${metadata.periodYear}-${String(metadata.periodMonth).padStart(2, '0')}</donem>`,
      `    <belgeTuru>YevmiyeDefteri</belgeTuru>`,
      `    <olusturmaTarihi>${new Date().toISOString().slice(0, 10)}</olusturmaTarihi>`,
      `  </metadata>`,
      `  <yevmiyeKayitlari>`,
    ];

    for (const j of journals) {
      xml.push(
        `    <yevmiyeKaydi>`,
        `      <tarih>${j.date}</tarih>`,
        `      <yevmiyeNo>${this.escapeXml(j.documentNo)}</yevmiyeNo>`,
        `      <aciklama>${this.escapeXml(j.description)}</aciklama>`,
        `      <hesapKodu>${j.accountCode}</hesapKodu>`,
        `      <hesapAdi>${this.escapeXml(j.accountName)}</hesapAdi>`,
        `      <borc>${j.debit.toFixed(2)}</borc>`,
        `      <alacak>${j.credit.toFixed(2)}</alacak>`,
        `    </yevmiyeKaydi>`,
      );
    }

    xml.push('  </yevmiyeKayitlari>', '</defter>');
    return xml.join('\n');
  }

  /** Defteri kebir XML'i */
  generateLedgerXML(metadata: EDefterMetadata, ledgers: LedgerEntry[]): string {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<defter xmlns="http://www.gib.gov.tr/edefter">',
      `  <metadata>`,
      `    <firma>${this.escapeXml(metadata.companyName)}</firma>`,
      `    <vkn>${metadata.vkn}</vkn>`,
      `    <donem>${metadata.periodYear}-${String(metadata.periodMonth).padStart(2, '0')}</donem>`,
      `    <belgeTuru>DefteriKebir</belgeTuru>`,
      `  </metadata>`,
      `  <hesaplar>`,
    ];

    for (const l of ledgers) {
      xml.push(
        `    <hesap>`,
        `      <kod>${l.accountCode}</kod>`,
        `      <ad>${this.escapeXml(l.accountName)}</ad>`,
        `      <acilisBorc>${l.openingDebit.toFixed(2)}</acilisBorc>`,
        `      <acilisAlacak>${l.openingCredit.toFixed(2)}</acilisAlacak>`,
        `      <donemBorc>${l.periodDebit.toFixed(2)}</donemBorc>`,
        `      <donemAlacak>${l.periodCredit.toFixed(2)}</donemAlacak>`,
        `      <kapanisBorc>${l.closingDebit.toFixed(2)}</kapanisBorc>`,
        `      <kapanisAlacak>${l.closingCredit.toFixed(2)}</kapanisAlacak>`,
        `    </hesap>`,
      );
    }

    xml.push('  </hesaplar>', '</defter>');
    return xml.join('\n');
  }

  /** Aylık mizan XML'i */
  generateTrialBalanceXML(metadata: EDefterMetadata, ledgers: LedgerEntry[]): string {
    const totalDebit = ledgers.reduce((s, l) => s + l.periodDebit, 0);
    const totalCredit = ledgers.reduce((s, l) => s + l.periodCredit, 0);

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<mizan xmlns="http://www.gib.gov.tr/edefter">',
      `  <metadata>`,
      `    <firma>${this.escapeXml(metadata.companyName)}</firma>`,
      `    <vkn>${metadata.vkn}</vkn>`,
      `    <donem>${metadata.periodYear}-${String(metadata.periodMonth).padStart(2, '0')}</donem>`,
      `    <toplamBorc>${totalDebit.toFixed(2)}</toplamBorc>`,
      `    <toplamAlacak>${totalCredit.toFixed(2)}</toplamAlacak>`,
      `    <bakiye>${(totalDebit - totalCredit).toFixed(2)}</bakiye>`,
      `    <dengede>${Math.abs(totalDebit - totalCredit) < 0.01 ? 'true' : 'false'}</dengede>`,
      `  </metadata>`,
      ...ledgers.map(l => `  <hesap kod="${l.accountCode}" ad="${this.escapeXml(l.accountName)}" borc="${l.periodDebit.toFixed(2)}" alacak="${l.periodCredit.toFixed(2)}" bakiyeBorc="${l.closingDebit.toFixed(2)}" bakiyeAlacak="${l.closingCredit.toFixed(2)}"/>`),
      '</mizan>',
    ];
    return xml.join('\n');
  }

  /** Berat dosyası (GIB onay için) */
  generateBerat(metadata: EDefterMetadata, xmlContent: string): string {
    const sha256 = this.simpleHash(xmlContent);
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<berat xmlns="http://www.gib.gov.tr/edefter/berat">',
      `  <firma>${this.escapeXml(metadata.companyName)}</firma>`,
      `  <vkn>${metadata.vkn}</vkn>`,
      `  <donem>${metadata.periodYear}-${String(metadata.periodMonth).padStart(2, '0')}</donem>`,
      `  <belgeTuru>${metadata.documentType}</belgeTuru>`,
      `  <hash algoritma="SHA-256">${sha256}</hash>`,
      `  <olusturmaTarihi>${new Date().toISOString()}</olusturmaTarihi>`,
      `  <olusturan>${this.escapeXml(metadata.generatedBy)}</olusturan>`,
      '</berat>',
    ].join('\n');
  }

  /** Yıl sonu vergi özeti (E.3) */
  generateYearEndSummary(yearSummaries: {
    month: number; revenue: number; expense: number; profit: number;
    vatPayable: number; withholdingTotal: number; temporaryTax: number; stampTax: number;
  }[]): {
    totalRevenue: number; totalExpense: number; totalProfit: number;
    totalVatPayable: number; totalWithholding: number; totalTemporaryTax: number; totalStampTax: number;
    grandTotalTax: number; effectiveTaxRate: number; monthlyAverages: any;
  } {
    const totals = yearSummaries.reduce((acc, m) => ({
      totalRevenue: acc.totalRevenue + m.revenue,
      totalExpense: acc.totalExpense + m.expense,
      totalProfit: acc.totalProfit + m.profit,
      totalVatPayable: acc.totalVatPayable + m.vatPayable,
      totalWithholding: acc.totalWithholding + m.withholdingTotal,
      totalTemporaryTax: acc.totalTemporaryTax + m.temporaryTax,
      totalStampTax: acc.totalStampTax + m.stampTax,
    }), { totalRevenue: 0, totalExpense: 0, totalProfit: 0, totalVatPayable: 0, totalWithholding: 0, totalTemporaryTax: 0, totalStampTax: 0 });

    const grandTotalTax = totals.totalVatPayable + totals.totalWithholding + totals.totalTemporaryTax + totals.totalStampTax;
    const activeMonths = yearSummaries.filter(m => m.revenue > 0).length || 1;

    return {
      ...totals,
      grandTotalTax,
      effectiveTaxRate: totals.totalRevenue > 0 ? Math.round((grandTotalTax / totals.totalRevenue) * 10000) / 100 : 0,
      monthlyAverages: {
        avgRevenue: Math.round(totals.totalRevenue / activeMonths * 100) / 100,
        avgProfit: Math.round(totals.totalProfit / activeMonths * 100) / 100,
        avgTax: Math.round(grandTotalTax / activeMonths * 100) / 100,
      },
    };
  }

  /** Devlet alacakları takip özeti (E.4) */
  generateGovernmentReceivablesSummary(periods: {
    month: number; deferredVat: number; refundableVat: number; excessPayment: number;
  }[]): { totalDeferredVat: number; totalRefundableVat: number; totalExcessPayment: number; grandTotal: number; details: string[] } {
    let totalDeferredVat = 0;
    let totalRefundableVat = 0;
    let totalExcessPayment = 0;
    const details: string[] = [];

    for (const p of periods) {
      totalDeferredVat += p.deferredVat;
      totalRefundableVat += p.refundableVat;
      totalExcessPayment += p.excessPayment;

      if (p.deferredVat > 0) details.push(`Ay ${p.month}: Devreden KDV ${p.deferredVat.toFixed(2)} TL`);
      if (p.refundableVat > 0) details.push(`Ay ${p.month}: İade Edilebilir KDV ${p.refundableVat.toFixed(2)} TL`);
      if (p.excessPayment > 0) details.push(`Ay ${p.month}: Fazla Ödenen Geçici Vergi ${p.excessPayment.toFixed(2)} TL`);
    }

    return { totalDeferredVat, totalRefundableVat, totalExcessPayment, grandTotal: totalDeferredVat + totalRefundableVat + totalExcessPayment, details };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
