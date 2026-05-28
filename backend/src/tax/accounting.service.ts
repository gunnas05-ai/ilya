import { Injectable, Logger } from '@nestjs/common';

export interface JournalEntry {
  date: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  documentNo: string;
}

export interface LedgerEntry {
  accountCode: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

/** Tek Düzen Hesap Planı — Lojistik sektörü için */
const CHART_OF_ACCOUNTS: Record<string, string> = {
  '100': 'KASA',
  '102': 'BANKALAR',
  '120': 'ALICILAR',
  '121': 'ALACAK SENETLERİ',
  '127': 'DİĞER TİCARİ ALACAKLAR',
  '136': 'DİĞER ÇEŞİTLİ ALACAKLAR',
  '150': 'İLK MADDE VE MALZEME',
  '191': 'İNDİRİLECEK KDV',
  '193': 'PEŞİN ÖDENEN VERGİLER',
  '195': 'İŞ AVANSLARI',
  '255': 'TAŞITLAR',
  '257': 'BİRİKMİŞ AMORTİSMANLAR',
  '320': 'SATICILAR',
  '335': 'PERSONELE BORÇLAR',
  '360': 'ÖDENECEK VERGİ VE FONLAR',
  '361': 'ÖDENECEK SOSYAL GÜVENLİK KESİNTİLERİ',
  '368': 'VADESİ GEÇMİŞ ERTELENMİŞ VERGİ',
  '391': 'HESAPLANAN KDV',
  '392': 'DİĞER KDV',
  '393': 'TEVKİFATLI KDV',
  '600': 'YURT İÇİ SATIŞLAR',
  '601': 'YURT DIŞI SATIŞLAR',
  '602': 'DİĞER GELİRLER',
  '610': 'SATIŞ İNDİRİMLERİ',
  '620': 'SATILAN MAMUL MALİYETİ',
  '621': 'SATILAN HİZMET MALİYETİ',
  '630': 'ARAŞTIRMA GELİŞTİRME GİDERLERİ',
  '631': 'PAZARLAMA SATIŞ DAĞITIM GİDERLERİ',
  '632': 'GENEL YÖNETİM GİDERLERİ',
  '640': 'İŞTİRAKLERDEN TEMETTÜ GELİRLERİ',
  '642': 'FAİZ GELİRLERİ',
  '649': 'DİĞER OLAĞAN GELİR VE KÂRLAR',
  '659': 'DİĞER OLAĞAN GİDER VE ZARARLAR',
  '680': 'ÇALIŞMAYAN KISIM GİDERLERİ',
  '689': 'DİĞER OLAĞANDIŞI GİDER VE ZARARLAR',
  '691': 'DÖNEM KÂRI VERGİ VE DİĞER YASAL YÜKÜMLÜLÜKLER',
  '692': 'DÖNEM NET KÂRI',
  '740': 'HİZMET ÜRETİM MALİYETİ',
  '760': 'PAZARLAMA SATIŞ DAĞITIM GİDERLERİ HESABI',
  '770': 'GENEL YÖNETİM GİDERLERİ HESABI',
};

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  getChartOfAccounts(): { code: string; name: string }[] {
    return Object.entries(CHART_OF_ACCOUNTS).map(([code, name]) => ({ code, name }));
  }

  /** Satış faturası için yevmiye kaydı */
  generateSalesInvoiceJournal(invoice: {
    invoiceNo: string; date: string; customerName: string;
    subtotal: number; vatAmount: number; grandTotal: number;
  }): JournalEntry[] {
    return [
      { date: invoice.date, accountCode: '120', accountName: 'ALICILAR', debit: invoice.grandTotal, credit: 0, description: `${invoice.customerName} - ${invoice.invoiceNo}`, documentNo: invoice.invoiceNo },
      { date: invoice.date, accountCode: '391', accountName: 'HESAPLANAN KDV', debit: 0, credit: invoice.vatAmount, description: `${invoice.invoiceNo} KDV`, documentNo: invoice.invoiceNo },
      { date: invoice.date, accountCode: '600', accountName: 'YURT İÇİ SATIŞLAR', debit: 0, credit: invoice.subtotal, description: `${invoice.invoiceNo} hasılat`, documentNo: invoice.invoiceNo },
    ];
  }

