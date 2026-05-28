import * as fs from 'fs';
import * as path from 'path';

// Use pdfmake's high-level API (handles URLResolver, virtualfs internally)
const pdfmake = require('pdfmake');

// ── Font setup ──────────────────────────────────────────

const WIN_FONTS = 'C:\\Windows\\Fonts';
const FONT_PATHS = {
  Arial: { normal: path.join(WIN_FONTS, 'arial.ttf'), bold: path.join(WIN_FONTS, 'arialbd.ttf'), italics: path.join(WIN_FONTS, 'ariali.ttf'), bolditalics: path.join(WIN_FONTS, 'arialbi.ttf') },
  CourierNew: { normal: path.join(WIN_FONTS, 'cour.ttf'), bold: path.join(WIN_FONTS, 'courbd.ttf'), italics: path.join(WIN_FONTS, 'couri.ttf'), bolditalics: path.join(WIN_FONTS, 'courbi.ttf') },
};

function getAvailableFonts(): Record<string, { normal: string; bold: string; italics: string; bolditalics: string }> {
  const fonts: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }> = {};
  for (const [name, paths] of Object.entries(FONT_PATHS)) {
    if (fs.existsSync(paths.normal) && fs.existsSync(paths.bold)) {
      fonts[name] = paths;
    }
  }
  return fonts;
}

let initialized = false;
function ensurePdfmake() {
  if (!initialized) {
    pdfmake.setFonts(getAvailableFonts());
    initialized = true;
  }
  return pdfmake;
}

// ── PDF generation ─────────────────────────────────────

export async function generateInvoicePdf(invoice: any): Promise<Buffer> {
  ensurePdfmake();
  const docDef = buildDocumentDefinition(invoice);
  const doc = pdfmake.createPdf(docDef);
  return doc.getBuffer();
}

// ── Document definition ────────────────────────────────

