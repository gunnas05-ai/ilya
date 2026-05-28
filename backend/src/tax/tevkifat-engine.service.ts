import { Injectable, Logger } from '@nestjs/common';

/**
 * TEVKİFAT KONTROL MOTORU (C.3)
 *
 * Faturanın tevkifata tabi olup olmadığını otomatik belirler.
 * Kriterler: Alıcı türü, kamu kurumu durumu, sektör kodu, hizmet tipi, fatura tipi
 */

export interface TevkifatCheckInput {
  buyerVkn: string;
  buyerName: string;
  buyerType: 'public' | 'private' | 'individual';
  serviceType: 'logistics' | 'freight' | 'consulting' | 'rent' | 'service' | 'other';
  invoiceSubtotal: number;
  invoiceType: string;
  sectorCode?: string;
}

export interface TevkifatResult {
  isSubjectToWithholding: boolean;
  withholdingRate: number;        // Örn: 2/10 = %20, 5/10 = %50, 9/10 = %90
  withholdingAmount: number;
  withholdingCode: string;        // GİB tevkifat kodu
  reason: string;
  buyerObligation: string;       // Alıcının sorumluluğu
}

@Injectable()
export class TevkifatEngineService {
  private readonly logger = new Logger(TevkifatEngineService.name);

  // GİB tevkifat kodları ve oranları (2026 güncel)
  private readonly WITHHOLDING_RULES: Record<string, { rate: number; code: string; label: string }> = {
    // Lojistik hizmetleri — kamu ve özel sektör alımlarında 2/10
    logistics_public: { rate: 0.20, code: '621', label: 'Lojistik-Taşımacılık (Kamu)' },
    logistics_private: { rate: 0.20, code: '621', label: 'Lojistik-Taşımacılık (Özel)' },

    // Nakliye/taşımacılık — kamuya 5/10
    freight_public: { rate: 0.50, code: '625', label: 'Taşımacılık (Kamu)' },
    freight_private: { rate: 0.20, code: '621', label: 'Taşımacılık (Özel Sektör)' },

    // Serbest meslek — %20 stopaj
    consulting: { rate: 0.20, code: '601', label: 'Serbest Meslek' },

    // Kira stopajı — %20
    rent: { rate: 0.20, code: '641', label: 'Kira Stopajı' },

    // Genel hizmet — kamuya 5/10, özele 2/10
    service_public: { rate: 0.50, code: '627', label: 'Hizmet (Kamu)' },
    service_private: { rate: 0.20, code: '621', label: 'Hizmet (Özel Sektör)' },

    // Tam tevkifat durumları
    full_withholding: { rate: 1.0, code: '901', label: 'Tam Tevkifat' },
  };

  /** Ana tevkifat belirleme motoru */
  determineWithholding(input: TevkifatCheckInput): TevkifatResult {
    // Bireysel alıcılarda tevkifat yok
    if (input.buyerType === 'individual') {
      return this.noWithholding('Bireysel alıcı — tevkifat uygulanmaz');
    }

    // Tam tevkifat kontrolü (belirli sektörler)
    if (this.isFullWithholdingCase(input)) {
      return this.buildResult(input, 'full_withholding');
    }

    // Kamu kurumu mu?
    const isPublic = input.buyerType === 'public' || this.isPublicInstitution(input.buyerVkn, input.buyerName);

    // Hizmet tipine göre tevkifat belirleme
    const ruleKey = this.getRuleKey(input.serviceType, isPublic);

    if (ruleKey) {
      return this.buildResult(input, ruleKey);
    }

    return this.noWithholding('Hizmet tipi tevkifat kapsamı dışında');
  }

  /** Belirli tevkifat oranı ile fatura detayından stopaj hesabı */
  calculateWithholdingFromInvoice(invoice: {
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    buyerVkn: string;
    buyerName: string;
    serviceType: string;
  }): { base: number; withholdingRate: number; withholdingAmount: number; netPayable: number; code: string } {
    const check = this.determineWithholding({
      buyerVkn: invoice.buyerVkn,
      buyerName: invoice.buyerName,
      buyerType: this.guessBuyerType(invoice.buyerVkn, invoice.buyerName),
      serviceType: invoice.serviceType as any,
      invoiceSubtotal: invoice.subtotal,
      invoiceType: 'e_fatura',
    });

    if (!check.isSubjectToWithholding) {
      return { base: invoice.subtotal, withholdingRate: 0, withholdingAmount: 0, netPayable: invoice.subtotal + invoice.vatAmount, code: '' };
    }

    const base = invoice.subtotal;
    const withholdingAmount = Math.round(base * check.withholdingRate * 100) / 100;
    const netPayable = (invoice.subtotal + invoice.vatAmount) - withholdingAmount;

    return {
      base,
      withholdingRate: check.withholdingRate,
      withholdingAmount,
      netPayable,
      code: check.withholdingCode,
    };
  }

  /** Brütten nete stopaj hesapla (serbest meslek, kira vb.) */
  calculateGrossToNet(grossAmount: number, serviceType: string, buyerType: string): { gross: number; stopaj: number; net: number; rate: number } {
    const isPublic = buyerType === 'public';
    const ruleKey = this.getRuleKey(serviceType as any, isPublic);
    const rate = ruleKey ? this.WITHHOLDING_RULES[ruleKey].rate : 0;
    const stopaj = Math.round(grossAmount * rate * 100) / 100;
    return { gross: grossAmount, stopaj, net: grossAmount - stopaj, rate };
  }

