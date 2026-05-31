import { Injectable, Logger } from '@nestjs/common';

interface VoiceAction {
  intent: string;
  params: Record<string, any>;
  confidence: number;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  // Turkish voice command patterns
  private readonly patterns: Array<{ regex: RegExp; intent: string; extractors: string[] }> = [
    // Map/filter commands
    { regex: /haritada\s+(.+?)\s+ilanlar[iı]n[ıi]\s+g[oö]ster/i, intent: 'FILTER_BY_CITY', extractors: ['city'] },
    { regex: /(\d+)\s*ton\s+alt[iı]ndaki\s+y[üu]kleri\s+filtrele/i, intent: 'FILTER_BY_WEIGHT', extractors: ['maxWeight'] },
    { regex: /escrow\s+garantili\s+y[üu]kleri\s+g[oö]ster/i, intent: 'FILTER_ESCROW_ONLY', extractors: [] },
    { regex: /g[üu]venli\s+[oö]demeli\s+y[üu]kleri\s+filtrele/i, intent: 'FILTER_ESCROW_ONLY', extractors: [] },
    { regex: /(\d+)\s*km\s+i[çc]indeki\s+y[üu]kleri\s+g[oö]ster/i, intent: 'FILTER_BY_RADIUS', extractors: ['radiusKm'] },

    // Bid commands
    { regex: /(\d+)\s*TL\s+teklif\s+ver/i, intent: 'PLACE_BID', extractors: ['amount'] },
    { regex: /pazarl[iı][gğ][iı]\s+kabul\s+et/i, intent: 'ACCEPT_COUNTER_BID', extractors: [] },
    { regex: /teklifi\s+reddet/i, intent: 'REJECT_BID', extractors: [] },

    // Navigation commands
    { regex: /rotay[iı]\s+a[çc]/i, intent: 'SHOW_ROUTE', extractors: [] },
    { regex: /harita[yıi]\s+a[çc]/i, intent: 'SHOW_MAP', extractors: [] },
    { regex: /geri\s+d[oö]n/i, intent: 'GO_BACK', extractors: [] },

    // Announce/read commands
    { regex: /ila[nm][iı]\s+oku/i, intent: 'READ_LOAD', extractors: [] },
    { regex: /escrow\s+detaylar[iı]n[iı]\s+a[çc]/i, intent: 'SHOW_ESCROW', extractors: [] },
    { regex: /yak[iı]n[iı]mdaki\s+don[üu][sş]\s+y[üu]klerini\s+g[oö]ster/i, intent: 'SHOW_NEARBY_RETURN_LOADS', extractors: [] },
  ];

  parseCommand(command: string): VoiceAction {
    for (const pattern of this.patterns) {
      const match = command.match(pattern.regex);
      if (match) {
        const params: Record<string, any> = {};
        pattern.extractors.forEach((ext, i) => {
          params[ext] = match[i + 1];
        });
        return { intent: pattern.intent, params, confidence: 0.85 };
      }
    }

    // Fallback: unknown intent
    return {
      intent: 'UNKNOWN',
      params: { rawCommand: command },
      confidence: 0.3,
    };
  }

  generateResponse(intent: string, params: Record<string, any>): string {
    const responses: Record<string, string> = {
      FILTER_BY_CITY: `${params.city} bölgesindeki ilanlar haritada gösteriliyor.`,
      FILTER_BY_WEIGHT: `${params.maxWeight} ton altındaki yükler filtreleniyor.`,
      FILTER_ESCROW_ONLY: 'Escrow garantili yükler listeleniyor.',
      FILTER_BY_RADIUS: `${params.radiusKm} kilometre içindeki yükler taranıyor.`,
      PLACE_BID: `${params.amount} TL teklif veriliyor. Onaylıyor musunuz?`,
      ACCEPT_COUNTER_BID: 'Pazarlık kabul ediliyor, işlem başlatılıyor.',
      REJECT_BID: 'Teklif reddediliyor.',
      SHOW_ROUTE: 'Rota haritada açılıyor.',
      SHOW_MAP: 'Harita görünümü açılıyor.',
      GO_BACK: 'Bir önceki ekrana dönülüyor.',
      READ_LOAD: 'Yük detayları sesli olarak okunuyor.',
      SHOW_ESCROW: 'Escrow detayları açılıyor.',
      SHOW_NEARBY_RETURN_LOADS: 'Yakınınızdaki geri dönüş yükleri taranıyor.',
      UNKNOWN: 'Üzgünüm, bu komutu anlayamadım. Lütfen tekrar deneyin.',
    };

    return responses[intent] || responses.UNKNOWN;
  }

