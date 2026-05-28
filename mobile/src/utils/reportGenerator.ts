import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { analyticsService } from '../services/analyticsService';

type ReportType = 'monthly' | 'annual' | 'tax';

interface ReportData {
  loads: Record<string, string>[];
  invoices: Record<string, string>[];
  expenses: Record<string, string>[];
}

const brandColor = '#FF6B00';
const textPrimary = '#111827';
const textSecondary = '#6B7280';
const borderColor = '#E5E7EB';

function formatTL(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('tr-TR'); } catch { return dateStr; }
}

function wrapHTML(title: string, body: string, footerNote?: string): string {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: ${textPrimary}; padding: 32px; max-width: 800px; margin: auto; }
  .header { border-bottom: 3px solid ${brandColor}; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: ${brandColor}; }
  .header p { color: ${textSecondary}; font-size: 13px; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 16px; color: ${brandColor}; margin-bottom: 12px; border-left: 4px solid ${brandColor}; padding-left: 10px; }
  table { width:100%; border-collapse: collapse; font-size:12px; margin-bottom:16px; }
  th { background: ${brandColor}15; color: ${textPrimary}; padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid ${brandColor}; }
  td { padding: 6px; border-bottom: 1px solid ${borderColor}; }
  .kpi-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .kpi-box { flex:1; background: ${brandColor}10; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px; border-left: 4px solid ${brandColor}; }
  .kpi-box .label { font-size: 11px; color: ${textSecondary}; }
  .kpi-box .value { font-size: 18px; font-weight: 700; color: ${textPrimary}; margin-top: 2px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid ${borderColor}; font-size: 11px; color: ${textSecondary}; text-align: center; }
  tr.total-row td { font-weight: 700; border-top: 2px solid ${brandColor}; background: ${brandColor}08; }