  /** Alış faturası için yevmiye kaydı */
  generatePurchaseInvoiceJournal(invoice: {
    invoiceNo: string; date: string; supplierName: string;
    subtotal: number; vatAmount: number; grandTotal: number;
  }): JournalEntry[] {
    return [
      { date: invoice.date, accountCode: '740', accountName: 'HİZMET ÜRETİM MALİYETİ', debit: invoice.subtotal, credit: 0, description: `${invoice.supplierName} - ${invoice.invoiceNo}`, documentNo: invoice.invoiceNo },
      { date: invoice.date, accountCode: '191', accountName: 'İNDİRİLECEK KDV', debit: invoice.vatAmount, credit: 0, description: `${invoice.invoiceNo} KDV`, documentNo: invoice.invoiceNo },
      { date: invoice.date, accountCode: '320', accountName: 'SATICILAR', debit: 0, credit: invoice.grandTotal, description: `${invoice.supplierName}`, documentNo: invoice.invoiceNo },
    ];
  }

  /** Akaryakıt gideri yevmiye kaydı */
  generateFuelExpenseJournal(expense: { date: string; amount: number; vatAmount: number; station: string; documentNo: string }): JournalEntry[] {
    const total = expense.amount + expense.vatAmount;
    return [
      { date: expense.date, accountCode: '760', accountName: 'PAZARLAMA SATIŞ DAĞITIM GİDERLERİ', debit: expense.amount, credit: 0, description: `Yakıt - ${expense.station}`, documentNo: expense.documentNo },
      { date: expense.date, accountCode: '191', accountName: 'İNDİRİLECEK KDV', debit: expense.vatAmount, credit: 0, description: `Yakıt KDV - ${expense.station}`, documentNo: expense.documentNo },
      { date: expense.date, accountCode: '102', accountName: 'BANKALAR', debit: 0, credit: total, description: `Yakıt ödemesi - ${expense.station}`, documentNo: expense.documentNo },
    ];
  }

  /** Yevmiye kayıtlarından defteri kebir özeti */
  generateLedgerSummary(journals: JournalEntry[]): LedgerEntry[] {
    const accountMap: Record<string, { name: string; debit: number; credit: number }> = {};
    for (const j of journals) {
      if (!accountMap[j.accountCode]) accountMap[j.accountCode] = { name: j.accountName, debit: 0, credit: 0 };
      accountMap[j.accountCode].debit += j.debit;
      accountMap[j.accountCode].credit += j.credit;
    }
    return Object.entries(accountMap).map(([code, v]) => {
      const closingDebit = v.debit > v.credit ? v.debit - v.credit : 0;
      const closingCredit = v.credit > v.debit ? v.credit - v.debit : 0;
      return { accountCode: code, accountName: v.name, openingDebit: 0, openingCredit: 0, periodDebit: v.debit, periodCredit: v.credit, closingDebit, closingCredit };
    });
  }

  /** Mizan dengesi kontrolü */
  verifyTrialBalance(journals: JournalEntry[]): { balanced: boolean; totalDebit: number; totalCredit: number; difference: number } {
    const totalDebit = journals.reduce((s, j) => s + j.debit, 0);
    const totalCredit = journals.reduce((s, j) => s + j.credit, 0);
    return { balanced: totalDebit === totalCredit, totalDebit, totalCredit, difference: Math.abs(totalDebit - totalCredit) };
  }

  /** Tutarı yazıya çevir (Türkçe) */
  numberToTurkishLira(amount: number): string {
    const ones = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
    const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
    const thousands = ['', 'BİN', 'MİLYON', 'MİLYAR'];

    const tl = Math.floor(amount);
    const kr = Math.round((amount - tl) * 100);

    function convert(n: number): string {
      if (n === 0) return 'SIFIR';
      let result = '';
      let group = 0;
      while (n > 0) {
        const part = n % 1000;
        if (part > 0) {
          let partStr = '';
          const h = Math.floor(part / 100);
          const t = Math.floor((part % 100) / 10);
          const o = part % 10;
          if (h > 0) partStr += (h === 1 ? 'YÜZ' : ones[h] + 'YÜZ');
          if (t > 0) partStr += tens[t];
          if (o > 0) partStr += ones[o];
          if (group > 0 && partStr) partStr += thousands[group];
          result = partStr + result;
        }
        n = Math.floor(n / 1000);
        group++;
      }
      return result || 'SIFIR';
    }

    const tlText = convert(tl);
    const krText = kr > 0 ? convert(kr) : 'SIFIR';
    return `${tlText} TÜRK LİRASI ${krText} KURUŞ`;
  }
}