  // Generate TTS-friendly text for a load
  formatLoadForSpeech(load: any): string {
    return [
      `Yük başlığı: ${load.title}`,
      `Yük tipi: ${load.loadType || 'Belirtilmemiş'}`,
      `Kalkış noktası: ${load.originCity || 'Belirtilmemiş'}`,
      `Varış noktası: ${load.destCity || 'Belirtilmemiş'}`,
      `Tahmini fiyat: ${Number(load.price || 0).toLocaleString('tr-TR')} Türk Lirası`,
      `Escrow durumu: ${load.escrowEnabled ? 'Güvenli ödeme aktif' : 'Güvenli ödeme yok'}`,
      `Araç tipi: ${load.vehicleType || 'Belirtilmemiş'}`,
      `Tonaj: ${load.weight ? Number(load.weight).toLocaleString('tr-TR') + ' kilogram' : 'Belirtilmemiş'}`,
      load.urgency ? `Aciliyet: ${load.urgency}` : '',
    ].filter(Boolean).join('. ');
  }

  // Process an AI dialog message for load creation
  parseAiDialogMessage(message: string): { success: boolean; extracted: Record<string, any>; response: string } {
    const extracted: Record<string, any> = {};
    // Encoding fix: HTTP'de İ→i(I+combining dot) olarak gelebilir
    const msg = (message || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/İ/gi, 'i').replace(/I/gi, 'i')
      .normalize('NFC');

    // ===== TURKISH CITY LIST =====
    const CITIES = [
      'Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir',
      'Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli',
      'Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari',
      'Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir',
      'Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir',
      'Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat',
      'Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman',
      'Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce',
    ];

    const turkishToAscii = (s: string) => {
      return s.replace(/[İI]/gi, 'i').replace(/[ĞÜŞÖÇığüşöç]/g, c => ({ 'Ğ':'g','Ü':'u','Ş':'s','Ö':'o','Ç':'c','ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c' }[c] || c)).toLowerCase();
    };
    const foundCities: string[] = [];
    const msgLower = turkishToAscii(msg);
    for (const city of CITIES) {
      if (msgLower.includes(turkishToAscii(city))) {
        foundCities.push(city);
      }
    }
    const uniqueCities = [...new Set(foundCities)];

    // Şehir sıralaması: "X'den/X'dan" → X=kalkış, "Y'ye/Y'a" → Y=varış
    if (uniqueCities.length >= 2) {
      const fromIdx = msgLower.search(/(\w+)\w*['’]*(?:dan|den|ten|tan|nden|ndan)\b/);
      const toIdx = msgLower.search(/(\w+)\w*['’]*(?:ya|ye|a|e)\b(?!\w*(?:dan|den))/);

      let origin = uniqueCities[0], dest = uniqueCities[1];
      if (fromIdx >= 0 && toIdx >= 0 && fromIdx < toIdx) {
        const originCity = uniqueCities.find(c => turkishToAscii(c) === msgLower.slice(fromIdx, fromIdx + turkishToAscii(c).length).replace(/['’].*/, ''));
        const destCity = uniqueCities.find(c => c !== originCity);
        if (originCity) origin = originCity;
        if (destCity) dest = destCity;
      }
      // "X'den Y'ye" pattern: ilk şehir kalkış
      const fromPattern = new RegExp(`(${uniqueCities.map(c => turkishToAscii(c)).join('|')})\\w*['\\u2019]*(?:dan|den|ten|tan)`, 'i');
      const fromMatch = msgLower.match(fromPattern);
      if (fromMatch) {
        const matchedCity = uniqueCities.find(c => turkishToAscii(c) === fromMatch[1]);
        if (matchedCity) { origin = matchedCity; dest = uniqueCities.find(c => c !== matchedCity) || dest; }
      }
      extracted.originCity = origin;
      extracted.destCity = dest;
    } else if (uniqueCities.length === 1) {
      extracted.originCity = uniqueCities[0];
      const afterFrom = msgLower.split(/['’](?:dan|den|ten|tan)\s+/i);
      if (afterFrom.length > 1) {
        for (const city of CITIES) {
          if (afterFrom[1].includes(turkishToAscii(city))) {
            extracted.destCity = city;
            break;
          }
        }
      }
    }

    // ===== TITLE: "27 ton ham demir" → "27 Ton ham demir" =====
    const titleMatch = msg.match(/(\d+\.?\d*)\s*ton\s+(.+?)(?:\s*(?:\.|$|yükü|var|vardır|olup|fiyat|ton fiyat|bugün|yarın|\d+\s*saat|irtibat|teslim))/i);
    if (titleMatch) {
      extracted.title = `${titleMatch[1]} Ton ${titleMatch[2].trim()}`;
    } else {
      const simpleMatch = msg.match(/(\d+\.?\d*)\s*ton\s+(.{3,40}?)(?:\s*\.|\s*$)/i);
      if (simpleMatch) extracted.title = `${simpleMatch[1]} Ton ${simpleMatch[2].trim()}`;
    }

    // ===== WEIGHT: "27 ton" → 27000 kg =====
    const weightMatch = msg.match(/(\d+\.?\d*)\s*(?:ton|kg|kilogram)/i);
    if (weightMatch) {
      const val = parseFloat(weightMatch[1]);
      extracted.weight = (msgLower.includes('kg') || msgLower.includes('kilogram')) ? val : Math.round(val * 1000);
    }

    // ===== WEIGHT =====
    const weightMatch = msg.match(/(\d+\.?\d*)\s*(?:ton|kg|kilogram)/i);
    if (weightMatch) {
      const val = parseFloat(weightMatch[1]);
      extracted.weight = msgAscii.includes('kg') || msgAscii.includes('kilogram') ? val : val * 1000;
    }

    // ===== PRICE: "ton fiyatı 750", "750 + kdv", "750 TL" =====
    const tonPriceMatch = msg.match(/(?:ton\s*fiyat[ıi]|fiyat[ıi]?)\s*:?\s*(\d+\.?\d*)/i);
    const normalPriceMatch = msg.match(/(\d+\.?\d*)\s*(?:\+?\s*kdv|\s*TL|\s*₺|\s*lira)/i);
    if (tonPriceMatch) extracted.price = parseFloat(tonPriceMatch[1]);
    else if (normalPriceMatch) extracted.price = parseFloat(normalPriceMatch[1]);

    // "750 + kdv" → price is 750 + 20% KDV = 900 (KDV dahil)
    if (extracted.price && /\+\s*kdv/i.test(msg)) {
      const kdvRateMatch = msg.match(/%\s*(\d+)\s*kdv/i);
      const kdvRate = kdvRateMatch ? parseInt(kdvRateMatch[1]) / 100 : 0.20;
      extracted.price = Math.round(extracted.price * (1 + kdvRate));
    }

    // ===== VEHICLE TYPE =====
    const vehicleKeywords: Record<string, string> = {
      'tır': 'Çekici (TIR)', 'çekici': 'Çekici (TIR)',
      'kamyon': 'Kamyon', 'kamyonet': 'Kamyonet',
      'panelvan': 'Panelvan', 'frigorifik': 'Frigorifik Araç',
      'tanker': 'Tanker Çekici', 'minivan': 'Minivan',
      'pickup': 'Pickup', 'kirkayak': 'Kırkayak Kamyon',
      'lowbed': 'Lowbed Çekici',
    };
    for (const [key, label] of Object.entries(vehicleKeywords)) {
      if (msgAscii.includes(key)) {
        extracted.vehicleType = label;
        break;
      }
    }

    // ===== CONTACT: "irtibat: Kazım KARTAL tel:05057945405" =====
    const contactMatch = msg.match(/(?:teslim\s*alacak|irtibat|al[ıi]c[ıi]|yetkili|sorumlu)\s*(?:ki[şs]i)?\s*:?\s*([a-zA-ZçÇğĞıİöÖşŞüÜ\s]{3,35}?)\s*(?:tel|telefon|no|numara)?\s*:?\s*(\d[\d\s-]{8,15})/i);
    if (contactMatch) {
      extracted.contactName = contactMatch[1].trim();
      extracted.contactPhone = contactMatch[2].replace(/[\s-]/g, '');
    }
    if (!extracted.contactPhone) {
      const phoneMatch = msg.match(/(05\d{2})[\s-]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/);
      if (phoneMatch) {
        extracted.contactPhone = phoneMatch[0].replace(/[\s-]/g, '');
        const beforePhone = msg.slice(0, msg.indexOf(phoneMatch[0])).trim().split(/\s+/);
        if (beforePhone.length >= 2) {
          extracted.contactName = beforePhone.slice(-2).join(' ').replace(/[,.:;]/g, '');
        }
      }
    }

    // ===== DATE/TIME =====
    const now = new Date();
    if (/bugün|bugun/i.test(msg)) {
      extracted.pickupDate = now.toISOString().slice(0, 10);
    } else if (/yar[ıi]n/i.test(msg)) {
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      extracted.pickupDate = tomorrow.toISOString().slice(0, 10);
    }
    // Saat: "saat 14:00'dan sonra" → pickupTime
    const timeMatch = msg.match(/saat\s*:?\s*(\d{1,2})[.:](\d{2})/i);
    if (timeMatch) extracted.pickupTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

    // "X saat içinde/içerisinde teslim" → deliveryDate
    const hoursMatch = msg.match(/(\d{1,4})\s*saat\s*i[çc](?:inde|erisinde)\s*(?:teslim|var[ıi]ş)/i);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      const delivery = new Date(now.getTime() + hours * 60 * 60 * 1000);
      extracted.deliveryDate = delivery.toISOString().slice(0, 10);
    }
    // "X gün içinde/içerisinde teslim"
    const daysMatch = msg.match(/(\d{1,3})\s*g[üu]n\s*i[çc](?:inde|erisinde)/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const delivery = new Date(now.getTime() + days * 86400000);
      extracted.deliveryDate = delivery.toISOString().slice(0, 10);
    }
    // DD.MM.YYYY format
    const dateMatch = msg.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
    if (dateMatch) {
      extracted.pickupDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // ===== ADDRESS EXTRACTION =====
    const addrMatch = msg.match(/(?:adres|adresi|konum|yer)\s*:?\s*(.{5,60}?)(?:\s*(?:\.|$|tel|telefon|irtibat|al[ıi]c[ıi]))/i);
    if (addrMatch) {
      const addr = addrMatch[1].trim();
      if (addr.length > 5 && !/^\d+$/.test(addr)) {
        // İlk şehre ait adres → kalkış adresi
        if (extracted.originCity && !extracted.originAddress) extracted.originAddress = addr;
        else if (extracted.destCity && !extracted.destAddress) extracted.destAddress = addr;
      }
    }

    // ===== LOAD TYPE DETERMINATION =====
    if (extracted.weight) {
      const w = Number(extracted.weight);
      if (w >= 20000) extracted.loadType = 'tam_yuk';
      else if (w < 20000 && w > 0) extracted.loadType = 'kismi_yuk';
    }

    // ===== AUTO TITLE =====
    if (!extracted.title && extracted.originCity && extracted.destCity) {
      extracted.title = `${extracted.originCity}'dan ${extracted.destCity}'e`;
      if (extracted.weight) extracted.title += ` ${Number(extracted.weight).toLocaleString('tr-TR')} kg`;
    }

    const fieldCount = Object.keys(extracted).length;

    if (fieldCount >= 2) {
      return {
        success: true,
        extracted,
        response: `Anladım! ${fieldCount} alan otomatik dolduruldu. ${this.describeExtracted(extracted)} Devam etmek ister misiniz?`,
      };
    }

    return {
      success: false,
      extracted,
      response: fieldCount > 0
        ? `Bazı bilgileri aldım ama yeterli değil. ${this.describeExtracted(extracted)} Lütfen kalkış noktası, varış noktası ve diğer detayları da belirtin.`
        : 'Üzgünüm, mesajınızdan yeterli bilgi çıkaramadım. Lütfen kalkış ve varış şehirlerini belirterek tekrar deneyin. Örnek: "İstanbul\'dan Ankara\'ya 5 ton un"',
    };
  }

  private describeExtracted(extracted: Record<string, any>): string {
    const parts: string[] = [];
    if (extracted.title) parts.push(`Başlık: "${extracted.title}"`);
    if (extracted.originCity && extracted.destCity) parts.push(`Rota: ${extracted.originCity} → ${extracted.destCity}`);
    if (extracted.weight) parts.push(`Ağırlık: ${extracted.weight}`);
    if (extracted.price) parts.push(`Fiyat: ${extracted.price} ₺`);
    if (extracted.vehicleType) parts.push(`Araç: ${extracted.vehicleType}`);
    return parts.join('. ') + '.';
  }
}
