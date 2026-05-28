/**
 * KAPTAN LOJİSTİK — E-Fatura / E-İrsaliye PDF Oluşturucu
 * Türkçe karakter desteği: Arial TrueType fontu gömülü
 *
 * PLATFORM EVRAK NUMARALANDIRMA STANDARDI:
 * Format: [Prefix:2][YYYYMMDDHHmmss:14][Sequence:3]
 * FA = E-Fatura | AR = E-Arşiv | IR = E-İrsaliye
 * Örnek: FA20260526234355001
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================================
// EVRAK NUMARALANDIRMA MOTORU (Platform Standardı)
// ============================================================
const lastCounter = new Map();

function generateDocumentNo(prefix) {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  let entry = lastCounter.get(prefix);
  if (!entry || entry.second !== ts) {
    entry = { second: ts, counter: 1 };
  } else {
    entry.counter += 1;
  }
  lastCounter.set(prefix, entry);

  return `${prefix}${ts}${String(entry.counter).padStart(3, '0')}`;
}

// ============================================================
// TÜRKÇE KARAKTER DESTEĞİ İÇİN FONT AYARI
// ============================================================
const FONT_REGULAR = 'C:\\Windows\\Fonts\\arial.ttf';
const FONT_BOLD = 'C:\\Windows\\Fonts\\arialbd.ttf';

// Courier New font yolu (ETTN/VKN kodları için)
const FONT_MONO = 'C:\\Windows\\Fonts\\cour.ttf';

function registerFonts(doc) {
  const fonts = { regular: 'Helvetica', bold: 'Helvetica-Bold', mono: 'Courier' };
  if (fs.existsSync(FONT_REGULAR)) {
    doc.registerFont('Turkish', FONT_REGULAR);
    doc.registerFont('TurkishBold', FONT_BOLD);
    fonts.regular = 'Turkish';
    fonts.bold = 'TurkishBold';
  } else {
    const fallback = 'C:\\Windows\\Fonts\\calibri.ttf';
    if (fs.existsSync(fallback)) {
      doc.registerFont('Turkish', fallback);
      fonts.regular = 'Turkish';
      fonts.bold = 'Turkish';
    } else {
      console.warn('Uyari: Turkce font bulunamadi.');
    }
  }
  if (fs.existsSync(FONT_MONO)) {
    doc.registerFont('Mono', FONT_MONO);
    fonts.mono = 'Mono';
  }
  return fonts;
}

// Filigran ciz (Section 5.2 — 45 derece egimli "e-Fatura")
function drawWatermark(doc, text) {
  doc.save();
  doc.opacity(0.04);
  doc.fontSize(60).fillColor('#000000');
  const cx = 300;
  const cy = 400;
  doc.translate(cx, cy);
  doc.rotate(-45, { origin: [0, 0] });
  doc.text(text, -200, -30, { align: 'center', width: 400 });
  doc.restore();
  doc.opacity(1);
}

// QR kod cercevesi ciz (22x22 mm)
function drawQRPlaceholder(doc, x, y) {
  doc.rect(x, y, 62, 62).stroke('#000000');
  doc.fontSize(5).fillColor('#888888').text('GIB\nQR', x + 15, y + 20, { align: 'center', width: 35 });
}

// ============================================================
// Fatura Verileri (Senaryo Simülasyonundan)
// ============================================================

const GIDIS_FATURA = {
  invoiceNo: generateDocumentNo('FA'),
  type: 'E-FATURA',
  scenario: 'Temel',
  date: '28.05.2026',
  time: '15:30',
  sender: {
    name: 'Ali Kaya',
    vkn: '10000000146',
    taxOffice: 'Samsun VD',
    address: 'Samsun Limanı, İlkadım/Samsun',
    phone: '0(532) 123 45 67',
    email: 'ali.kaya@kaptan.app',
  },
  receiver: {
    name: 'Mersin Ticaret Borsası',
    vkn: '98765432109',
    taxOffice: 'Mersin VD',
    address: 'Mersin Ticaret Borsası, Mezitli/Mersin',
    phone: '0(542) 789 01 23',
    email: 'muhasebe@mersintb.org.tr',
  },
  items: [
    { no: 1, description: '28 Ton Buğday Nakliyesi — Samsun İlkadım → Mersin Mezitli', quantity: 1, unit: 'Sefer', unitPrice: 51800.00, vatRate: 18 },
  ],
  paymentMethod: 'Kredi Kartı (Escrow)',
  paymentDue: '28.06.2026',
  driver: 'Ali Kaya',
  plate: '55 ABC 123',
  route: 'Samsun → Ankara → Konya → Mersin (780 km)',
  deliveryDate: '28.05.2026 14:30',
  escrowRef: 'ESC-1779827047411',
};

const DONUS_FATURA = {
  invoiceNo: generateDocumentNo('AR'),
  type: 'E-ARŞİV FATURA',
  scenario: 'Ticari',
  date: '30.05.2026',
  time: '08:00',
  sender: {
    name: 'Ali Kaya',
    vkn: '10000000146',
    taxOffice: 'Samsun VD',
    address: 'Samsun Limanı, İlkadım/Samsun',
    phone: '0(532) 123 45 67',
    email: 'ali.kaya@kaptan.app',
  },
  receiver: {
    name: 'Tarım Kredi Kooperatifi',
    vkn: '11122233344',
    taxOffice: 'Samsun VD',
    address: 'Samsun Limanı, İlkadım/Samsun',
    phone: '0(544) 111 22 33',
    email: 'muhasebe@tarimkredi.org.tr',
  },
  items: [
    { no: 1, description: '25 Ton Gübre Nakliyesi — Mersin Mezitli → Samsun İlkadım', quantity: 1, unit: 'Sefer', unitPrice: 44000.00, vatRate: 18 },
  ],
  paymentMethod: 'Kredi Kartı (Escrow)',
  paymentDue: '30.06.2026',
  driver: 'Ali Kaya',
  plate: '55 ABC 123',
  route: 'Mersin → Konya → Ankara → Samsun (780 km)',
  deliveryDate: '29.05.2026 22:30',
  escrowRef: 'ESC-1779827047500',
};

// ============================================================
// ORTAK PDF OLUŞTURMA FONKSİYONU
// ============================================================

function buildInvoicePDF(filePath, fatura) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const font = registerFonts(doc);
    doc.font(font.regular);

    // Section 5.2 — Filigran
    const wmText = fatura.type.includes('E-ARSIV') ? 'E-Arsiv Fatura' : 'E-Fatura';
    drawWatermark(doc, wmText);

    const items = fatura.items;
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const totalVat = items.reduce((s, i) => s + Math.round(i.quantity * i.unitPrice * i.vatRate) / 100, 0);
    const grandTotal = subtotal + totalVat;

    // ── Logo / Başlık Bölümü ──
    doc.fontSize(28).text('KAPTAN', 40, 35, { continued: false });
    doc.fontSize(11).fillColor('#E85D00').text('LOJİSTİK PLATFORMU', 40, 65);
    doc.fillColor('#333333');

    // ── Fatura Tipi Etiketi ──
    doc.fontSize(16).fillColor('#E85D00').text(fatura.type, 400, 35, { align: 'right' });
    doc.fillColor('#333333');
    doc.fontSize(9).text(`Senaryo: ${fatura.scenario}`, 400, 55, { align: 'right' });

    // ── Fatura No / Tarih (üst bilgi) ──
    const infoY = 95;
    doc.fontSize(9).fillColor('#666666');
    doc.text(`Fatura No: ${fatura.invoiceNo}`, 40, infoY);
    doc.text(`Tarih: ${fatura.date} ${fatura.time}`, 220, infoY);
    doc.text(`Son Ödeme: ${fatura.paymentDue}`, 40, infoY + 14);
    doc.text(`Ödeme Yöntemi: ${fatura.paymentMethod}`, 220, infoY + 14);
    // Escrow referans — ayrı satır, belirgin
    doc.fontSize(10).fillColor('#E85D00');
    doc.text(`Escrow: ${fatura.escrowRef}`, 40, infoY + 32);
    doc.fillColor('#333333');

    // ── Gönderici / Alıcı (kutulu) ──
    const boxY = infoY + 65; // ~160 — üst bilgiden sonra bol boşluk
    const boxH = 72;
    const boxW = 252;

    // Sol — Gönderici kutusu
    doc.roundedRect(38, boxY - 2, boxW, boxH, 4).stroke('#E2E8F0');
    doc.fontSize(8).fillColor('#AAAAAA').text('GÖNDERİCİ (SATICI)', 48, boxY + 4);
    doc.fontSize(10).fillColor('#333333').text(fatura.sender.name, 48, boxY + 18);
    doc.fontSize(7).fillColor('#888888');
    doc.text(`VKN: ${fatura.sender.vkn}  |  VD: ${fatura.sender.taxOffice}`, 48, boxY + 34);
    doc.text(fatura.sender.address, 48, boxY + 44);
    doc.text(`Tel: ${fatura.sender.phone}  |  ${fatura.sender.email}`, 48, boxY + 54);

    // Sağ — Alıcı kutusu
    doc.roundedRect(310, boxY - 2, boxW, boxH, 4).stroke('#E2E8F0');
    doc.fontSize(8).fillColor('#AAAAAA').text('ALICI (MÜŞTERİ)', 320, boxY + 4);
    doc.fontSize(10).fillColor('#333333').text(fatura.receiver.name, 320, boxY + 18);
    doc.fontSize(7).fillColor('#888888');
    doc.text(`VKN: ${fatura.receiver.vkn}  |  VD: ${fatura.receiver.taxOffice}`, 320, boxY + 34);
    doc.text(fatura.receiver.address, 320, boxY + 44);
    doc.text(`Tel: ${fatura.receiver.phone}  |  ${fatura.receiver.email}`, 320, boxY + 54);
    doc.fillColor('#333333');

    // ── Taşıma Detayları ──
    const yukY = boxY + boxH + 15;
    doc.fontSize(9).fillColor('#888888').text('TAŞIMA DETAYLARI');
    doc.fillColor('#333333').fontSize(10);
    doc.text(`Sürücü: ${fatura.driver}  |  Plaka: ${fatura.plate}  |  Rota: ${fatura.route}`, 40, yukY + 14);
    doc.text(`Teslimat Tarihi: ${fatura.deliveryDate}`, 40, yukY + 29);

    // ── Kalem Tablosu ──
    const tableY = yukY + 60;
    const colX = { no: 40, desc: 70, qty: 320, unit: 365, price: 405, vat: 465, total: 520 };
    const colW = { desc: 250, qty: 40, unit: 40, price: 60, vat: 50, total: 65 };

    // Tablo başlık
    doc.fontSize(8).fillColor('#FFFFFF');
    doc.rect(38, tableY - 2, 520, 18).fill('#E85D00');
    doc.fillColor('#FFFFFF');
    doc.text('No', colX.no, tableY + 3);
    doc.text('Hizmet Açıklaması', colX.desc, tableY + 3);
    doc.text('Miktar', colX.qty, tableY + 3);
    doc.text('Birim', colX.unit, tableY + 3);
    doc.text('B.Fiyat', colX.price, tableY + 3);
    doc.text('KDV%', colX.vat, tableY + 3);
    doc.text('Tutar', colX.total, tableY + 3);

    // Tablo satırları
    let rowY = tableY + 18;
    doc.fillColor('#333333');
    items.forEach((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F4F4F4';
      doc.rect(38, rowY - 1, 520, 20).fill(bgColor);
      doc.fillColor('#333333').fontSize(8);
      doc.text(String(item.no), colX.no, rowY + 4);
      doc.text(item.description, colX.desc, rowY + 4, { width: colW.desc });
      doc.text(item.quantity.toLocaleString('tr-TR'), colX.qty, rowY + 4);
      doc.text(item.unit, colX.unit, rowY + 4);
      doc.text(item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', colX.price, rowY + 4);
      doc.text('%' + item.vatRate, colX.vat, rowY + 4);
      const lineTotal = item.quantity * item.unitPrice;
      doc.text(lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', colX.total, rowY + 4);
      rowY += 20;
    });

    // ── Toplam Alanı ──
    const totalBoxY = rowY + 15;
    const totalX = 340;
    doc.fontSize(9);
    const totalLines = [
      { label: 'Ara Toplam:', value: subtotal },
      { label: 'KDV (%18):', value: totalVat },
      { label: 'GENEL TOPLAM:', value: grandTotal },
    ];
    totalLines.forEach((line, i) => {
      const ly = totalBoxY + i * 20;
      const isBold = line.label === 'GENEL TOPLAM:';
      if (isBold) {
        doc.rect(totalX - 5, ly - 3, 225, 22).fill('#FFF5EB');
        doc.fillColor('#E85D00').fontSize(11);
      } else {
        doc.fillColor('#333333').fontSize(9);
      }
      doc.text(line.label, totalX, ly);
      doc.text(line.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', totalX + 120, ly, { align: 'right', width: 90 });
    });

    // ── QR Kodu (Section 5.2 — sag alt 22x22 mm) ──
    drawQRPlaceholder(doc, 475, totalBoxY + 5);

    // ── GIB Bilgileri (Section 5.2 — ETTN/VKN Courier New) ──
    const gibY = totalBoxY + 80;
    doc.font(font.regular).fontSize(8).fillColor('#888888');
    doc.text('GİB E-BELGE BİLGİLERİ', 40, gibY);
    doc.fillColor('#333333');
    doc.text('GIB Zarf ID:', 40, gibY + 14);
    doc.font(font.mono).text(`GIB-${Date.now()}`, 120, gibY + 14);
    doc.font(font.regular);
    doc.text('ETTN:', 40, gibY + 28);
    doc.font(font.mono).text(`${fatura.invoiceNo}-${Date.now().toString(36).toUpperCase()}`, 120, gibY + 28);
    doc.font(font.regular).fontSize(7).fillColor('#666666');
    doc.text('Durum: GIB Sistemine Basariyla Iletildi — Onaylandi', 40, gibY + 46);
    doc.text('Bu fatura elektronik ortamda duzenlenmis olup islak imza gerektirmez.', 40, gibY + 56);
    doc.text('213 sayili VUK ve 509 No.lu VUK Genel Tebligine uygundur.', 40, gibY + 66);
    doc.text('E-Fatura goruntuleme ve dogrulama: https://www.efatura.gov.tr', 40, gibY + 76);

    // ── Alt Bilgi ──
    doc.font(font.regular).fontSize(7).fillColor('#AAAAAA');
    doc.text(`KAPTAN Lojistik Platformu — ${fatura.type} — ${fatura.invoiceNo}`, 40, 780, { align: 'center', width: 520 });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// ============================================================
// E-İRSALİYE VERİLERİ
// ============================================================

const GIDIS_IRSALIYE = {
  irsaliyeNo: generateDocumentNo('IR'),
  date: '27.05.2026',
  time: '08:15',
  sender: {
    name: 'Ali Kaya',
    vkn: '10000000146',
    address: 'Samsun Limanı, İlkadım/Samsun',
    phone: '0(532) 123 45 67',
  },
  receiver: {
    name: 'Mersin Ticaret Borsası',
    vkn: '98765432109',
    address: 'Mersin Ticaret Borsası, Mezitli/Mersin',
    phone: '0(542) 789 01 23',
  },
  driver: { name: 'Ali Kaya', tcNo: '10000000146', phone: '0(532) 123 45 67' },
  vehicle: { plate: '55 ABC 123', type: 'TIR — Tenteli Dorse', capacity: '28 ton' },
  route: { from: 'Samsun İlkadım', to: 'Mersin Mezitli', distance: '780 km', estimatedTime: '12 saat' },
  cargo: [
    { no: 1, description: 'Buğday (Dökme)', quantity: '28', unit: 'Ton', package: 'Dökme / Silobas' },
  ],
  departure: { date: '27.05.2026', time: '08:15', km: 0 },
  delivery: { date: '28.05.2026', time: '14:30', km: 780, actual: '28.05.2026 14:30 — 3.5 saat erken ✓' },
  stops: [
    { location: 'Merzifon Tesisleri, Amasya (120. km)', purpose: 'Yemek Molası', time: '27.05.2026 10:30' },
    { location: 'Ankara OPET (350. km)', purpose: 'Yakıt Alımı — 112 lt', time: '27.05.2026 13:00' },
    { location: 'Mevlana Tır Parkı, Konya (550. km)', purpose: 'Yemek & Konaklama — 10 saat', time: '27.05.2026 19:30' },
    { location: 'Ereğli Shell, Konya (680. km)', purpose: 'Yakıt Alımı — 64 lt', time: '28.05.2026 09:00' },
  ],
  gpsStart: '40.8733, 35.4633',
  gpsEnd: '36.7333, 34.5167',
  invoiceRef: 'KPT2026004426',
};

const DONUS_IRSALIYE = {
  irsaliyeNo: generateDocumentNo('IR'),
  date: '29.05.2026',
  time: '06:00',
  sender: {
    name: 'Ali Kaya (Taşıyıcı)',
    vkn: '10000000146',
    address: 'Samsun Limanı, İlkadım/Samsun',
    phone: '0(532) 123 45 67',
  },
  receiver: {
    name: 'Tarım Kredi Kooperatifi',
    vkn: '11122233344',
    address: 'Samsun Limanı, İlkadım/Samsun',
    phone: '0(544) 111 22 33',
  },
  driver: { name: 'Ali Kaya', tcNo: '10000000146', phone: '0(532) 123 45 67' },
  vehicle: { plate: '55 ABC 123', type: 'TIR — Tenteli Dorse', capacity: '28 ton' },
  route: { from: 'Mersin Mezitli', to: 'Samsun İlkadım', distance: '780 km', estimatedTime: '12 saat' },
  cargo: [
    { no: 1, description: 'Gübre (Dökme)', quantity: '25', unit: 'Ton', package: 'Dökme / Silobas' },
  ],
  departure: { date: '29.05.2026', time: '06:00', km: 0 },
  delivery: { date: '29.05.2026', time: '22:30', km: 780, actual: '29.05.2026 22:30 — Zamanında ✓' },
  stops: [
    { location: 'Pozantı BP, Adana (350. km)', purpose: 'Yakıt Alımı — 112 lt', time: '29.05.2026 11:00' },
    { location: 'Ankara Shell (600. km)', purpose: 'Yakıt Alımı — 80 lt', time: '29.05.2026 17:00' },
  ],
  gpsStart: '36.7333, 34.5167',
  gpsEnd: '40.8733, 35.4633',
  invoiceRef: 'KPT2026005377',
};

// ============================================================
// E-İRSALİYE PDF OLUŞTURMA FONKSİYONU
// ============================================================

function buildIrsaliyePDF(filePath, irsaliye) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const font = registerFonts(doc);
    doc.font(font.regular);

    // ── Logo / Başlık ──
    doc.fontSize(28).fillColor('#E85D00').text('KAPTAN', 40, 35);
    doc.fontSize(11).fillColor('#333333').text('LOJİSTİK PLATFORMU', 40, 65);

    // ── E-İrsaliye Etiketi ──
    doc.fontSize(18).fillColor('#059669').text('E-İRSALİYE', 400, 35, { align: 'right' });
    doc.fontSize(10).fillColor('#333333').text(`No: ${irsaliye.irsaliyeNo}`, 400, 58, { align: 'right' });

    // ── Tarih / Sevk Bilgisi ──
    const infoY = 95;
    doc.fontSize(9).fillColor('#666666');
    doc.text(`Düzenleme Tarihi: ${irsaliye.date} ${irsaliye.time}`, 40, infoY);
    doc.text(`Sevk Tarihi: ${irsaliye.departure.date} ${irsaliye.departure.time}`, 40, infoY + 15);
    doc.text(`Teslimat: ${irsaliye.delivery.actual}`, 40, infoY + 30);
    doc.text(`Bağlı Fatura: ${irsaliye.invoiceRef}`, 40, infoY + 45);

    // ── Gönderici / Alıcı Kutuları ──
    const boxY = 175;
    // Gönderici kutusu
    doc.rect(38, boxY - 10, 250, 68).stroke('#E2E8F0');
    doc.fontSize(8).fillColor('#888888').text('GÖNDEREN', 45, boxY - 5);
    doc.fontSize(10).fillColor('#333333').text(irsaliye.sender.name, 45, boxY + 10);
    doc.fontSize(7).fillColor('#666666');
    doc.text(`VKN: ${irsaliye.sender.vkn}`, 45, boxY + 27);
    doc.text(irsaliye.sender.address, 45, boxY + 38);
    doc.text(`Tel: ${irsaliye.sender.phone}`, 45, boxY + 49);

    // Alıcı kutusu
    doc.rect(310, boxY - 10, 248, 68).stroke('#E2E8F0');
    doc.fontSize(8).fillColor('#888888').text('ALICI / TESLİM YERİ', 317, boxY - 5);
    doc.fontSize(10).fillColor('#333333').text(irsaliye.receiver.name, 317, boxY + 10);
    doc.fontSize(7).fillColor('#666666');
    doc.text(`VKN: ${irsaliye.receiver.vkn}`, 317, boxY + 27);
    doc.text(irsaliye.receiver.address, 317, boxY + 38);
    doc.text(`Tel: ${irsaliye.receiver.phone}`, 317, boxY + 49);

    // ── Araç / Sürücü / Rota ──
    const vY = boxY + 75;
    doc.fontSize(9).fillColor('#888888').text('ARAÇ, SÜRÜCÜ VE ROTA BİLGİLERİ', 40, vY - 12);
    doc.fontSize(9).fillColor('#333333');
    const v = irsaliye.vehicle; const d = irsaliye.driver; const r = irsaliye.route;
    doc.text(`Plaka: ${v.plate}  |  Araç Tipi: ${v.type}  |  Kapasite: ${v.capacity}`, 40, vY + 6);
    doc.text(`Sürücü: ${d.name}  |  TCKN: ${d.tcNo}  |  Tel: ${d.phone}`, 40, vY + 21);
    doc.text(`Güzergâh: ${r.from} → ${r.to}  |  Mesafe: ${r.distance}  |  Tahmini Süre: ${r.estimatedTime}`, 40, vY + 36);

    // ── Yük Kalemleri ──
    const tableY = vY + 70;
    doc.fontSize(8).fillColor('#FFFFFF');
    doc.rect(38, tableY - 2, 520, 18).fill('#059669');
    doc.fillColor('#FFFFFF');
    doc.text('No', 45, tableY + 3);
    doc.text('Cins / Açıklama', 70, tableY + 3);
    doc.text('Miktar', 270, tableY + 3, { width: 60, align: 'right' });
    doc.text('Birim', 330, tableY + 3);
    doc.text('Ambalaj', 370, tableY + 3);
    doc.text('Teslim Durumu', 455, tableY + 3, { align: 'right' });

    let rowY = tableY + 18;
    irsaliye.cargo.forEach((item, idx) => {
      doc.fillColor('#333333').fontSize(8);
      if (idx % 2 === 0) { doc.rect(38, rowY - 1, 520, 20).fill('#FAFFFA'); }
      doc.fillColor('#333333');
      doc.text(String(item.no), 45, rowY + 4);
      doc.text(item.description, 70, rowY + 4, { width: 190 });
      doc.text(item.quantity, 270, rowY + 4, { width: 60, align: 'right' });
      doc.text(item.unit, 330, rowY + 4);
      doc.text(item.package, 370, rowY + 4);
      doc.text('✓ Teslim Edildi', 455, rowY + 4, { align: 'right' });
      rowY += 20;
    });

    // ── Duraklar / Rota Detayı ──
    const stopY = rowY + 20;
    doc.fontSize(9).fillColor('#888888').text('SEYİR DURAKLARI VE MOLALAR', 40, stopY - 12);
    doc.fontSize(7).fillColor('#666666');
    let sY = stopY + 8;
    irsaliye.stops.forEach((stop, i) => {
      const icon = stop.purpose.includes('Yakıt') ? '⛽' : stop.purpose.includes('Yemek') ? '🍽️' : '🛏️';
      doc.text(`${icon} ${stop.time} — ${stop.location} [${stop.purpose}]`, 45, sY);
      sY += 16;
    });

    // ── GPS ve Teslimat Onayı ──
    const gpsY = sY + 20;
    doc.fontSize(9).fillColor('#888888').text('GPS VE TESLİMAT ONAYI', 40, gpsY - 12);
    doc.fontSize(9).fillColor('#333333');
    doc.text(`Başlangıç GPS: ${irsaliye.gpsStart}  |  Bitiş GPS: ${irsaliye.gpsEnd}`, 40, gpsY + 6);
    doc.text(`Çıkış: ${irsaliye.departure.date} ${irsaliye.departure.time} (Km: ${irsaliye.departure.km})  |  Varış: ${irsaliye.delivery.actual}`, 40, gpsY + 22);
    doc.text(`Teslimat Durumu: ${irsaliye.delivery.actual}`, 40, gpsY + 38);

    // ── İmza Alanı ──
    const signY = gpsY + 70;
    doc.lineWidth(1).strokeColor('#CCCCCC');
    // Teslim eden imza
    doc.moveTo(40, signY + 50).lineTo(240, signY + 50).stroke();
    doc.fontSize(8).fillColor('#888888').text('Teslim Eden (Sürücü) — e-İmzalı', 40, signY + 54);
    // Teslim alan imza
    doc.moveTo(300, signY + 50).lineTo(500, signY + 50).stroke();
    doc.fontSize(8).fillColor('#888888').text('Teslim Alan — e-İmzalı', 300, signY + 54);
    // QR kod benzeri çerçeve
    doc.rect(450, signY - 35, 80, 35).stroke('#059669');
    doc.fontSize(6).fillColor('#059669').text(`e-İrsaliye\n${irsaliye.irsaliyeNo}\nGIB Onaylı`, 455, signY - 28);

    // ── Alt Bilgi ──
    doc.fontSize(7).fillColor('#AAAAAA');
    doc.text(`KAPTAN Lojistik Platformu — E-İrsaliye — ${irsaliye.irsaliyeNo} | Bu belge 213 sayılı VUK ve 509 No.lu Tebliğ\'e uygun elektronik irsaliyedir.`, 40, 780, { align: 'center', width: 520 });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// ============================================================
// VERGİ DÖNEM ÖZETİ PDF RAPORU
// ============================================================

const VERGI_DATA = {
  companyName: 'Ali Kaya (KAPTAN Lojistik)',
  vkn: '10000000146',
  period: 'Mayıs 2026',
  year: 2026, month: 5,
  revenue: 95800, expenses: 15820, profit: 79980,
  kdv: { calculated: 17244, deductible: 2346.20, payable: 14897.80, deferred: 0, refundable: 0 },
  stopaj: { total: 0 },
  geciciVergi: { calculated: 19995, payable: 19995, previousPayments: 0 },
  damgaVergisi: 150.10,
  declarations: [
    { label: 'KDV Beyannamesi', due: '26 Mayıs 2026', daysLeft: -1, status: 'Bekliyor' },
    { label: 'Muhtasar Beyanname', due: '26 Mayıs 2026', daysLeft: -1, status: 'Bekliyor' },
    { label: 'Geçici Vergi (2. Dönem)', due: '14 Mayıs 2026', daysLeft: -13, status: 'Bekliyor' },
  ],
};

function buildTaxReportPDF(filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    const font = registerFonts(doc);
    doc.font(font.regular);
    const v = VERGI_DATA;
    const totalTax = v.kdv.payable + v.stopaj.total + v.geciciVergi.payable + v.damgaVergisi;

    doc.fontSize(26).fillColor('#E85D00').text('KAPTAN', 40, 35);
    doc.fontSize(11).fillColor('#333333').text('LOJİSTİK PLATFORMU', 40, 65);
    doc.fontSize(16).fillColor('#059669').text('VERGİ, MUHASEBE, E-BELGE\nVE FİNANS YÖNETİMİ RAPORU', 380, 35, { align: 'right', width: 185 });
    doc.fontSize(9).fillColor('#666666').text(`Mükellef: ${v.companyName}  |  VKN: ${v.vkn}  |  Dönem: ${v.period}`, 40, 105);

    const kdvY = 145;
    doc.fontSize(13).fillColor('#E85D00').text('KDV Özeti', 40, kdvY);
    doc.rect(38, kdvY + 22, 520, 68).stroke('#E2E8F0');
    [
      { l: 'Hesaplanan KDV', v: v.kdv.calculated }, { l: 'İndirilecek KDV', v: v.kdv.deductible }, { l: 'Ödenecek KDV', v: v.kdv.payable },
    ].forEach((l, i) => {
      doc.fontSize(10).fillColor('#333333').text(l.l, 48, kdvY + 29 + i * 20);
      doc.text(l.v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', 470, kdvY + 29 + i * 20, { align: 'right', width: 80 });
    });

    const yukY = kdvY + 105;
    doc.fontSize(13).fillColor('#E85D00').text('Vergi Yükü Dağılımı', 40, yukY);
    const yukData = [
      { l: 'KDV', v: v.kdv.payable, c: '#DC2626' }, { l: 'Geçici Vergi', v: v.geciciVergi.payable, c: '#2563EB' },
      { l: 'Damga Vergisi', v: v.damgaVergisi, c: '#7C3AED' }, { l: 'Stopaj', v: v.stopaj.total, c: '#D97706' },
    ];
    const maxV = Math.max(...yukData.map(d => d.v), 1);
    yukData.forEach((d, i) => {
      const by = yukY + 22 + i * 28;
      doc.fontSize(8).fillColor('#333333').text(d.l, 40, by + 4);
      doc.rect(130, by, Math.max(30, (d.v / maxV) * 350), 18).fill(d.c);
      doc.fillColor('#FFFFFF').fontSize(7);
      doc.text(d.v.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', 135, by + 4);
      doc.fillColor('#333333');
    });

    const decY = yukY + 22 + yukData.length * 28 + 25;
    doc.fontSize(13).fillColor('#E85D00').text('Beyanname Takvimi', 40, decY);
    doc.rect(38, decY + 20, 520, 16).fill('#059669');
    doc.fillColor('#FFFFFF').fontSize(8);
    doc.text('Beyanname', 48, decY + 24); doc.text('Son Tarih', 250, decY + 24); doc.text('Kalan Gün', 400, decY + 24); doc.text('Durum', 480, decY + 24);
    v.declarations.forEach((d, i) => {
      const ry = decY + 38 + i * 18;
      if (i % 2 === 0) doc.rect(38, ry - 2, 520, 16).fill('#FAFAFA');
      doc.fillColor('#333333').fontSize(8);
      doc.text(d.label, 48, ry + 3); doc.text(d.due, 250, ry + 3); doc.text(String(d.daysLeft), 400, ry + 3);
      doc.fillColor('#DC2626').text(d.status, 480, ry + 3);
    });

    const ozetY = decY + 38 + v.declarations.length * 18 + 25;
    doc.rect(38, ozetY - 5, 520, 72).fill('#FFF5EB').stroke('#E85D00');
    doc.fontSize(14).fillColor('#E85D00').text('DEVLETE ÖDENECEK TOPLAM', 48, ozetY + 5);
    doc.fontSize(24).fillColor('#DC2626').text(totalTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', 48, ozetY + 28);
    doc.fontSize(8).fillColor('#666666').text(`Net Kar: ${v.profit.toLocaleString('tr-TR')} TL  |  Ciro: ${v.revenue.toLocaleString('tr-TR')} TL`, 48, ozetY + 58);

    doc.fontSize(7).fillColor('#AAAAAA');
    doc.text('KAPTAN Lojistik Platformu — Vergi, Muhasebe, E-Belge ve Finans Yönetimi Modülü | Bu rapor bilgilendirme amaçlıdır, resmi beyanname yerine geçmez.', 40, 780, { align: 'center', width: 520 });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// ============================================================
// ANA ÇALIŞTIRMA
// ============================================================
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  KAPTAN LOJİSTİK — E-BELGE PDF OLUŞTURUCU    ║');
  console.log('║  E-Fatura + E-İrsaliye                        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const outDir = __dirname;

  // ═══ Gidiş E-Faturası ═══
  const gidisFaturaPath = path.join(outDir, `E-Fatura_Gidis_${GIDIS_FATURA.invoiceNo}.pdf`);
  console.log(`📄 [1/4] Gidiş E-Faturası: ${GIDIS_FATURA.invoiceNo}`);
  await buildInvoicePDF(gidisFaturaPath, GIDIS_FATURA);
  console.log(`   ✅ ${gidisFaturaPath}\n`);

  // ═══ Gidiş E-İrsaliyesi ═══
  const gidisIrsaliyePath = path.join(outDir, `E-Irsaliye_Gidis_${GIDIS_IRSALIYE.irsaliyeNo}.pdf`);
  console.log(`📄 [2/4] Gidiş E-İrsaliyesi: ${GIDIS_IRSALIYE.irsaliyeNo}`);
  await buildIrsaliyePDF(gidisIrsaliyePath, GIDIS_IRSALIYE);
  console.log(`   ✅ ${gidisIrsaliyePath}\n`);

  // ═══ Dönüş E-Faturası ═══
  const donusFaturaPath = path.join(outDir, `E-Fatura_Donus_${DONUS_FATURA.invoiceNo}_v3.pdf`);
  console.log(`📄 [3/4] Dönüş E-Arşiv Faturası: ${DONUS_FATURA.invoiceNo}`);
  await buildInvoicePDF(donusFaturaPath, DONUS_FATURA);
  console.log(`   ✅ ${donusFaturaPath}\n`);

  // ═══ Dönüş E-İrsaliyesi ═══
  const donusIrsaliyePath = path.join(outDir, `E-Irsaliye_Donus_${DONUS_IRSALIYE.irsaliyeNo}.pdf`);
  console.log(`📄 [4/4] Dönüş E-İrsaliyesi: ${DONUS_IRSALIYE.irsaliyeNo}`);
  await buildIrsaliyePDF(donusIrsaliyePath, DONUS_IRSALIYE);
  console.log(`   ✅ ${donusIrsaliyePath}\n`);

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  ✅ 4 E-BELGE BAŞARIYLA OLUŞTURULDU          ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log('║  📊 E-Fatura Gidiş:  51.800 TL + KDV         ║');
  console.log('║  📊 E-İrsaliye Gidiş: 28 Ton Buğday          ║');
  console.log('║  📊 E-Fatura Dönüş:  44.000 TL + KDV         ║');
  console.log('║  📊 E-İrsaliye Dönüş: 25 Ton Gübre           ║');
  console.log('╚════════════════════════════════════════════════╝');

  // ═══ Vergi Raporu ═══
  console.log('\n📊 [EK] Vergi Dönem Özeti Raporu oluşturuluyor...');
  const vergiPath = path.join(outDir, `Vergi_Donem_Ozeti_${new Date().toISOString().slice(0, 10)}.pdf`);
  await buildTaxReportPDF(vergiPath);
  console.log(`   ✅ ${vergiPath}\n`);
}

main().catch(err => { console.error('HATA:', err); process.exit(1); });
