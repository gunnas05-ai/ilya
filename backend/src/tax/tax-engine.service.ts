import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxPeriodSummary, DeclarationDraft, DeclarationType, DeclarationStatus, TaxDefinition } from './tax.entity';

export interface TaxCalculationInput {
  companyId: string;
  year: number;
  month: number;
  invoices: InvoiceTaxData[];
  expenses: ExpenseTaxData[];
  previousPeriodLoss?: number;
  previousTemporaryTaxPaid?: number;
}

export interface InvoiceTaxData {
  invoiceNo: string;
  type: 'sales' | 'purchase';
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  withholdingRate?: number;
  withholdingAmount?: number;
  isExport: boolean;
  isExempt: boolean;
  buyerVkn?: string;
  buyerName?: string;
}

export interface ExpenseTaxData {
  description: string;
  amount: number;
  category: string;
  withholdingRate?: number;
  stampTaxApplicable?: boolean;
}

export interface TaxCalculationResult {
  periodSummary: Partial<TaxPeriodSummary>;
  kdvDeclaration: any;
  muhtasarDeclaration: any;
  temporaryTaxDeclaration: any;
  baForm: any[];
  bsForm: any[];
  totalTaxLiability: number;
  governmentReceivable: number;
}

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  private readonly DECLARATION_DUE_DAYS: Record<string, number> = {
    kdv: 26,
    muhtasar: 26,
    gecici_vergi: 14, // Şubat/Mayıs/Ağustos/Kasım 14'ü
    damga: 26,
    ba: 31, // Ocak 31
    bs: 31, // Ocak 31
    kurumlar: 25, // Nisan 25
  };

  private readonly BA_BS_THRESHOLD = 5000; // 2026 için 5.000 TL bildirim sınırı

  /** Ana vergi hesaplama motoru */
  calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
    const salesInvoices = input.invoices.filter(i => i.type === 'sales');
    const purchaseInvoices = input.invoices.filter(i => i.type === 'purchase');

    // KDV hesaplama
    const kdv = this.calculateKDV(salesInvoices, purchaseInvoices);

    // Stopaj hesaplama
    const stopaj = this.calculateWithholding(salesInvoices, input.expenses);

    // Geçici vergi
    const geciciVergi = this.calculateTemporaryTax(
      salesInvoices,
      purchaseInvoices,
      input.expenses,
      input.previousPeriodLoss || 0,
      input.previousTemporaryTaxPaid || 0,
    );

    // Damga vergisi
    const damga = this.calculateStampTax(input.expenses);

    // BA/BS
    const baForm = this.generateBAForm(purchaseInvoices);
    const bsForm = this.generateBSForm(salesInvoices);

    // Net vergi yükü
    const totalTaxLiability = kdv.vatPayable + stopaj.totalWithholding + geciciVergi.payable + damga;
    const governmentReceivable = kdv.refundableVat + kdv.deferredVat + geciciVergi.excessPayment;

    const periodSummary: Partial<TaxPeriodSummary> = {
      companyId: input.companyId,
      year: input.year,
      month: input.month,
      calculatedVat: kdv.calculatedVat,
      deductibleVat: kdv.deductibleVat,
      vatPayable: kdv.vatPayable,
      deferredVat: kdv.deferredVat,
      refundableVat: kdv.refundableVat,
      withholdingTotal: stopaj.totalWithholding,
      temporaryTax: geciciVergi.calculated,
      temporaryTaxPaid: input.previousTemporaryTaxPaid || 0,
      stampTax: damga,
      revenueTotal: salesInvoices.reduce((s, i) => s + i.subtotal, 0),
      expenseTotal: purchaseInvoices.reduce((s, i) => s + i.subtotal, 0) + input.expenses.reduce((s, e) => s + e.amount, 0),
      profitTotal: this.calculateProfit(salesInvoices, purchaseInvoices, input.expenses),
      netTaxLiability: totalTaxLiability,
      governmentReceivable,
    };

    return {
      periodSummary,
      kdvDeclaration: kdv,
      muhtasarDeclaration: stopaj,
      temporaryTaxDeclaration: geciciVergi,
      baForm,
      bsForm,
      totalTaxLiability,
      governmentReceivable,
    };
  }

  private calculateKDV(sales: InvoiceTaxData[], purchases: InvoiceTaxData[]) {
    let calculatedVat = 0;
    let deductibleVat = 0;
    let exportRefund = 0;

    for (const inv of sales) {
      if (inv.isExempt) continue;
      calculatedVat += inv.vatAmount;
      if (inv.isExport) exportRefund += inv.vatAmount;
    }

    for (const inv of purchases) {
      deductibleVat += inv.vatAmount;
    }

    const diff = calculatedVat - deductibleVat;
    const vatPayable = diff > 0 ? diff : 0;
    const deferredVat = diff < 0 ? Math.abs(diff) : 0;
    const refundableVat = exportRefund;

    return { calculatedVat, deductibleVat, vatPayable, deferredVat, refundableVat, exportRefund };
  }

  private calculateWithholding(salesInvoices: InvoiceTaxData[], expenses: ExpenseTaxData[]) {
    let totalWithholding = 0;
    const lines: any[] = [];

    for (const inv of salesInvoices) {
      if (inv.withholdingAmount && inv.withholdingAmount > 0) {
        totalWithholding += inv.withholdingAmount;
        lines.push({
          type: 'invoice',
          invoiceNo: inv.invoiceNo,
          base: inv.subtotal,
          rate: inv.withholdingRate,
          amount: inv.withholdingAmount,
        });
      }
    }

    for (const exp of expenses) {
      if (exp.withholdingRate && exp.withholdingRate > 0) {
        const amount = Math.round(exp.amount * exp.withholdingRate) / 100;
        totalWithholding += amount;
        lines.push({
          type: 'expense',
          description: exp.description,
          base: exp.amount,
          rate: exp.withholdingRate,
          amount,
        });
      }
    }

    return { totalWithholding, lines };
  }

  private calculateTemporaryTax(
    sales: InvoiceTaxData[],
    purchases: InvoiceTaxData[],
    expenses: ExpenseTaxData[],
    previousLoss: number,
    previousPayments: number,
  ) {
    const revenue = sales.reduce((s, i) => s + i.subtotal, 0);
    const costOfSales = purchases.reduce((s, i) => s + i.subtotal, 0);
    const otherExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    let profit = revenue - costOfSales - otherExpenses;
    if (previousLoss > 0) profit = Math.max(0, profit - previousLoss);

    const calculated = Math.round(profit * 0.25 * 100) / 100; // %25 kurumlar vergisi
    const payable = Math.max(0, calculated - previousPayments);
    const excessPayment = previousPayments > calculated ? previousPayments - calculated : 0;

    return { revenue, costOfSales, otherExpenses, profit, calculated, payable, previousPayments, excessPayment };
  }

  private calculateStampTax(expenses: ExpenseTaxData[]): number {
    let stampTax = 0;
    for (const exp of expenses) {
      if (exp.stampTaxApplicable) {
        stampTax += Math.round(exp.amount * 0.00948 * 100) / 100; // 2026 binde 9.48
      }
    }
    return Math.round(stampTax * 100) / 100;
  }

  private calculateProfit(sales: InvoiceTaxData[], purchases: InvoiceTaxData[], expenses: ExpenseTaxData[]): number {
    const revenue = sales.reduce((s, i) => s + i.subtotal, 0);
    const costs = purchases.reduce((s, i) => s + i.subtotal, 0) + expenses.reduce((s, e) => s + e.amount, 0);
    return revenue - costs;
  }

  private generateBAForm(purchaseInvoices: InvoiceTaxData[]): any[] {
    const bySupplier: Record<string, { name: string; count: number; total: number }> = {};
    for (const inv of purchaseInvoices) {
      const key = inv.buyerVkn || 'BILINMIYOR';
      if (!bySupplier[key]) bySupplier[key] = { name: inv.buyerName || key, count: 0, total: 0 };
      bySupplier[key].count += 1;
      bySupplier[key].total += inv.subtotal;
    }
    return Object.entries(bySupplier)
      .filter(([, v]) => v.total >= this.BA_BS_THRESHOLD)
      .map(([vkn, v]) => ({ vkn, name: v.name, invoiceCount: v.count, totalAmount: Math.round(v.total * 100) / 100 }));
  }

  private generateBSForm(salesInvoices: InvoiceTaxData[]): any[] {
    const byCustomer: Record<string, { name: string; count: number; total: number }> = {};
    for (const inv of salesInvoices) {
      const key = inv.buyerVkn || 'BILINMIYOR';
      if (!byCustomer[key]) byCustomer[key] = { name: inv.buyerName || key, count: 0, total: 0 };
      byCustomer[key].count += 1;
      byCustomer[key].total += inv.subtotal;
    }
    return Object.entries(byCustomer)
      .filter(([, v]) => v.total >= this.BA_BS_THRESHOLD)
      .map(([vkn, v]) => ({ vkn, name: v.name, invoiceCount: v.count, totalAmount: Math.round(v.total * 100) / 100 }));
  }

  getDeclarationDueDate(type: DeclarationType, year: number, month: number): Date {
    const day = this.DECLARATION_DUE_DAYS[type] || 26;
    const dueDate = new Date(year, month - 1, day);
    // Hafta sonuna denk gelirse sonraki iş gününe kaydır
    while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
      dueDate.setDate(dueDate.getDate() + 1);
    }
    return dueDate;
  }

  getUpcomingDeclarations(year: number, month: number): { type: DeclarationType; label: string; dueDate: Date; daysLeft: number }[] {
    const now = new Date();
    const declarations: { type: DeclarationType; label: string; month: number }[] = [
      { type: DeclarationType.KDV, label: 'KDV Beyannamesi', month },
      { type: DeclarationType.MUHTASAR, label: 'Muhtasar Beyanname', month },
    ];

    // Geçici vergi: Şubat(2), Mayıs(5), Ağustos(8), Kasım(11)
    if ([2, 5, 8, 11].includes(month)) {
      declarations.push({ type: DeclarationType.GECICI_VERGI, label: 'Geçici Vergi Beyannamesi', month });
    }

    // BA/BS: Ocak(1) ayında yıllık
    if (month === 1) {
      declarations.push({ type: DeclarationType.BA, label: 'BA Formu (Yıllık)', month });
      declarations.push({ type: DeclarationType.BS, label: 'BS Formu (Yıllık)', month });
    }

    // Kurumlar vergisi: Nisan(4)
    if (month === 4) {
      declarations.push({ type: DeclarationType.KURUMLAR, label: 'Kurumlar Vergisi Beyannamesi', month: 4 });
    }

    return declarations.map(d => {
      const due = this.getDeclarationDueDate(d.type, year, d.month);
      return { type: d.type, label: d.label, dueDate: due, daysLeft: Math.ceil((due.getTime() - now.getTime()) / 86400000) };
    });
  }

  // ═══ SGK HESAPLAMA MOTORU (B.2) ═══

  calculateSGK(grossSalary: number, employeeCount: number = 1): {
    employee: { gross: number; sgkWorker: number; unemploymentWorker: number; incomeTax: number; stampTax: number; netSalary: number };
    employer: { gross: number; sgkEmployer: number; unemploymentEmployer: number; totalCost: number };
    total: { totalSGK: number; totalUnemployment: number; totalIncomeTax: number; totalStampTax: number; grandTotal: number };
  } {
    const SGK_WORKER_RATE = 0.14;
    const UNEMPLOYMENT_WORKER_RATE = 0.01;
    const SGK_EMPLOYER_RATE = 0.205; // %20.5 (kısa vadeli %2 + uzun vadeli %11 + genel sağlık %7.5)
    const UNEMPLOYMENT_EMPLOYER_RATE = 0.02;
    const STAMP_TAX_RATE = 0.00759;

    const sgkWorker = Math.round(grossSalary * SGK_WORKER_RATE * 100) / 100;
    const unemploymentWorker = Math.round(grossSalary * UNEMPLOYMENT_WORKER_RATE * 100) / 100;
    const sgkBase = grossSalary - sgkWorker - unemploymentWorker;
    const incomeTax = Math.round(sgkBase * 0.15 * 100) / 100;
    const stampTax = Math.round(grossSalary * STAMP_TAX_RATE * 100) / 100;
    const netSalary = grossSalary - sgkWorker - unemploymentWorker - incomeTax - stampTax;
    const sgkEmployer = Math.round(grossSalary * SGK_EMPLOYER_RATE * 100) / 100;
    const unemploymentEmployer = Math.round(grossSalary * UNEMPLOYMENT_EMPLOYER_RATE * 100) / 100;

    return {
      employee: { gross: grossSalary, sgkWorker, unemploymentWorker, incomeTax, stampTax, netSalary },
      employer: {
        gross: grossSalary,
        sgkEmployer,
        unemploymentEmployer,
        totalCost: grossSalary + sgkEmployer + unemploymentEmployer,
      },
      total: {
        totalSGK: (sgkWorker + sgkEmployer) * employeeCount,
        totalUnemployment: (unemploymentWorker + unemploymentEmployer) * employeeCount,
        totalIncomeTax: incomeTax * employeeCount,
        totalStampTax: stampTax * employeeCount,
        grandTotal: (sgkWorker + sgkEmployer + unemploymentWorker + unemploymentEmployer + incomeTax + stampTax) * employeeCount,
      },
    };
  }

  // ═══ İHRACAT KDV DETAYI ═══

  calculateExportKDV(exportInvoices: InvoiceTaxData[]): {
    totalExportRevenue: number;
    totalExportVat: number;
    refundableVat: number;
    requiredDocuments: string[];
    refundEligibility: boolean;
  } {
    const totalExportRevenue = exportInvoices.reduce((s, i) => s + i.subtotal, 0);
    const totalExportVat = exportInvoices.reduce((s, i) => s + i.vatAmount, 0);

    const refundableVat = Math.round(totalExportVat * 0.80 * 100) / 100; // %80'i iade edilebilir

    return {
      totalExportRevenue,
      totalExportVat,
      refundableVat,
      requiredDocuments: [
        'Gümrük Çıkış Beyannamesi',
        'Yurt Dışı Alıcı Faturası',
        'Taşıma Belgesi (CMR/Bill of Lading)',
        'Gümrük Onaylı İhracat Faturası',
        'İhracatçı Birlik Onay Yazısı',
      ],
      refundEligibility: totalExportRevenue > 0,
    };
  }

  // ═══ VERGİ ANOMALİ TESPİTİ (L) ═══

  detectTaxAnomalies(periods: { month: number; revenue: number; vatPayable: number; profit: number; expenseRate: number }[]): {
    anomalies: { type: string; severity: 'low' | 'medium' | 'high'; month: number; description: string }[];
    warnings: string[];
  } {
    const anomalies: { type: string; severity: 'low' | 'medium' | 'high'; month: number; description: string }[] = [];
    const warnings: string[] = [];

    if (periods.length < 2) {
      warnings.push('En az 2 aylık veri ile anomali tespiti yapılabilir');
      return { anomalies, warnings };
    }

    const avgRevenue = periods.reduce((s, p) => s + p.revenue, 0) / periods.length;
    const avgVatPayable = periods.reduce((s, p) => s + p.vatPayable, 0) / periods.length;

    for (const p of periods) {
      // Ani ciro düşüşü
      if (p.revenue < avgRevenue * 0.3 && avgRevenue > 0) {
        anomalies.push({ type: 'REVENUE_DROP', severity: 'high', month: p.month, description: `Ay ${p.month}: Ciro ortalamanın %70 altında (${p.revenue.toFixed(0)} TL vs ort. ${avgRevenue.toFixed(0)} TL)` });
      }

      // Ani KDV artışı
      if (p.vatPayable > avgVatPayable * 2.5 && avgVatPayable > 1000) {
        anomalies.push({ type: 'VAT_SPIKE', severity: 'medium', month: p.month, description: `Ay ${p.month}: Ödenecek KDV ortalamanın 2.5 katı (${p.vatPayable.toFixed(0)} TL vs ort. ${avgVatPayable.toFixed(0)} TL)` });
      }

      // Negatif kar
      if (p.profit < 0) {
        anomalies.push({ type: 'LOSS', severity: 'high', month: p.month, description: `Ay ${p.month}: Zarar tespit edildi (${p.profit.toFixed(0)} TL). Geçici vergi etkisi olabilir.` });
      }

      // Yüksek gider oranı
      if (p.expenseRate > 0.95) {
        anomalies.push({ type: 'HIGH_EXPENSE', severity: 'medium', month: p.month, description: `Ay ${p.month}: Gider oranı %${(p.expenseRate * 100).toFixed(1)} — karlılık riski` });
      }
    }

    // Eksik beyanname uyarısı
    const currentMonth = new Date().getMonth() + 1;
    const declaredMonths = new Set(periods.map(p => p.month));
    for (let m = 1; m < currentMonth; m++) {
      if (!declaredMonths.has(m)) {
        warnings.push(`Ay ${m}: Beyanname verisi bulunamadı — eksik olabilir`);
      }
    }

    return { anomalies, warnings };
  }

  // ═══ HIZLI HESAPLAMA WIDGET'LARI ═══

  quickVatCalculation(revenue: number, vatRate: number, deductibleVat: number = 0): { calculatedVat: number; payableVat: number; netRevenue: number } {
    const calculatedVat = Math.round(revenue * vatRate / 100 * 100) / 100;
    const payableVat = Math.max(0, calculatedVat - deductibleVat);
    return { calculatedVat, payableVat, netRevenue: revenue - payableVat };
  }

  quickProfitAfterTax(revenue: number, expenses: number, taxRate: number = 0.25): { profit: number; tax: number; netProfit: number } {
    const profit = revenue - expenses;
    const tax = Math.max(0, Math.round(profit * taxRate * 100) / 100);
    return { profit, tax, netProfit: profit - tax };
  }

  quickWithholdingCheck(amount: number, serviceType: string, isPublicSector: boolean): { rate: number; withholdingAmount: number; netAmount: number; code: string } {
    const rates: Record<string, { private: number; public: number; code: string }> = {
      logistics: { private: 0.20, public: 0.20, code: '621' },
      freight: { private: 0.20, public: 0.50, code: '625' },
      consulting: { private: 0.20, public: 0.20, code: '601' },
      rent: { private: 0.20, public: 0.20, code: '641' },
      service: { private: 0.20, public: 0.50, code: '627' },
    };
    const r = rates[serviceType] || { private: 0, public: 0, code: '' };
    const rate = isPublicSector ? r.public : r.private;
    const withholdingAmount = Math.round(amount * rate * 100) / 100;
    return { rate, withholdingAmount, netAmount: amount - withholdingAmount, code: r.code };
  }

  /** Nakit çıkış tahmini (E.2) */
  estimateCashOutflow(periods: { month: number; totalTax: number }[]): { nextMonthEstimate: number; quarterEstimate: number; yearEndEstimate: number; monthlyAvg: number } {
    const totalTax = periods.reduce((s, p) => s + p.totalTax, 0);
    const activeMonths = periods.length || 1;
    const monthlyAvg = totalTax / activeMonths;
    return {
      nextMonthEstimate: Math.round(monthlyAvg * 1.05 * 100) / 100,
      quarterEstimate: Math.round(monthlyAvg * 3 * 1.05 * 100) / 100,
      yearEndEstimate: Math.round(monthlyAvg * 12 * 1.05 * 100) / 100,
      monthlyAvg: Math.round(monthlyAvg * 100) / 100,
    };
  }
}
