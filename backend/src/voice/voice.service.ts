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
    // Encoding fix: HTTP'de İ→i̇(I+combining dot) olarak gelebilir, regex ile hepsini yakala
    const msg = (message || '')
      .replace(/İ/gi, 'i').replace(/I/gi, 'i')
      .replace(/i̇/gi, 'i')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .normalize('NFC');

    // ===== TURKISH CITY LIST (81 IL + ASCII fallback) =====
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
    // ASCII fallback: HTTP encoding sorunları için
    const CITY_ASCII: Record<string, string> = {
      'istanbul': 'İstanbul', 'izmir': 'İzmir', 'adana': 'Adana', 'ankara': 'Ankara',
      'bursa': 'Bursa', 'mersin': 'Mersin', 'konya': 'Konya', 'kayseri': 'Kayseri',
      'gaziantep': 'Gaziantep', 'antalya': 'Antalya', 'samsun': 'Samsun', 'trabzon': 'Trabzon',
      'diyarbakir': 'Diyarbakır', 'eskisehir': 'Eskişehir', 'kocaeli': 'Kocaeli',
      'sakarya': 'Sakarya', 'tekirdag': 'Tekirdağ', 'balikesir': 'Balıkesir',
      'manisa': 'Manisa', 'aydin': 'Aydın', 'mugla': 'Muğla', 'denizli': 'Denizli',
      'hatay': 'Hatay', 'malatya': 'Malatya', 'erzurum': 'Erzurum', 'sivas': 'Sivas',
    };

    // ===== CITY EXTRACTION =====
    // Türkçe karakterleri normalize et (hem orijinal hem ASCII)
    const turkishToAscii = (s: string) => {
      return s
        .replace(/İ/g, 'i').replace(/I/g, 'i')
        .replace(/Ğ/g, 'g').replace(/Ü/g, 'u')
        .replace(/Ş/g, 's').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
        .replace(/ı/g, 'i').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ö/g, 'o').replace(/ç/g, 'c')
        .toLowerCase();
    };
    const foundCities: string[] = [];
    const msgAscii = turkishToAscii(msg);
    for (const city of CITIES) {
      if (msgAscii.includes(turkishToAscii(city))) {
        foundCities.push(city);
      }
    }
    // ASCII fallback: HTTP encoding'de İstanbul→istanbul olarak gelir
    for (const [asciiName, realName] of Object.entries(CITY_ASCII)) {
      if (msgAscii.includes(asciiName) && !foundCities.includes(realName)) {
        foundCities.push(realName);
      }
    }
    // Şehirleri sırala: "dan/den" eki alan = kalkış, "a/e/ya/ye" eki alan = varış
    const uniqueCities = [...new Set(foundCities)];
    if (uniqueCities.length >= 2) {
      // Hangi şehrin yanında "dan/den" var?
      const origin = uniqueCities.find(c => new RegExp(turkishToAscii(c) + '\\w*[dt][ae]n', 'i').test(msgAscii));
      const dest = uniqueCities.find(c => c !== origin);
      extracted.originCity = origin || uniqueCities[0];
      extracted.destCity = dest || uniqueCities[1];
    } else if (uniqueCities.length === 1) {
      extracted.originCity = uniqueCities[0];
      // Try to find second city after "dan/den/ya/ye/a/e"
      const parts = msg.split(/['’](?:dan|den|ya|ye|a|e)\s+/i);
      if (parts.length > 1) {
        for (const city of CITIES) {
          if (parts[1]?.toLocaleLowerCase('tr').includes(city.toLocaleLowerCase('tr'))) {
            extracted.destCity = city;
            break;
          }
        }
      }
    }

    // ===== TITLE =====
    const titleMatch = msg.match(/(\d+)\s*ton\s+([\wÀ-ɏ]+)/i);
    if (titleMatch) extracted.title = `${titleMatch[1]} Ton ${titleMatch[2]}`;

    // ===== WEIGHT =====
    const weightMatch = msg.match(/(\d+\.?\d*)\s*(?:ton|kg|kilogram)/i);
    if (weightMatch) {
      const val = parseFloat(weightMatch[1]);
      extracted.weight = msgAscii.includes('kg') || msgAscii.includes('kilogram') ? val : val * 1000;
    }

    // ===== PRICE =====
    const priceMatch = msg.match(/(\d+\.?\d*)\s*(?:TL|₺|lira)/i);
    if (priceMatch) extracted.price = parseFloat(priceMatch[1]);

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

    // ===== CONTACT EXTRACTION =====
    // "teslim alacak", "irtibat", "alıcı" → isim + telefon
    const contactMatch = msg.match(/(?:teslim\s*alacak|irtibat|al[ıi]c[ıi])\s*(?:ki[şs]i)?\s*:*\s*([a-zA-ZçÇğĞıİöÖşŞüÜ\s]{3,30})\s*(?:tel|telefon|no|numara)?\s*:?\s*(\d[\d\s-]{8,15})/i);
    if (contactMatch) {
      extracted.contactName = contactMatch[1].trim();
      extracted.contactPhone = contactMatch[2].replace(/[\s-]/g, '');
    }

    // Alternatif: direkt "isim telefon" kalıbı (Kazım Kartal 0505...)
    if (!extracted.contactPhone) {
      const phoneMatch = msg.match(/(05\d{2})\s*(\d{3})\s*(\d{2})\s*(\d{2})/);
      if (phoneMatch) {
        extracted.contactPhone = phoneMatch[0].replace(/\s/g, '');
        // Telefon öncesindeki 2-3 kelimeyi isim olarak al
        const beforePhone = msg.slice(0, msg.indexOf(phoneMatch[0])).trim().split(/\s+/);
        if (beforePhone.length >= 2) {
          extracted.contactName = beforePhone.slice(-2).join(' ');
        }
      }
    }

    // ===== DATE/TIME EXTRACTION =====
    const now = new Date();
    if (/bugün|bugun/i.test(msg)) {
      extracted.pickupDate = now.toISOString().slice(0, 10);
    } else if (/yar[ıi]n/i.test(msg)) {
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      extracted.pickupDate = tomorrow.toISOString().slice(0, 10);
    } else if (/(\d{1,2})\s*saat\s*i[çc]inde/i.test(msg)) {
      const match = msg.match(/(\d{1,2})\s*saat\s*i[çc]inde/i);
      const hours = parseInt(match![1]);
      const delivery = new Date(now.getTime() + hours * 60 * 60 * 1000);
      extracted.deliveryDate = delivery.toISOString().slice(0, 10);
    } else if (/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/.test(msg)) {
      const match = msg.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
      extracted.pickupDate = `${match![3]}-${match![2]}-${match![1]}`;
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