function buildDocumentDefinition(invoice: any): any {
  const sender = JSON.parse(invoice.senderJson || '{}');
  const receiver = JSON.parse(invoice.receiverJson || '{}');
  const typeLabel = invoiceTypeLabel(invoice.invoiceType);
  const qrUrl = `https://ebelge.gib.gov.tr/sorgula?uuid=${invoice.ettn}`;
  const items = invoice.items || [];

  const header = [
    { text: '#', style: 'tableHeader' },
    { text: 'Açıklama', style: 'tableHeader' },
    { text: 'Miktar', style: 'tableHeader', alignment: 'right' },
    { text: 'Birim', style: 'tableHeader', alignment: 'center' },
    { text: 'Birim Fiyat', style: 'tableHeader', alignment: 'right' },
    { text: 'İsk.%', style: 'tableHeader', alignment: 'right' },
    { text: 'KDV%', style: 'tableHeader', alignment: 'right' },
    { text: 'Tutar', style: 'tableHeader', alignment: 'right' },
  ];

  const body = items.map((item: any) => [
    item.lineNo.toString(),
    item.description || '',
    { text: Number(item.quantity).toFixed(2), alignment: 'right' },
    { text: item.unit || '', alignment: 'center' },
    { text: Number(item.unitPrice).toFixed(2), alignment: 'right' },
    { text: item.discountPct > 0 ? `%${item.discountPct}` : '-', alignment: 'right' },
    { text: `%${item.vatRate}`, alignment: 'right' },
    { text: Number(item.lineTotal).toFixed(2), alignment: 'right', bold: true },
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [57, 71, 28, 57], // 20/25/10/20 mm → pt
    defaultStyle: { font: 'Arial', fontSize: 9, color: '#000000' },

    watermark: { text: typeLabel, color: '#D9D9D9', opacity: 0.15, bold: true, fontSize: 60 },

    content: [
      // ── Header ──
      {
        columns: [
          { text: sender.name || 'Firma', style: 'companyName' },
          {
            stack: [
              { text: typeLabel, style: 'docTitle' },
              { text: `Senaryo: ${invoice.scenario || 'Temel'}`, style: 'docMeta' },
              { text: `Belge No: ${invoice.invoiceNo}`, style: 'docMeta' },
              { text: `Tarih: ${formatDate(invoice.issueDate)}`, style: 'docMeta' },
              { text: `ETTN: ${invoice.ettn}`, style: 'docMetaMonospace' },
            ],
            alignment: 'right',
          },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 510, y2: 4, lineWidth: 1, lineColor: '#000000' }], margin: [0, 0, 0, 4] },

      // ── Sender / Receiver ──
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Gönderen:', style: 'sectionTitle' },
              { text: `${sender.name || ''}`, style: 'bodyBold' },
              ...(sender.vkn ? [{ text: `VKN: ${sender.vkn}`, style: 'bodyMonospace' }] : []),
              ...(sender.taxOffice ? [{ text: `VD: ${sender.taxOffice}`, style: 'bodyText' }] : []),
              { text: `${sender.address || ''}`, style: 'bodyText' },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Alıcı:', style: 'sectionTitle' },
              { text: `${receiver.name || ''}`, style: 'bodyBold' },
              ...(receiver.vknTckn ? [{ text: `${receiver.type === 'kurumsal' ? 'VKN' : 'TCKN'}: ${receiver.vknTckn}`, style: 'bodyMonospace' }] : []),
              ...(receiver.taxOffice ? [{ text: `VD: ${receiver.taxOffice}`, style: 'bodyText' }] : []),
              { text: `${receiver.address || ''}`, style: 'bodyText' },
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 6, 0, 6],
      },

      // ── Items Table ──
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 36, 30, 42, 30, 28, 42],
          body: [header, ...body],
        },
        layout: {
          fillColor: (ri: number) => {
            if (ri === 0) return '#E6E6E6';
            return ri % 2 === 0 ? '#F4F4F4' : null;
          },
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => '#808080',
          vLineColor: () => '#808080',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 6, 0, 0],
      },

      // ── Totals ──
      {
        alignment: 'right',
        margin: [0, 10, 0, 0],
        stack: [
          { text: `Mal/Hizmet Toplamı:      ${Number(invoice.subtotal).toFixed(2)} ₺`, style: 'totalRow' },
          { text: `Toplam İskonto:             ${Number(invoice.discountTotal).toFixed(2)} ₺`, style: 'totalRow' },
          { text: `KDV Matrahı:                 ${(Number(invoice.subtotal) - Number(invoice.discountTotal)).toFixed(2)} ₺`, style: 'totalRow' },
          { text: `Hesaplanan KDV:            ${Number(invoice.vatTotal).toFixed(2)} ₺`, style: 'totalRow' },
          ...(Number(invoice.withholdingTotal) > 0
            ? [{ text: `Tevkifat:                        ${Number(invoice.withholdingTotal).toFixed(2)} ₺`, style: 'totalRow' }]
            : []),
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: '#808080' }], margin: [0, 4, 0, 4] },
          { text: `NET ÖDENECEK TUTAR: ${Number(invoice.grandTotal).toFixed(2)} ₺`, style: 'grandTotal' },
          { text: numberToWords(invoice.grandTotal), style: 'totalWords' },
        ],
      },

      // ── QR ──
      { qr: qrUrl, fit: 62, alignment: 'right', margin: [0, 10, 0, 0] },
      { text: 'Belge Doğrulama Kodu', style: 'qrLabel', alignment: 'right' },
    ],

    footer: (currentPage: number, pageCount: number) => ({
      stack: [
        { text: 'Bu belge elektronik ortamda oluşturulmuştur. Islak imza aranmaz.', style: 'footerText' },
        { text: 'GİB Uyumludur – KAPTAN Lojistik Sistemi', style: 'footerText' },
        { text: `Sayfa ${currentPage} / ${pageCount}  ·  ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`, style: 'footerText' },
      ],
      alignment: 'center',
      margin: [57, 10, 28, 0],
    }),

    styles: {
      companyName: { fontSize: 14, bold: true, marginBottom: 4 },
      docTitle: { fontSize: 18, bold: true, marginBottom: 2 },
      docMeta: { fontSize: 9, margin: [0, 1, 0, 0] },
      docMetaMonospace: { fontSize: 8, font: 'CourierNew', margin: [0, 1, 0, 0] },
      sectionTitle: { fontSize: 9, bold: true, margin: [0, 6, 0, 2] },
      bodyBold: { fontSize: 9, bold: true, margin: [0, 1, 0, 0] },
      bodyText: { fontSize: 9, margin: [0, 1, 0, 0] },
      bodyMonospace: { fontSize: 8, font: 'CourierNew', margin: [0, 1, 0, 0] },
      tableHeader: { fontSize: 7.5, bold: true, color: '#000000' },
      totalRow: { fontSize: 9, margin: [0, 1, 0, 0] },
      grandTotal: { fontSize: 11, bold: true, margin: [0, 4, 0, 0] },
      totalWords: { fontSize: 7.5, italics: true, color: '#454545', margin: [0, 2, 0, 0] },
      footerText: { fontSize: 7, color: '#666666', margin: [0, 1, 0, 0] },
      qrLabel: { fontSize: 6, color: '#666666', alignment: 'right', margin: [0, 1, 0, 0] },
    },
  };
}

// ── Helpers ────────────────────────────────────────────

function invoiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    e_fatura: 'E-Fatura', e_arsiv: 'E-Arşiv Fatura', proforma: 'Proforma Fatura',
    temel: 'Temel Fatura', ticari: 'Ticari Fatura', irsaliyeli: 'İrsaliyeli Fatura',
    e_irsaliye: 'E-İrsaliye', istisna: 'İstisna Faturası', ihracat: 'İhracat Faturası',
    tevkifatli: 'Tevkifatlı Fatura', kdv_muaf: 'KDV Muaf Fatura', u_etds: 'U-ETDS',
  };
  return labels[type] || type;
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('tr-TR');
}

function numberToWords(amount: number): string {
  const whole = Math.floor(amount);
  const kurus = Math.round((amount - whole) * 100);
  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const scales = ['', 'Bin', 'Milyon', 'Milyar'];

  function convertChunk(n: number): string {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    let s = '';
    if (h > 0) s += h === 1 ? 'Yüz' : ones[h] + 'Yüz';
    if (t > 0) s += tens[t];
    if (o > 0) s += ones[o];
    return s;
  }

  if (whole === 0) return 'Sıfır Türk Lirası';
  let result = '';
  let remaining = whole;
  let scaleIdx = 0;
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      let s = convertChunk(chunk);
      if (chunk === 1 && scaleIdx === 1) s = 'Bin';
      else if (chunk === 1 && scaleIdx > 1) s = 'Bir';
      result = s + scales[scaleIdx] + result;
    }
    remaining = Math.floor(remaining / 1000);
    scaleIdx++;
  }
  result += ' Türk Lirası';
  if (kurus > 0) result += `${kurus} Kuruş`;
  return result;
}
