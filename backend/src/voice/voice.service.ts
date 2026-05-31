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

  // Process an AI dialog message — detects intent and delegates to specialized parser
  parseAiDialogMessage(message: string): { success: boolean; intent: string; action?: string; params?: Record<string, any>; extracted: Record<string, any>; response: string } {
    const extracted: Record<string, any> = {};
    const msg = (message || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/İ/gi, 'i').replace(/I/gi, 'i')
      .normalize('NFC');
    const msgLower = this.turkishToAscii(msg);

    // ── Intent Detection ──────────────────────────────
    const intent = this.detectIntent(msg, msgLower);
    extracted._intent = intent;

    if (intent === 'CREATE_EXPENSE') return this.parseExpense(msg, msgLower, extracted);
    if (intent === 'LOG_FUEL') return this.parseFuelLog(msg, msgLower, extracted);
    if (intent === 'SEARCH_LOADS') return this.parseLoadSearch(msg, msgLower, extracted);
    if (intent === 'SEARCH_MARKETPLACE') return this.parseMarketplaceSearch(msg, msgLower, extracted);
    if (intent === 'NAVIGATE') return this.parseNavigation(msg, msgLower, extracted);
    // Default: CREATE_LOAD
    return this.parseLoadCreation(msg, msgLower, extracted);
  }

  private turkishToAscii(s: string): string {
    return s.replace(/[İI]/gi, 'i').replace(/[ĞÜŞÖÇığüşöç]/g, c => ({ 'Ğ':'g','Ü':'u','Ş':'s','Ö':'o','Ç':'c','ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c' }[c] || c)).toLowerCase();
  }

  private detectIntent(msg: string, msgLower: string): string {
    // Expense/fuel patterns
    if (/(?:gider|harcama|masraf)\s+(?:olarak\s+)?(?:yaz|kaydet|ekle)/i.test(msg)) return 'CREATE_EXPENSE';
    if (/(?:mazot|motorin|yak[ıi]t|benzin|LPG)\s+(?:ald[ıi]m|al[ıi]nd[ıi]|doldurdum)/i.test(msg)) return 'LOG_FUEL';
    if (/(?:gider|harcama)\s+(?:yaz|kaydet)/i.test(msg)) return 'CREATE_EXPENSE';

    // Search patterns
    if (/(?:en\s+yak[ıi]n|yak[ıi]n[ıi]mdaki|etraf[ıi]mdaki|çevredeki)\s+y[üu]k/i.test(msg)) return 'SEARCH_LOADS';
    if (/(?:y[üu]k\s+ara|y[üu]k\s+bul|y[üu]kleri\s+(?:s[ıi]rala|g[oö]ster|listele))/i.test(msg)) return 'SEARCH_LOADS';
    if (/(?:ara[çc]|kamyon|t[ıi]r|araç)\s+(?:ar[ıi]yorum|bak[ıi]yorum|bul)/i.test(msg)) return 'SEARCH_MARKETPLACE';
    if (/(\d+)\s*(?:milyon|milyar|bin|TL|₺)\s*(?:luk|tl|alt[ıi]|üst[üu]).*(?:ara[çc]|kamyon|t[ıi]r)/i.test(msg)) return 'SEARCH_MARKETPLACE';
    if (/(?:ilan|sat[ıi]l[ıi]k|ikinci\s*el).*(?:ara[çc]|kamyon|t[ıi]r)/i.test(msg)) return 'SEARCH_MARKETPLACE';

    // Navigation patterns
    if (/(?:git|a[çc]|g[oö]ster|g[oö]r[üu]nt[üu]le)\s+(?:ana\s*sayfa|profili|finans|c[üu]zdan|ayarlar|harita)/i.test(msg)) return 'NAVIGATE';

    // Default: load creation (has ton/kg + city pattern or explicit "yük ekle")
    if (/(?:y[üu]k\s*(?:ekle|olu[şs]tur|ver|a[çc])|y[üu]k[üu]m\s*var)/i.test(msg)) return 'CREATE_LOAD';
    if (/(\d+)\s*(?:ton|kg|kilogram)/i.test(msg) && /(?:'|’)(?:dan|den|a|e|ya|ye)/i.test(msg)) return 'CREATE_LOAD';

    return 'CREATE_LOAD'; // fallback
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: CREATE_LOAD
  // ═══════════════════════════════════════════════════════════
  private parseLoadCreation(msg: string, msgLower: string, extracted: Record<string, any>): any {
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
      if (msgLower.includes(key)) {
        extracted.vehicleType = label;
        break;
      }
    }

    // ===== CONTACT: telefonu bul, hemen oncesindeki ismi cikar =====
    const phoneMatch = msg.match(/(05\d{2})[\s-]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/);
    if (phoneMatch) {
      extracted.contactPhone = phoneMatch[0].replace(/[\s-]/g, '');
      // Telefon oncesini al
      const beforePhone = msg.slice(0, msg.indexOf(phoneMatch[0]));
      // Etiket kelimelerini (irtibat, tel, telefon, no, numara) sondan temizle
      const skipWords = /^(irtibat|tel|telefon|no|numara|kişi|kisi|kurulacak|teslim|alacak|alici|alıcı)$/i;
      const words = beforePhone.split(/[\s.,:;]+/).filter(w => w.length > 0);
      // Sondan baslayarak etiketleri atla
      let endIdx = words.length;
      while (endIdx > 0 && skipWords.test(words[endIdx - 1])) endIdx--;
      // Sondaki 2-3 kelimeyi isim olarak al, basindaki etiketleri temizle
      const startIdx = Math.max(0, endIdx - 3);
      let nameWords = words.slice(startIdx, endIdx);
      while (nameWords.length > 1 && skipWords.test(nameWords[0])) nameWords = nameWords.slice(1);
      extracted.contactName = nameWords.join(' ').replace(/[.,:;]/g, '').trim();
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
        success: true, intent: 'CREATE_LOAD', action: 'FILL_LOAD_FORM',
        extracted,
        response: `Anladım! ${fieldCount} alan otomatik dolduruldu. ${this.describeExtracted(extracted)} Devam etmek ister misiniz?`,
      };
    }

    return {
      success: false, intent: 'CREATE_LOAD',
      extracted,
      response: fieldCount > 0
        ? `Bazı bilgileri aldım ama yeterli değil. ${this.describeExtracted(extracted)} Lütfen kalkış noktası, varış noktası ve diğer detayları da belirtin.`
        : 'Üzgünüm, mesajınızdan yeterli bilgi çıkaramadım. Lütfen kalkış ve varış şehirlerini belirterek tekrar deneyin. Örnek: "İstanbul\'dan Ankara\'ya 5 ton un"',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: CREATE_EXPENSE
  // ═══════════════════════════════════════════════════════════
  private parseExpense(msg: string, msgLower: string, extracted: Record<string, any>): any {
    // Amount
    const amountMatch = msg.match(/(\d+\.?\d*)\s*(?:TL|₺|lira|tl)/i);
    if (amountMatch) extracted.amount = parseFloat(amountMatch[1]);
    // Category
    if (/mazot|motorin|yak[ıi]t|benzin|LPG|akaryak[ıi]t/i.test(msg)) extracted.category = 'Akaryakıt';
    else if (/yemek|lokanta|restoran|mutfak/i.test(msg)) extracted.category = 'Yemek';
    else if (/tamir|bak[ıi]m|lastik|servis/i.test(msg)) extracted.category = 'Araç Bakım';
    else if (/k[ıi]rtasiye|ofis|b[üu]ro/i.test(msg)) extracted.category = 'Ofis';
    else if (/personel|maa[şs]|çal[ıi][şs]an/i.test(msg)) extracted.category = 'Personel';
    else extracted.category = 'Genel Gider';
    // Description
    const descMatch = msg.match(/(?:gider|harcama|masraf)\s*(?:olarak\s+)?(?:yaz|kaydet|ekle)\s*:?\s*(.+)/i);
    if (descMatch) extracted.description = descMatch[1].trim();
    else extracted.description = `${extracted.category} gideri`;
    // Date
    if (/bugün|bugun/i.test(msg)) extracted.date = new Date().toISOString().slice(0, 10);

    extracted.title = extracted.description || `${extracted.category} - ${extracted.amount || 0} ₺`;

    const hasData = extracted.amount || extracted.category;
    return {
      success: hasData, intent: 'CREATE_EXPENSE', action: 'OPEN_EXPENSE_FORM',
      params: { amount: extracted.amount, category: extracted.category, description: extracted.description, date: extracted.date },
      extracted,
      response: hasData
        ? `${extracted.amount ? extracted.amount + ' ₺ ' : ''}${extracted.category} gideri kaydediliyor. Onaylıyor musunuz?`
        : 'Gider bilgisi anlaşılamadı. Örnek: "500 TL yemek gideri yaz"',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: LOG_FUEL
  // ═══════════════════════════════════════════════════════════
  private parseFuelLog(msg: string, msgLower: string, extracted: Record<string, any>): any {
    // Station
    const brandMatch = msg.match(/(OPET|Shell|BP|Total|Petrol Ofisi|Aytemiz|Lukoil|GO|Alpet)/i);
    if (brandMatch) extracted.station = brandMatch[1];
    // Liters
    const literMatch = msg.match(/(\d+\.?\d*)\s*(?:litre|lt|l)/i);
    if (literMatch) extracted.liters = parseFloat(literMatch[1]);
    // Price per liter
    const priceMatch = msg.match(/(?:litre\s*fiyat[ıi]|fiyat[ıi]?)\s*:?\s*(\d+\.?\d*)/i);
    if (priceMatch) extracted.pricePerLiter = parseFloat(priceMatch[1]);
    // Total
    if (extracted.liters && extracted.pricePerLiter) {
      extracted.totalAmount = Math.round(extracted.liters * extracted.pricePerLiter);
    }
    // Date
    if (/bugün|bugun/i.test(msg)) extracted.date = new Date().toISOString().slice(0, 10);

    const hasData = extracted.liters || extracted.station;
    return {
      success: hasData, intent: 'LOG_FUEL', action: 'OPEN_EXPENSE_FORM',
      params: {
        amount: extracted.totalAmount || (extracted.liters * (extracted.pricePerLiter || 0)),
        category: 'Akaryakıt',
        description: `${extracted.station || 'Akaryakıt'} - ${extracted.liters || '?'} lt${extracted.pricePerLiter ? ' x ' + extracted.pricePerLiter + ' ₺/lt' : ''}`,
        date: extracted.date,
      },
      extracted,
      response: hasData
        ? `${extracted.station || ''} ${extracted.liters} litre${extracted.pricePerLiter ? ' x ' + extracted.pricePerLiter + ' ₺' : ''}${extracted.totalAmount ? ' = ' + extracted.totalAmount + ' ₺' : ''} yakıt gideri kaydediliyor.`
        : 'Yakıt bilgisi anlaşılamadı. Örnek: "OPET den 350 litre mazot aldım litre fiyatı 20 TL"',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: SEARCH_LOADS
  // ═══════════════════════════════════════════════════════════
  private parseLoadSearch(msg: string, msgLower: string, extracted: Record<string, any>): any {
    // City filter
    const CITIES = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana','Mersin','Gaziantep','Kayseri','Samsun','Trabzon','Diyarbakır','Eskişehir','Kocaeli'];
    for (const city of CITIES) {
      if (msgLower.includes(this.turkishToAscii(city))) { extracted.city = city; break; }
    }
    // Tonnage filter
    const tonMatch = msg.match(/(\d+)\s*ton/i);
    if (tonMatch) extracted.minTonnage = parseInt(tonMatch[1]);
    // Radius
    const kmMatch = msg.match(/(\d+)\s*km/i);
    if (kmMatch) extracted.radiusKm = parseInt(kmMatch[1]);
    // Escrow
    if (/escrow|g[üu]venli\s*[oö]deme/i.test(msg)) extracted.escrow = true;
    // Sort
    extracted.sortBy = 'pickupDate';
    extracted.action = 'SEARCH_LOADS';
    if (/yak[ıi]n|en\s*yak[ıi]n/i.test(msg)) { extracted.sortBy = 'distance'; extracted.action = 'FILTER_NEARBY'; }

    const parts: string[] = [];
    if (extracted.city) parts.push(`${extracted.city} bölgesinde`);
    if (extracted.minTonnage) parts.push(`${extracted.minTonnage} ton`);
    if (extracted.escrow) parts.push('escrow garantili');
    const desc = parts.join(' ') || 'tüm';

    return {
      success: true, intent: 'SEARCH_LOADS', action: extracted.action,
      params: { city: extracted.city, minTonnage: extracted.minTonnage, radiusKm: extracted.radiusKm, escrow: extracted.escrow, sortBy: extracted.sortBy },
      extracted,
      response: `${desc} yükler listeleniyor.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: SEARCH_MARKETPLACE
  // ═══════════════════════════════════════════════════════════
  private parseMarketplaceSearch(msg: string, msgLower: string, extracted: Record<string, any>): any {
    // Vehicle type
    if (/t[ıi]r|çekici|kamyon/i.test(msg)) extracted.vehicleType = 'Çekici (TIR)';
    else if (/kamyonet|panelvan/i.test(msg)) extracted.vehicleType = 'Kamyonet';
    else if (/binek|otomobil|araba/i.test(msg)) extracted.vehicleType = 'Otomobil';
    else extracted.vehicleType = 'Tümü';
    // Price filter
    const priceMatch = msg.match(/(\d+)\s*(?:milyon|M)/i);
    if (priceMatch) {
      extracted.maxPrice = parseInt(priceMatch[1]) * 1000000;
    } else {
      const tlMatch = msg.match(/(\d+)\s*(?:bin|B)\s*TL/i);
      if (tlMatch) extracted.maxPrice = parseInt(tlMatch[1]) * 1000;
    }
    // City
    const CITIES = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana'];
    for (const city of CITIES) {
      if (msgLower.includes(this.turkishToAscii(city))) { extracted.city = city; break; }
    }

    const parts: string[] = [];
    if (extracted.vehicleType) parts.push(extracted.vehicleType);
    if (extracted.maxPrice) parts.push(`${(extracted.maxPrice).toLocaleString('tr-TR')} ₺ altı`);
    if (extracted.city) parts.push(`${extracted.city}'de`);

    return {
      success: true, intent: 'SEARCH_MARKETPLACE', action: 'SEARCH_MARKETPLACE',
      params: { vehicleType: extracted.vehicleType, maxPrice: extracted.maxPrice, city: extracted.city },
      extracted,
      response: `${parts.join(' ') || 'Tüm'} araç ilanları listeleniyor.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: NAVIGATE
  // ═══════════════════════════════════════════════════════════
  private parseNavigation(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const routes: Record<string, { screen: string; label: string }> = {
      'ana sayfa|anasayfa|home|ana ekran': { screen: 'MainTabs', label: 'Ana Sayfa' },
      'profil|hesab[ıi]m|bilgilerim|profilim': { screen: 'CarrierProfile', label: 'Profil' },
      'finans|gelir.*gider|muhasebe': { screen: 'Finance', label: 'Finans' },
      'c[üu]zdan|bakiye|param': { screen: 'Wallet', label: 'Cüzdan' },
      'ayarlar|settings': { screen: 'SystemSettings', label: 'Ayarlar' },
      'harita|map': { screen: 'RoutePlanner', label: 'Harita' },
      'y[üu]klerim|takip': { screen: 'LoadTracking', label: 'Yüklerim' },
      'teklif|tekliflerim': { screen: 'MyBids', label: 'Tekliflerim' },
      'lokanta|restoran|yemek': { screen: 'Restaurants', label: 'Restoranlar' },
      'akaryak[ıi]t|benzinlik|yak[ıi]t': { screen: 'FuelStations', label: 'Akaryakıt' },
    };
    for (const [pattern, route] of Object.entries(routes)) {
      if (new RegExp(pattern, 'i').test(msg)) {
        extracted.screen = route.screen;
        extracted.label = route.label;
        break;
      }
    }
    return {
      success: true, intent: 'NAVIGATE', action: 'NAVIGATE',
      params: { screen: extracted.screen || 'MainTabs' },
      extracted,
      response: extracted.label ? `${extracted.label} sayfasına yönlendiriliyorsunuz.` : 'Ana sayfaya yönlendiriliyorsunuz.',
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
