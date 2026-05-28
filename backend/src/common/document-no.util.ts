/**
 * KAPTAN LOJİSTİK — Platform Evrak Numaralandırma Standardı
 *
 * FORMAT: [Prefix:2][YYYYMMDDHHmmss:14][Sequence:3] = toplam 19 karakter
 * Örnek:  FA20260526234355001
 *          AR20260526234355001
 *          IR20260526234355001
 *
 * Prefix Standardı:
 *   FA — E-Fatura
 *   AR — E-Arşiv Fatura
 *   IR — E-İrsaliye
 *   PR — Proforma
 *   TM — Temel Fatura
 *   TC — Ticari Fatura
 *   IS — İstisna Faturası
 *   IH — İhracat Faturası
 *   TV — Tevkifatlı Fatura
 *   KD — KDV Muaf Faturası
 *   UE — U-ETDS
 *   SM — E-SMM (Serbest Meslek Makbuzu)
 *   EM — E-Müstahsil Makbuzu
 *   YK — Yük (Load)
 *   TK — Teklif (Bid)
 *   SC — Sözleşme (Contract)
 *   OD — Ödeme Dekontu
 *
 * Çakışma önlemi: Aynı saniye içinde 999'a kadar sıralı numara.
 * 999 aşılırsa bir sonraki saniyeye geçilir.
 */

// Son üretilen numaranın saniye ve sayaç bilgisi (in-memory)
const lastGenerated: Map<string, { second: string; counter: number }> = new Map();

function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}${s}`;
}

export function generateDocumentNo(prefix: string): string {
  const ts = getTimestamp();
  const key = prefix;

  let entry = lastGenerated.get(key);

  if (!entry || entry.second !== ts) {
    // Yeni saniye — sayacı sıfırla
    entry = { second: ts, counter: 1 };
  } else {
    // Aynı saniye — sayacı artır
    entry.counter += 1;
  }

  lastGenerated.set(key, entry);

  const seq = String(entry.counter).padStart(3, '0');
  return `${prefix}${ts}${seq}`;
}

/**
 * Fatura tipine göre prefix döndürür
 */
export function getInvoicePrefix(invoiceType: string): string {
  const map: Record<string, string> = {
    e_fatura: 'FA',
    e_arsiv: 'AR',
    proforma: 'PR',
    temel: 'TM',
    ticari: 'TC',
    irsaliyeli: 'IS',
    e_irsaliye: 'IR',
    istisna: 'IS',
    ihracat: 'IH',
    tevkifatli: 'TV',
    kdv_muaf: 'KD',
    u_etds: 'UE',
    e_smm: 'SM',
    e_mustahsil: 'EM',
  };
  return map[invoiceType] || 'XX';
}

export { getTimestamp };