  /** Netten brüte stopaj hesapla */
  calculateNetToGross(netAmount: number, serviceType: string, buyerType: string): { gross: number; stopaj: number; net: number; rate: number } {
    const isPublic = buyerType === 'public';
    const ruleKey = this.getRuleKey(serviceType as any, isPublic);
    const rate = ruleKey ? this.WITHHOLDING_RULES[ruleKey].rate : 0;
    if (rate >= 1) return { gross: netAmount, stopaj: 0, net: netAmount, rate };
    const gross = Math.round(netAmount / (1 - rate) * 100) / 100;
    const stopaj = Math.round((gross - netAmount) * 100) / 100;
    return { gross, stopaj, net: netAmount, rate };
  }

  /** Muhtasar beyanname özeti */
  generateMuhtasarSummary(entries: { type: string; base: number; rate: number; amount: number }[]): { totalBase: number; totalWithholding: number; byType: Record<string, { count: number; base: number; amount: number }> } {
    const byType: Record<string, { count: number; base: number; amount: number }> = {};
    let totalBase = 0;
    let totalWithholding = 0;

    for (const e of entries) {
      totalBase += e.base;
      totalWithholding += e.amount;
      if (!byType[e.type]) byType[e.type] = { count: 0, base: 0, amount: 0 };
      byType[e.type].count += 1;
      byType[e.type].base += e.base;
      byType[e.type].amount += e.amount;
    }

    return { totalBase, totalWithholding, byType };
  }

  private getRuleKey(serviceType: string, isPublic: boolean): string | null {
    if (isPublic) {
      if (serviceType === 'logistics') return 'logistics_public';
      if (serviceType === 'freight') return 'freight_public';
      if (serviceType === 'consulting') return 'consulting';
      if (serviceType === 'rent') return 'rent';
      if (serviceType === 'service') return 'service_public';
    } else {
      if (serviceType === 'logistics' || serviceType === 'freight') return 'logistics_private';
      if (serviceType === 'consulting') return 'consulting';
      if (serviceType === 'rent') return 'rent';
      if (serviceType === 'service') return 'service_private';
    }
    return null;
  }

  private isPublicInstitution(vkn: string, name: string): boolean {
    const publicKeywords = [
      'BAKANLIK', 'BELEDİYE', 'VALİLİK', 'KAYMAKAMLIK', 'MÜDÜRLÜK',
      'ÜNİVERSİTE', 'REKTÖRLÜK', 'DEKANLIK', 'ENSTİTÜ',
      'EMNİYET', 'JANDARMA', 'KOMUTANLIK',
      'SGK', 'İŞKUR', 'TÜİK', 'MTA', 'DSİ', 'KGM', 'DHMİ', 'TCDD', 'PTT',
      'MAHKEME', 'ADLİYE', 'SAVCI', 'CEZAEVİ',
      'HASTANE', 'DEVLET', 'KAMU', 'GENEL MÜDÜRLÜK', 'BAŞKANLIK',
    ];

    const upperName = name.toLocaleUpperCase('tr-TR');

    // VKN kontrolü: kamu kurumları genelde belirli VKN serileriyle başlar
    if (vkn === '1111111111') return false; // test VKN'si

    for (const keyword of publicKeywords) {
      if (upperName.includes(keyword)) return true;
    }

    return false;
  }

  private isFullWithholdingCase(input: TevkifatCheckInput): boolean {
    // Tam tevkifat: Belirli sektör kodları veya özel durumlar
    const fullWithholdingSectors = ['90', '91', '92']; // GİB tam tevkifat sektör kodları
    if (input.sectorCode && fullWithholdingSectors.includes(input.sectorCode)) return true;

    // İhracat kayıtlı teslimlerde tam tevkifat
    if (input.invoiceType === 'ihracat') return true;

    return false;
  }

  private guessBuyerType(vkn: string, name: string): 'public' | 'private' | 'individual' {
    if (this.isPublicInstitution(vkn, name)) return 'public';
    // 11 haneli TCKN → bireysel, 10 haneli VKN → kurumsal
    if (vkn && vkn.length === 11 && /^\d{11}$/.test(vkn)) return 'individual';
    return 'private';
  }

  private noWithholding(reason: string): TevkifatResult {
    return { isSubjectToWithholding: false, withholdingRate: 0, withholdingAmount: 0, withholdingCode: '', reason, buyerObligation: '' };
  }

  private buildResult(input: TevkifatCheckInput, ruleKey: string): TevkifatResult {
    const rule = this.WITHHOLDING_RULES[ruleKey];
    const amount = Math.round(input.invoiceSubtotal * rule.rate * 100) / 100;
    return {
      isSubjectToWithholding: true,
      withholdingRate: rule.rate,
      withholdingAmount: amount,
      withholdingCode: rule.code,
      reason: rule.label,
      buyerObligation: `Alıcı ${(rule.rate * 100).toFixed(0)}% oranında (${rule.code} kodlu) tevkifat yapmakla yükümlüdür. Tevkifat tutarı: ${amount.toFixed(2)} TL`,
    };
  }
}