</style></head><body>
<div class="header"><h1>${title}</h1><p>KAPTAN Lojistik Platformu</p></div>
${body}
<div class="footer">${footerNote || 'KAPTAN Lojistik Platformu tarafından oluşturulmuştur.'}<br/>Oluşturma: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</div>
</body></html>`;
}

function buildMonthlyReport(data: ReportData, monthLabel: string): string {
  const totalLoads = data.loads.length;
  const totalSpent = data.loads.reduce((s, l) => s + (parseFloat(l['Fiyat']) || 0), 0);
  const completedLoads = data.loads.filter(l => l['Durum'] === 'teslim_edildi').length;
  const totalExpenses = data.expenses.reduce((s, e) => s + (parseFloat(e['Tutar']) || 0), 0);
  const totalInvoiced = data.invoices.reduce((s, i) => s + (parseFloat(i['Toplam']) || 0), 0);
  const totalVAT = data.invoices.reduce((s, i) => s + (parseFloat(i['KDV']) || 0), 0);

  let body = `<div class="section"><h2>Performans Özeti — ${monthLabel}</h2>`;
  body += `<div class="kpi-row">
    <div class="kpi-box"><span class="label">Toplam Yük</span><span class="value">${totalLoads}</span></div>
    <div class="kpi-box"><span class="label">Tamamlanan</span><span class="value">${completedLoads}</span></div>
    <div class="kpi-box"><span class="label">Toplam Harcama</span><span class="value">${formatTL(totalSpent)}</span></div>
    <div class="kpi-box"><span class="label">Toplam Gider</span><span class="value">${formatTL(totalExpenses)}</span></div>
  </div></div>`;

  // Sevkiyat tablosu
  if (data.loads.length > 0) {
    body += `<div class="section"><h2>Sevkiyat Listesi</h2><table>
    <tr><th>Tarih</th><th>Başlık</th><th>Rota</th><th>Tür</th><th>Fiyat</th><th>Durum</th></tr>`;
    for (const l of data.loads.slice(0, 50)) {
      body += `<tr><td>${formatDate(l['Tarih'])}</td><td>${l['Başlık'] || ''}</td><td>${l['Çıkış'] || ''} → ${l['Varış'] || ''}</td><td>${l['Tür'] || ''}</td><td style="text-align:right">${formatTL(parseFloat(l['Fiyat']) || 0)}</td><td>${l['Durum'] || ''}</td></tr>`;
    }
    body += `<tr class="total-row"><td colspan="4">Toplam (${totalLoads} yük)</td><td style="text-align:right">${formatTL(totalSpent)}</td><td></td></tr></table></div>`;
  }

  // Fatura özeti
  if (data.invoices.length > 0) {
    body += `<div class="section"><h2>Fatura & KDV Özeti</h2><table>
    <tr><th>Belge No</th><th>Tür</th><th>KDV</th><th>Toplam</th><th>Durum</th><th>Tarih</th></tr>`;
    for (const i of data.invoices.slice(0, 30)) {
      body += `<tr><td>${i['Belge No'] || ''}</td><td>${i['Tür'] || ''}</td><td style="text-align:right">${formatTL(parseFloat(i['KDV']) || 0)}</td><td style="text-align:right">${formatTL(parseFloat(i['Toplam']) || 0)}</td><td>${i['Durum'] || ''}</td><td>${formatDate(i['Tarih'])}</td></tr>`;
    }
    body += `<tr class="total-row"><td colspan="2">Toplam</td><td style="text-align:right">${formatTL(totalVAT)}</td><td style="text-align:right">${formatTL(totalInvoiced)}</td><td colspan="2"></td></tr></table></div>`;
  }

  return wrapHTML(`Aylık Taşıma Raporu — ${monthLabel}`, body);
}

function buildAnnualReport(data: ReportData, yearLabel: string): string {
  const totalLoads = data.loads.length;
  const totalSpent = data.loads.reduce((s, l) => s + (parseFloat(l['Fiyat']) || 0), 0);
  const completedLoads = data.loads.filter(l => l['Durum'] === 'teslim_edildi').length;
  const totalExpenses = data.expenses.reduce((s, e) => s + (parseFloat(e['Tutar']) || 0), 0);
  const totalRevenue = data.invoices.reduce((s, i) => s + (parseFloat(i['Toplam']) || 0), 0);
  const totalVAT = data.invoices.reduce((s, i) => s + (parseFloat(i['KDV']) || 0), 0);
  const profit = totalRevenue - totalExpenses - totalSpent;

  // Aylık dağılım
  const monthlyAgg: Record<string, { loads: number; spent: number; revenue: number; expenses: number }> = {};
  for (const l of data.loads) {
    const m = (l['Tarih'] || '').slice(0, 7);
    if (!monthlyAgg[m]) monthlyAgg[m] = { loads: 0, spent: 0, revenue: 0, expenses: 0 };
    monthlyAgg[m].loads++;
    monthlyAgg[m].spent += parseFloat(l['Fiyat']) || 0;
  }
  for (const i of data.invoices) {
    const m = (i['Tarih'] || '').slice(0, 7);
    if (!monthlyAgg[m]) monthlyAgg[m] = { loads: 0, spent: 0, revenue: 0, expenses: 0 };
    monthlyAgg[m].revenue += parseFloat(i['Toplam']) || 0;
  }
  for (const e of data.expenses) {
    const m = (e['Tarih'] || '').slice(0, 7);
    if (!monthlyAgg[m]) monthlyAgg[m] = { loads: 0, spent: 0, revenue: 0, expenses: 0 };
    monthlyAgg[m].expenses += parseFloat(e['Tutar']) || 0;
  }

  let body = `<div class="section"><h2>Yıllık Özet — ${yearLabel}</h2>`;
  body += `<div class="kpi-row">
    <div class="kpi-box"><span class="label">Toplam Yük</span><span class="value">${totalLoads}</span></div>
    <div class="kpi-box"><span class="label">Tamamlanma</span><span class="value">%${totalLoads > 0 ? Math.round((completedLoads / totalLoads) * 100) : 0}</span></div>
    <div class="kpi-box"><span class="label">Toplam Harcama</span><span class="value">${formatTL(totalSpent)}</span></div>
    <div class="kpi-box"><span class="label">Net Kar</span><span class="value">${formatTL(profit)}</span></div>
  </div></div>`;

  // Aylık trend
  const months = Object.keys(monthlyAgg).sort();
  if (months.length > 0) {
    body += `<div class="section"><h2>Aylık Trend</h2><table>
    <tr><th>Ay</th><th>Yük Sayısı</th><th>Yük Harcaması</th><th>Fatura Geliri</th><th>Gider</th><th>Net</th></tr>`;
    for (const m of months) {
      const d = monthlyAgg[m];
      const net = d.revenue - d.expenses - d.spent;
      body += `<tr><td>${m}</td><td>${d.loads}</td><td style="text-align:right">${formatTL(d.spent)}</td><td style="text-align:right">${formatTL(d.revenue)}</td><td style="text-align:right">${formatTL(d.expenses)}</td><td style="text-align:right">${formatTL(net)}</td></tr>`;
    }
    body += `<tr class="total-row"><td>Toplam</td><td>${totalLoads}</td><td style="text-align:right">${formatTL(totalSpent)}</td><td style="text-align:right">${formatTL(totalRevenue)}</td><td style="text-align:right">${formatTL(totalExpenses)}</td><td style="text-align:right">${formatTL(profit)}</td></tr></table></div>`;
  }

  return wrapHTML(`Yıllık Taşıma Raporu — ${yearLabel}`, body);
}

function buildTaxReport(data: ReportData, periodLabel: string): string {
  const totalVAT = data.invoices.reduce((s, i) => s + (parseFloat(i['KDV']) || 0), 0);
  const totalInvoiced = data.invoices.reduce((s, i) => s + (parseFloat(i['Toplam']) || 0), 0);
  const totalExpenseVAT = data.expenses.reduce((s, e) => s + (parseFloat(e['Tutar']) || 0) * 0.20, 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + (parseFloat(e['Tutar']) || 0), 0);
  const vatPayable = totalVAT - totalExpenseVAT;

  let body = `<div class="section"><h2>Vergi Özeti — ${periodLabel}</h2>`;
  body += `<div class="kpi-row">
    <div class="kpi-box"><span class="label">Toplam KDV (Tahsil Edilen)</span><span class="value">${formatTL(totalVAT)}</span></div>
    <div class="kpi-box"><span class="label">İndirilebilir KDV (Gider)</span><span class="value">${formatTL(totalExpenseVAT)}</span></div>
    <div class="kpi-box"><span class="label">Ödenecek KDV</span><span class="value">${formatTL(vatPayable > 0 ? vatPayable : 0)}</span></div>
    <div class="kpi-box"><span class="label">Toplam Ciro</span><span class="value">${formatTL(totalInvoiced)}</span></div>
  </div></div>`;

  // Fatura dökümü
  if (data.invoices.length > 0) {
    body += `<div class="section"><h2>E-Fatura / E-Arşiv Listesi</h2><table>
    <tr><th>Tarih</th><th>Belge No</th><th>Tür</th><th>KDV Matrahı</th><th>KDV</th><th>Toplam</th><th>Durum</th></tr>`;
    for (const i of data.invoices.slice(0, 50)) {
      const vat = parseFloat(i['KDV']) || 0;
      const total = parseFloat(i['Toplam']) || 0;
      const base = total - vat;
      body += `<tr><td>${formatDate(i['Tarih'])}</td><td>${i['Belge No'] || ''}</td><td>${i['Tür'] || ''}</td><td style="text-align:right">${formatTL(base)}</td><td style="text-align:right">${formatTL(vat)}</td><td style="text-align:right">${formatTL(total)}</td><td>${i['Durum'] || ''}</td></tr>`;
    }
    body += `<tr class="total-row"><td colspan="4">Toplam</td><td style="text-align:right">${formatTL(totalVAT)}</td><td style="text-align:right">${formatTL(totalInvoiced)}</td><td></td></tr></table></div>`;
  }

  // Gider dökümü
  if (data.expenses.length > 0) {
    body += `<div class="section"><h2>Gider Listesi (İndirilebilir KDV)</h2><table>
    <tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th><th>KDV (%20)</th><th>Kategori</th></tr>`;
    for (const e of data.expenses.slice(0, 30)) {
      const amount = parseFloat(e['Tutar']) || 0;
      body += `<tr><td>${formatDate(e['Tarih'])}</td><td>${e['Açıklama'] || e['ID'] || ''}</td><td style="text-align:right">${formatTL(amount)}</td><td style="text-align:right">${formatTL(amount * 0.20)}</td><td>${e['Kategori'] || ''}</td></tr>`;
    }
    body += `<tr class="total-row"><td colspan="2">Toplam</td><td style="text-align:right">${formatTL(totalExpenses)}</td><td style="text-align:right">${formatTL(totalExpenseVAT)}</td><td></td></tr></table></div>`;
  }

  return wrapHTML(`Vergi Raporu — ${periodLabel}`, body, 'Bu rapor KAPTAN Lojistik Platformu üzerinden bilgi amaçlı oluşturulmuştur. Resmi vergi beyanı için muhasebecinize danışınız.');
}

async function fetchAndParseAll(): Promise<ReportData> {
  const [loadsCsv, invoicesCsv, expensesCsv] = await Promise.all([
    analyticsService.fetchExportData('loads').catch(() => ''),
    analyticsService.fetchExportData('invoices').catch(() => ''),
    analyticsService.fetchExportData('expenses').catch(() => ''),
  ]);
  return {
    loads: analyticsService.parseCSV(loadsCsv),
    invoices: analyticsService.parseCSV(invoicesCsv),
    expenses: analyticsService.parseCSV(expensesCsv),
  };
}

export async function generateAndSharePDF(type: ReportType): Promise<boolean> {
  try {
    const data = await fetchAndParseAll();
    const now = new Date();
    const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    const yearLabel = now.getFullYear().toString();

    let html: string;
    switch (type) {
      case 'monthly':
        html = buildMonthlyReport(data, monthLabel);
        break;
      case 'annual':
        html = buildAnnualReport(data, yearLabel);
        break;
      case 'tax':
        html = buildTaxReport(data, monthLabel);
        break;
    }

    const { uri } = await Print.printToFileAsync({ html });
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'KAPTAN Raporu — PDF Paylaş',
      });
    }
    return true;
  } catch (err) {
    console.error('PDF generation error:', err);
    return false;
  }
}
