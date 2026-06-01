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

  // Process an AI dialog message
  parseAiDialogMessage(message: string, context?: Record<string, any>): any {
    const extracted: Record<string, any> = {};
    const msg = (message || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/İ/gi, 'i').replace(/I/gi, 'i')
      .normalize('NFC');
    const msgLower = this.turkishToAscii(msg);

    // Multi-step: devam eden konusma varsa
    if (context?.conversationState === 'CREATING_LOAD_STEP') return this.handleLoadCreationStep(msg, msgLower, context);
    if (context?.conversationState === 'CREATING_EXPENSE_STEP') return this.handleExpenseStep(msg, msgLower, context);
    if (context?.conversationState === 'REGISTRATION') return this.handleRegistrationStep(msg, msgLower, context);

    // ── Intent Detection ──────────────────────────────
    const intent = this.detectIntent(msg, msgLower);
    extracted._intent = intent;

    // Cancel / help / repeat
    if (intent === 'CANCEL') return { success: true, intent, action: 'CANCEL', extracted, response: 'İşlem iptal edildi. Başka bir isteğiniz var mı?' };
    if (intent === 'HELP') return this.getHelpResponse();
    if (intent === 'REPEAT') return { success: true, intent, action: 'REPEAT', extracted, response: 'Son söylediğinizi tekrar ediyorum. Lütfen dinleyin.' };

    if (intent === 'CREATE_INVOICE') return this.parseInvoice(msg, msgLower, extracted);
    if (intent === 'LIST_INVOICES') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'InvoiceList' }, extracted, response: 'Fatura listeniz görüntüleniyor.' };
    if (intent === 'ADD_CUSTOMER') return this.parseCustomer(msg, msgLower, extracted);
    if (intent === 'ADD_ACCOUNTANT') return this.parseAccountant(msg, msgLower, extracted);
    if (intent === 'VIEW_ACCOUNTANT') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'AccountantDashboard' }, extracted, response: 'Muhasebeci bilgileriniz görüntüleniyor.' };
    if (intent === 'CREATE_INCOME') return this.parseIncome(msg, msgLower, extracted);
    if (intent === 'CREATE_EXPENSE') return this.parseExpense(msg, msgLower, extracted);
    if (intent === 'LOG_FUEL') return this.parseFuelLog(msg, msgLower, extracted);
    if (intent === 'VIEW_PROFIT_LOSS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'Finance' }, extracted, response: 'Gelir-gider raporunuz görüntüleniyor.' };
    if (intent === 'CHECK_WALLET') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'Wallet' }, extracted, response: 'Cüzdan bakiyeniz görüntüleniyor.' };
    if (intent === 'SEARCH_LOADS') return this.parseLoadSearch(msg, msgLower, extracted);
    if (intent === 'SEARCH_MARKETPLACE') return this.parseMarketplaceSearch(msg, msgLower, extracted);
    if (intent === 'SEARCH_FUEL_STATIONS') return this.parseFuelStationSearch(msg, msgLower, extracted);
    if (intent === 'SEARCH_RESTAURANTS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'Restaurants' }, extracted, response: 'Restoranlar ve lokantalar görüntüleniyor.' };
    if (intent === 'MAKE_RESERVATION') return this.parseReservation(msg, msgLower, extracted);
    if (intent === 'START_TRACKING') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'LoadTracking' }, extracted, response: 'Canlı takip sayfası açılıyor.' };
    if (intent === 'VIEW_TRACKING') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'LoadTracking' }, extracted, response: 'Takip durumu görüntüleniyor.' };
    if (intent === 'CREATE_VEHICLE') return this.parseVehicle(msg, msgLower, extracted);
    if (intent === 'LIST_VEHICLES') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'MyVehicles' }, extracted, response: 'Araç listeniz görüntüleniyor.' };
    if (intent === 'UPDATE_PROFILE') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'CarrierProfile' }, extracted, response: 'Profil sayfanız açılıyor. Bilgilerinizi buradan güncelleyebilirsiniz.' };
    if (intent === 'CHECK_PROFILE_STATUS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'CarrierProfile' }, extracted, response: 'Profil durumunuz görüntüleniyor.' };
    if (intent === 'DELETE_ENTITY') return this.parseDelete(msg, msgLower, extracted);
    if (intent === 'NAVIGATE') return this.parseNavigation(msg, msgLower, extracted);
    if (intent === 'SHOW_MY_BIDS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'MyBids' }, extracted, response: 'Teklifleriniz görüntüleniyor.' };
    if (intent === 'SHOW_MY_LOADS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'LoadTracking' }, extracted, response: 'Yükleriniz görüntüleniyor.' };
    if (intent === 'SHOW_DOCUMENTS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'InvoiceList' }, extracted, response: 'Evraklarınız görüntüleniyor.' };
    if (intent === 'CHECK_NOTIFICATIONS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'Notifications' }, extracted, response: 'Bildirimleriniz görüntüleniyor.' };
    if (intent === 'FIND_RETURN_LOADS') return this.parseReturnLoads(msg, msgLower, extracted);
    if (intent === 'CALCULATE_ROUTE') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'RoutePlanner' }, extracted, response: 'Rota planlayıcı açılıyor.' };
    if (intent === 'CHECK_LOAD_STATUS') return this.parseLoadStatus(msg, msgLower, extracted);
    if (intent === 'SHOW_DRIVER_DASHBOARD') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'DriverDashboard' }, extracted, response: 'Sürücü paneli açılıyor.' };
    if (intent === 'PART_MARKET_SEARCH') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'PartMarketHome' }, extracted, response: 'Yedek parça pazarı açılıyor.' };
    if (intent === 'CHECK_ESCROW_STATUS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'Wallet' }, extracted, response: 'Escrow ve cüzdan durumunuz görüntüleniyor.' };
    if (intent === 'SHOW_ANALYTICS') return { success: true, intent, action: 'NAVIGATE', params: { screen: 'AnalyticsDashboard' }, extracted, response: 'Analitik dashboard açılıyor.' };
    return this.parseLoadCreation(msg, msgLower, extracted);
  }

  private turkishToAscii(s: string): string {
    return s.replace(/[İI]/gi, 'i').replace(/[ĞÜŞÖÇığüşöç]/g, c => ({ 'Ğ':'g','Ü':'u','Ş':'s','Ö':'o','Ç':'c','ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c' }[c] || c)).toLowerCase();
  }

  private detectIntent(msg: string, msgLower: string): string {
    // Cancel (sadece "iptal" / "vazgeç" tek başına veya cümle başında — fatura iptal ile karışmasın)
    if (/^(?:iptal|vazge[çc]|bırak|bo[şs]ver)\b/i.test(msg.trim())) return 'CANCEL';
    if (/(?:i[şs]lemi\s*iptal|konu[şs]may[ıi]\s*iptal|sohbeti\s*iptal)/i.test(msg)) return 'CANCEL';
    if (/(?:yardım|yardim|neler\s*yapabilirsin|neler\s*yapabilirim|komutlar|yard[ıi]mc[ıi]\s*ol|destek)/i.test(msg)) return 'HELP';
    if (/(?:tekrar|tekrarla|anlamad[ıi]m|bir\s*daha|yinele)/i.test(msg)) return 'REPEAT';
    // E-Belge / Invoice
    if (/(?:e-fatura|fatura|e-irsaliye|irsaliye)\s+(?:olu[şs]tur|kes|yaz|d[üu]zenle)/i.test(msg)) return 'CREATE_INVOICE';
    if (/(?:fatura|irsaliye)\s+(?:listele|g[oö]ster|durum)/i.test(msg)) return 'LIST_INVOICES';
    // Customer
    if (/(?:m[üu][şs]teri|cari)\s+(?:ekle|olu[şs]tur|kaydet)/i.test(msg)) return 'ADD_CUSTOMER';
    // Accountant
    if (/(?:muhasebeci|mali\s*m[üu][şs]avir)\s+(?:ekle|tan[ıi]mla|kaydet)/i.test(msg)) return 'ADD_ACCOUNTANT';
    if (/(?:muhasebeci|mali\s*m[üu][şs]avir).*(?:g[oö]r[üu]nt[üu]le|bilgi|g[oö]ster)/i.test(msg)) return 'VIEW_ACCOUNTANT';
    // Income
    if (/(?:gelir|tahsilat|kazan[çc])\s+(?:yaz|kaydet|ekle)/i.test(msg)) return 'CREATE_INCOME';
    if (/(?:para\s*geldi|[oö]deme\s*ald[ıi]m)/i.test(msg)) return 'CREATE_INCOME';
    // Expense/fuel
    if (/(?:gider|harcama|masraf)\s+(?:olarak\s+)?(?:yaz|kaydet|ekle)/i.test(msg)) return 'CREATE_EXPENSE';
    if (/(?:mazot|motorin|yak[ıi]t|benzin|LPG)\s+(?:ald[ıi]m|al[ıi]nd[ıi]|doldurdum)/i.test(msg)) return 'LOG_FUEL';
    if (/(?:gider|harcama)\s+(?:yaz|kaydet)/i.test(msg)) return 'CREATE_EXPENSE';
    if (/(?:gelir.*gider|gelir-gider|kar.*zarar|bilan[çc]o)/i.test(msg)) return 'VIEW_PROFIT_LOSS';
    // Wallet
    if (/(?:c[üu]zdan|bakiye|param|ne\s*kadar\s*para)/i.test(msg)) return 'CHECK_WALLET';
    // Search patterns
    if (/(?:en\s+yak[ıi]n|yak[ıi]n[ıi]mdaki|etraf[ıi]mdaki)\s+y[üu]k/i.test(msg)) return 'SEARCH_LOADS';
    if (/(?:y[üu]k\s+ara|y[üu]k\s+bul|y[üu]kleri\s+(?:s[ıi]rala|g[oö]ster|listele))/i.test(msg)) return 'SEARCH_LOADS';
    if (/(?:ara[çc]|kamyon|t[ıi]r|araç)\s+(?:ar[ıi]yorum|bak[ıi]yorum|bul)/i.test(msg)) return 'SEARCH_MARKETPLACE';
    if (/(\d+)\s*(?:milyon|milyar|bin|TL|₺)\s*(?:luk|tl|alt[ıi]|üst[üu]).*(?:ara[çc]|kamyon|t[ıi]r)/i.test(msg)) return 'SEARCH_MARKETPLACE';
    if (/(?:ilan|sat[ıi]l[ıi]k|ikinci\s*el).*(?:ara[çc]|kamyon|t[ıi]r)/i.test(msg)) return 'SEARCH_MARKETPLACE';
    // Fuel stations
    if (/(?:benzinlik|akaryak[ıi]t|OPET|Shell|BP|yak[ıi]t\s*istasyon)/i.test(msg) && !/(?:ald[ıi]m|doldurdum)/i.test(msg)) return 'SEARCH_FUEL_STATIONS';
    // Restaurants
    if (/(?:lokanta|restoran|yemek|rezervasyon).*(?:ara|bul|g[oö]ster|listele)/i.test(msg)) return 'SEARCH_RESTAURANTS';
    if (/(?:lokanta|restoran).*(?:rezervasyon|yer\s*ay[ıi]rt)/i.test(msg)) return 'MAKE_RESERVATION';
    // Tracking
    if (/(?:canl[ıi]\s*takip|takip\s*ba[şs]lat|y[üu]k[üu]\s*takip\s*et)/i.test(msg)) return 'START_TRACKING';
    if (/(?:takip|konum).*(?:g[oö]ster|durum|nerede)/i.test(msg)) return 'VIEW_TRACKING';
    // Vehicle management
    if (/(?:ara[çc]|kamyon|t[ıi]r|araç)\s+(?:ekle|kaydet|tan[ıi]mla)/i.test(msg)) return 'CREATE_VEHICLE';
    if (/(?:ara[çc]lar[ıi]m|filom|ara[çc]lar[ıi]\s*g[oö]ster)/i.test(msg)) return 'LIST_VEHICLES';
    // Profile
    if (/(?:profil|hesap).*(?:g[üu]ncelle|d[üu]zenle|de[gğ]i[şs]tir)/i.test(msg)) return 'UPDATE_PROFILE';
    if (/(?:profil|hesap).*(?:durum|tamamlanma|eksik)/i.test(msg)) return 'CHECK_PROFILE_STATUS';
    // Delete operations
    if (/(?:sil|kald[ıi]r|iptal\s*et).*(?:y[üu]k|ilan|ara[çc]|gider|gelir)/i.test(msg)) return 'DELETE_ENTITY';
    // Bids
    if (/(?:tekliflerim|tekliflerimi|verdiklerim\s*teklif)/i.test(msg)) return 'SHOW_MY_BIDS';
    // My loads
    if (/(?:y[üu]klerim|y[üu]klerimi|aktif\s*y[üu]klerim)/i.test(msg) && !/(?:ara|bul|s[ıi]rala)/i.test(msg)) return 'SHOW_MY_LOADS';
    // Documents
    if (/(?:evraklar[ıi]m|belgelerim|d[oö]k[üu]manlar[ıi]m|e-belge)/i.test(msg)) return 'SHOW_DOCUMENTS';
    // Notifications
    if (/(?:bildirim|bildirimler|duyuru)/i.test(msg)) return 'CHECK_NOTIFICATIONS';
    // Return loads
    if (/(?:d[oö]n[üu][şs]\s*y[üu]k|geri\s*d[oö]n[üu][şs])/i.test(msg)) return 'FIND_RETURN_LOADS';
    // Route
    if (/(?:rota|yol\s*tarifi|g[üu]zergah|mesafe\s*hesapla)/i.test(msg)) return 'CALCULATE_ROUTE';
    // Load status
    if (/(?:y[üu]k[üu]n\s*durumu|y[üu]k\s*durumu|sipari[şs]\s*durumu)/i.test(msg)) return 'CHECK_LOAD_STATUS';
    if (/(?:ABC|TRK|IST)\d+/i.test(msg) && /durum/i.test(msg)) return 'CHECK_LOAD_STATUS';
    // Driver dashboard
    if (/(?:s[üu]r[üu]c[üu]\s*panel|AETR|s[üu]r[üu][şs]\s*saati|mola|dinlenme)/i.test(msg)) return 'SHOW_DRIVER_DASHBOARD';
    // Part market
    if (/(?:yedek\s*par[çc]a|par[çc]a\s*ara|motor\s*par[çc]as[ıi]|lastik\s*ara)/i.test(msg)) return 'PART_MARKET_SEARCH';
    // Escrow
    if (/(?:escrow|g[üu]venli\s*[oö]deme|emanet|bloke)/i.test(msg)) return 'CHECK_ESCROW_STATUS';
    // Analytics
    if (/(?:analitik|rapor|istatistik|grafik|dashboard)/i.test(msg)) return 'SHOW_ANALYTICS';
    // Navigation (broad match — check last after specific patterns)
    if (/(?:git|a[çc]|g[oö]ster|g[oö]r[üu]nt[üu]le|y[oö]nlendir)\s+(?:ana\s*sayfaya|profil|finans|c[üu]zdan|ayarlar|harita|belge|d[oö]k[üu]man)/i.test(msg)) return 'NAVIGATE';
    if (/(?:ana\s*sayfa|anasayfa|home|ba[şs]lang[ıi][çc])/i.test(msg)) return 'NAVIGATE';
    // Load creation (has ton/kg + city pattern or explicit)
    if (/(?:y[üu]k\s*(?:ekle|olu[şs]tur|ver|a[çc])|y[üu]k[üu]m\s*var)/i.test(msg)) return 'CREATE_LOAD';
    if (/(\d+)\s*(?:ton|kg|kilogram)/i.test(msg) && /(?:'|’)(?:dan|den|a|e|ya|ye)/i.test(msg)) return 'CREATE_LOAD';
    return 'CREATE_LOAD';
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

  // ═══════════════════════════════════════════════════════════
  // Intent: CREATE_INVOICE
  // ═══════════════════════════════════════════════════════════
  private parseInvoice(msg: string, msgLower: string, extracted: Record<string, any>): any {
    // Customer
    const custMatch = msg.match(/(?:m[üu][şs]teri|cari|al[ıi]c[ıi])\s*:?\s*(.+?)(?:\s*(?:i[çc]in|ad[ıi]na|olarak|\.|$))/i);
    if (custMatch) extracted.customerName = custMatch[1].trim();
    // Amount
    const amtMatch = msg.match(/(\d+\.?\d*)\s*(?:TL|₺|lira)/i);
    if (amtMatch) extracted.amount = parseFloat(amtMatch[1]);
    // Type
    if (/irsaliye/i.test(msg)) extracted.invoiceType = 'irsaliye';
    else if (/iade/i.test(msg)) extracted.invoiceType = 'iade';
    else extracted.invoiceType = 'fatura';
    // Description
    const descMatch = msg.match(/(?:a[çc][ıi]klama|not)\s*:?\s*(.+?)(?:\s*\.|\s*$)/i);
    if (descMatch) extracted.description = descMatch[1].trim();
    else extracted.description = `${extracted.invoiceType || 'fatura'} - ${extracted.customerName || 'müşteri'}`;

    const hasData = extracted.amount || extracted.customerName;
    return {
      success: hasData, intent: 'CREATE_INVOICE', action: 'NAVIGATE',
      params: { screen: 'InvoiceCreate', amount: extracted.amount, customer: extracted.customerName, type: extracted.invoiceType, description: extracted.description },
      extracted,
      response: hasData
        ? `${extracted.customerName || 'Müşteri'} için ${extracted.amount ? extracted.amount + ' ₺ ' : ''}${extracted.invoiceType === 'irsaliye' ? 'e-İrsaliye' : 'e-Fatura'} oluşturuluyor.`
        : 'Fatura bilgisi anlaşılamadı. Örnek: "ABC Ltd için 5000 TL e-fatura kes"',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: ADD_CUSTOMER
  // ═══════════════════════════════════════════════════════════
  private parseCustomer(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const nameMatch = msg.match(/(?:m[üu][şs]teri|cari)\s+(?:ekle|olu[şs]tur)\s*:?\s*(.+?)(?:\s*(?:vergi|VKN|TCKN|tel|telefon|\.|$))/i);
    if (nameMatch) extracted.name = nameMatch[1].trim();
    else {
      const simpleMatch = msg.match(/(?:ad[ıi]|isim|unvan)\s*:?\s*(.+?)(?:\s*(?:vergi|VKN|TCKN|tel|\.|$))/i);
      if (simpleMatch) extracted.name = simpleMatch[1].trim();
    }
    const taxMatch = msg.match(/(?:vergi|VKN|TCKN)\s*(?:no|numaras[ıi]|numara)?\s*:?\s*(\d+)/i);
    if (taxMatch) extracted.taxNumber = taxMatch[1];
    const phoneMatch = msg.match(/(?:tel|telefon)\s*(?:no|numaras[ıi]|numara)?\s*:?\s*(\d[\d\s-]{8,15})/i);
    if (phoneMatch) extracted.phone = phoneMatch[1].replace(/[\s-]/g, '');

    return {
      success: !!extracted.name, intent: 'ADD_CUSTOMER', action: 'API_CALL',
      params: { endpoint: '/invoice/customer/frequent', method: 'POST', data: { name: extracted.name, taxNumber: extracted.taxNumber, phone: extracted.phone } },
      extracted,
      response: extracted.name ? `${extracted.name} müşteri olarak ekleniyor.` : 'Müşteri bilgisi anlaşılamadı.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: ADD_ACCOUNTANT
  // ═══════════════════════════════════════════════════════════
  private parseAccountant(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const nameMatch = msg.match(/(?:muhasebeci|mali\s*m[üu][şs]avir)\s+(?:ekle|tan[ıi]mla)\s*:?\s*(.+?)(?:\s*(?:email|e-posta|tel|telefon|\.|$))/i);
    if (nameMatch) extracted.name = nameMatch[1].trim();
    else {
      const snMatch = msg.match(/(?:ad[ıi]|isim)\s*:?\s*(.+?)(?:\s*(?:email|e-posta|tel|\.|$))/i);
      if (snMatch) extracted.name = snMatch[1].trim();
    }
    const emailMatch = msg.match(/(?:email|e-posta)\s*:?\s*([\w.@]+)/i);
    if (emailMatch) extracted.email = emailMatch[1];
    const phoneMatch = msg.match(/(?:tel|telefon)\s*:?\s*(\d[\d\s-]{8,15})/i);
    if (phoneMatch) extracted.phone = phoneMatch[1].replace(/[\s-]/g, '');

    return {
      success: !!extracted.name, intent: 'ADD_ACCOUNTANT', action: 'API_CALL',
      params: { endpoint: '/users/profile', method: 'PUT', data: { accountantName: extracted.name, accountantEmail: extracted.email, accountantPhone: extracted.phone } },
      extracted,
      response: extracted.name ? `${extracted.name} muhasebeci olarak ekleniyor.` : 'Muhasebeci bilgisi anlaşılamadı.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: CREATE_INCOME
  // ═══════════════════════════════════════════════════════════
  private parseIncome(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const amtMatch = msg.match(/(\d+\.?\d*)\s*(?:TL|₺|lira)/i);
    if (amtMatch) extracted.amount = parseFloat(amtMatch[1]);
    if (/nakliye|ta[şs][ıi]ma|y[üu]k/i.test(msg)) extracted.type = 'Nakliye Geliri';
    else if (/kira/i.test(msg)) extracted.type = 'Kira Geliri';
    else if (/sat[ıi][şs]/i.test(msg)) extracted.type = 'Satış';
    else extracted.type = 'Diğer Gelir';
    const descMatch = msg.match(/(?:gelir|tahsilat|kazan[çc]).*(?:a[çc][ıi]klama|not|olarak)\s*:?\s*(.+)/i);
    if (descMatch) extracted.description = descMatch[1].trim();
    else extracted.description = `${extracted.type} - ${extracted.amount || 0} ₺`;

    return {
      success: !!extracted.amount, intent: 'CREATE_INCOME', action: 'API_CALL',
      params: { endpoint: '/finance/incomes', method: 'POST', data: { amount: extracted.amount, type: extracted.type, description: extracted.description } },
      extracted,
      response: extracted.amount ? `${extracted.amount} ₺ ${extracted.type} geliri kaydediliyor.` : 'Gelir bilgisi anlaşılamadı.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: SEARCH_FUEL_STATIONS
  // ═══════════════════════════════════════════════════════════
  private parseFuelStationSearch(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const brands = ['OPET', 'Shell', 'BP', 'Total', 'Petrol Ofisi', 'Aytemiz', 'Lukoil', 'GO', 'Alpet'];
    for (const b of brands) { if (msgLower.includes(b.toLowerCase())) { extracted.brand = b; break; } }
    const CITIES = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana','Mersin','Gaziantep'];
    for (const c of CITIES) { if (msgLower.includes(this.turkishToAscii(c))) { extracted.city = c; break; } }
    return {
      success: true, intent: 'SEARCH_FUEL_STATIONS', action: 'NAVIGATE',
      params: { screen: 'FuelStations', brand: extracted.brand, city: extracted.city },
      extracted,
      response: `${extracted.brand || 'Tüm'} akaryakıt istasyonları ${extracted.city || ''} görüntüleniyor.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: MAKE_RESERVATION
  // ═══════════════════════════════════════════════════════════
  private parseReservation(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const timeMatch = msg.match(/saat\s*(\d{1,2})[.:](\d{2})/i);
    if (timeMatch) extracted.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    const guestsMatch = msg.match(/(\d+)\s*(?:ki[şs]i|ki[şs]ilik)/i);
    if (guestsMatch) extracted.partySize = parseInt(guestsMatch[1]);
    const restMatch = msg.match(/(.+?)(?:restoran| lokanta| lokantas[ıi])/i);
    if (restMatch) extracted.restaurant = restMatch[1].trim();
    if (/bugün|bugun/i.test(msg)) extracted.date = new Date().toISOString().slice(0, 10);
    else if (/yar[ıi]n/i.test(msg)) { const t = new Date(); t.setDate(t.getDate() + 1); extracted.date = t.toISOString().slice(0, 10); }

    return {
      success: true, intent: 'MAKE_RESERVATION', action: 'NAVIGATE',
      params: { screen: 'Restaurants', time: extracted.time, partySize: extracted.partySize, date: extracted.date },
      extracted,
      response: `${extracted.restaurant || 'Restoran'} için ${extracted.date ? extracted.date : ''} ${extracted.time || ''} ${extracted.partySize ? extracted.partySize + ' kişi' : ''} rezervasyon sayfası açılıyor.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: CREATE_VEHICLE
  // ═══════════════════════════════════════════════════════════
  private parseVehicle(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const plateMatch = msg.match(/(\d{2}\s*[A-Z]{1,3}\s*\d{2,4})/i);
    if (plateMatch) extracted.plateNumber = plateMatch[1];
    if (/t[ıi]r|çekici/i.test(msg)) extracted.vehicleType = 'Çekici (TIR)';
    else if (/kamyon/i.test(msg)) extracted.vehicleType = 'Kamyon';
    else if (/kamyonet/i.test(msg)) extracted.vehicleType = 'Kamyonet';
    const tonMatch = msg.match(/(\d+)\s*ton/i);
    if (tonMatch) extracted.tonnageCapacity = parseInt(tonMatch[1]) * 1000;

    return {
      success: !!extracted.plateNumber, intent: 'CREATE_VEHICLE', action: 'NAVIGATE',
      params: { screen: 'VehicleForm', plateNumber: extracted.plateNumber, vehicleType: extracted.vehicleType, tonnageCapacity: extracted.tonnageCapacity },
      extracted,
      response: extracted.plateNumber ? `${extracted.plateNumber} plakalı araç kaydediliyor. Araç formu açılıyor.` : 'Araç bilgisi anlaşılamadı. Örnek: "34 ABC 123 plakalı çekici ekle"',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: DELETE_ENTITY
  // ═══════════════════════════════════════════════════════════
  private parseDelete(msg: string, msgLower: string, extracted: Record<string, any>): any {
    if (/y[üu]k/i.test(msg)) { extracted.entityType = 'load'; extracted.entityLabel = 'Yük'; }
    else if (/ara[çc]|kamyon|t[ıi]r/i.test(msg)) { extracted.entityType = 'vehicle'; extracted.entityLabel = 'Araç'; }
    else if (/gider|harcama/i.test(msg)) { extracted.entityType = 'expense'; extracted.entityLabel = 'Gider'; }
    else if (/gelir/i.test(msg)) { extracted.entityType = 'income'; extracted.entityLabel = 'Gelir'; }
    else if (/ilan/i.test(msg)) { extracted.entityType = 'listing'; extracted.entityLabel = 'İlan'; }
    else { extracted.entityType = 'unknown'; extracted.entityLabel = 'Kayıt'; }
    const idMatch = msg.match(/(?:no|numara|ID|kodu)\s*:?\s*(\w+)/i);
    if (idMatch) extracted.entityId = idMatch[1];

    return {
      success: true, intent: 'DELETE_ENTITY', action: 'CONFIRM_DELETE',
      params: { entityType: extracted.entityType, entityId: extracted.entityId, entityLabel: extracted.entityLabel },
      extracted,
      response: `${extracted.entityLabel} silme işlemi için onay gerekiyor. ${extracted.entityId ? 'ID: ' + extracted.entityId : ''} Silmek istediğinize emin misiniz?`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: FIND_RETURN_LOADS
  // ═══════════════════════════════════════════════════════════
  private parseReturnLoads(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const CITIES = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana','Mersin','Gaziantep'];
    for (const c of CITIES) { if (msgLower.includes(this.turkishToAscii(c))) { extracted.city = c; break; } }
    const kmMatch = msg.match(/(\d+)\s*km/i);
    if (kmMatch) extracted.radiusKm = parseInt(kmMatch[1]);
    return {
      success: true, intent: 'FIND_RETURN_LOADS', action: 'NAVIGATE',
      params: { screen: 'ReturnLoad', city: extracted.city, radiusKm: extracted.radiusKm },
      extracted,
      response: `${extracted.city ? extracted.city + ' bölgesinde' : 'Yakınınızda'} dönüş yükleri aranıyor.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Intent: CHECK_LOAD_STATUS
  // ═══════════════════════════════════════════════════════════
  private parseLoadStatus(msg: string, msgLower: string, extracted: Record<string, any>): any {
    const idMatch = msg.match(/([A-Z]{2,4}[- ]?\d{3,6})/i);
    if (idMatch) extracted.loadId = idMatch[1];
    return {
      success: true, intent: 'CHECK_LOAD_STATUS', action: 'NAVIGATE',
      params: { screen: 'LoadTrackingDetail', loadId: extracted.loadId },
      extracted,
      response: extracted.loadId ? `${extracted.loadId} nolu yükün durumu görüntüleniyor.` : 'Yük takip sayfası açılıyor.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Multi-step conversation: CREATE_LOAD flow
  // ═══════════════════════════════════════════════════════════
  private handleLoadCreationStep(msg: string, msgLower: string, context: Record<string, any>): any {
    const step = context.step || 1;
    const collected = context.collected || {};

    // City extraction (same as parseLoadCreation but incremental)
    const CITIES = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Konya','Adana','Mersin','Gaziantep','Kayseri','Samsun','Trabzon','Diyarbakır','Eskişehir','Kocaeli'];
    for (const city of CITIES) {
      if (msgLower.includes(this.turkishToAscii(city)) && !collected.fromCity) {
        collected.fromCity = city;
        break;
      } else if (msgLower.includes(this.turkishToAscii(city)) && collected.fromCity && city !== collected.fromCity) {
        collected.toCity = city;
        break;
      }
    }
    // Tonnage
    const tonMatch = msg.match(/(\d+)\s*ton/i);
    if (tonMatch) collected.totalTonnage = parseInt(tonMatch[1]) * 1000;
    // Title
    if (tonMatch && !collected.title) {
      const cargoMatch = msg.match(/(\d+)\s*ton\s+(.+?)(?:\s*(?:\.|$|yükü|var))/i);
      if (cargoMatch) collected.title = `${cargoMatch[1]} Ton ${cargoMatch[2].trim()}`;
    }
    // Price
    const priceMatch = msg.match(/(?:ton\s*fiyat[ıi]|fiyat[ıi]?)\s*:?\s*(\d+\.?\d*)/i);
    if (priceMatch) collected.price = parseFloat(priceMatch[1]);
    // Date
    if (/bugün|bugun/i.test(msg)) collected.pickupDate = new Date().toISOString().slice(0, 10);
    else if (/yar[ıi]n/i.test(msg)) { const t = new Date(); t.setDate(t.getDate()+1); collected.pickupDate = t.toISOString().slice(0, 10); }
    // Contact
    const phoneMatch = msg.match(/(05\d{2})[\s-]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/);
    if (phoneMatch) collected.contactPhone = phoneMatch[0].replace(/[\s-]/g, '');

    // Determine what's missing and ask
    const missing: string[] = [];
    if (!collected.fromCity) missing.push('kalkış şehri');
    if (!collected.toCity) missing.push('varış şehri');
    if (!collected.totalTonnage) missing.push('tonaj');
    if (!collected.title) missing.push('yük cinsi');

    if (missing.length > 0) {
      const questions: Record<string, string> = {
        'kalkış şehri': 'Yük hangi şehirden alınacak?',
        'varış şehri': 'Teslimat şehri nedir?',
        'tonaj': 'Yük kaç ton?',
        'yük cinsi': 'Yükün cinsi nedir? (ör: buğday, demir, mobilya)',
      };
      return {
        success: true, intent: 'CREATE_LOAD', action: 'CONTINUE_CONVERSATION',
        conversationState: 'CREATING_LOAD_STEP',
        params: { step: step + 1, collected },
        extracted: collected,
        response: missing.length === 1 ? questions[missing[0]] : `Birkaç bilgiye daha ihtiyacım var: ${missing.join(', ')}. Lütfen belirtir misiniz?`,
      };
    }

    // All info collected — build the load
    const fields: any = {};
    if (collected.fromCity) fields.originCity = collected.fromCity;
    if (collected.toCity) fields.destCity = collected.toCity;
    if (collected.totalTonnage) fields.weight = collected.totalTonnage;
    if (collected.title) fields.title = collected.title;
    if (collected.price) fields.price = collected.price;
    if (collected.pickupDate) fields.pickupDate = collected.pickupDate;
    if (collected.contactPhone) fields.contactPhone = collected.contactPhone;
    if (collected.totalTonnage >= 20000) fields.loadType = 'tam_yuk';

    return {
      success: true, intent: 'CREATE_LOAD', action: 'FILL_LOAD_FORM',
      extracted: { ...collected, ...fields },
      response: `Yük bilgileri hazırlandı: ${collected.fromCity}'dan ${collected.toCity}'e ${collected.totalTonnage ? (collected.totalTonnage/1000) + ' ton' : ''} ${collected.title || ''}. Onaylıyor musunuz?`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Multi-step: CREATE_EXPENSE flow
  // ═══════════════════════════════════════════════════════════
  private handleExpenseStep(msg: string, msgLower: string, context: Record<string, any>): any {
    const collected = context.collected || {};
    const amtMatch = msg.match(/(\d+\.?\d*)\s*(?:TL|₺|lira)/i);
    if (amtMatch) collected.amount = parseFloat(amtMatch[1]);
    if (/yemek|lokanta|restoran/i.test(msg)) collected.category = 'Yemek';
    else if (/mazot|motorin|yak[ıi]t|benzin/i.test(msg)) collected.category = 'Akaryakıt';
    else if (/tamir|bak[ıi]m/i.test(msg)) collected.category = 'Araç Bakım';
    else if (!collected.category) collected.category = 'Genel Gider';

    if (!collected.amount) {
      return { success: true, intent: 'CREATE_EXPENSE', action: 'CONTINUE_CONVERSATION',
        conversationState: 'CREATING_EXPENSE_STEP', params: { step: 2, collected }, extracted: collected,
        response: 'Gider tutarı nedir? Örnek: 500 TL',
      };
    }

    return { success: true, intent: 'CREATE_EXPENSE', action: 'API_CALL',
      params: { endpoint: '/finance/expenses', method: 'POST', data: { amount: collected.amount, category: collected.category, description: `${collected.category} gideri` } },
      extracted: collected, response: `${collected.amount} ₺ ${collected.category} gideri kaydediliyor.`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Help response
  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // Multi-step: REGISTRATION flow
  // ═══════════════════════════════════════════════════════════
  private handleRegistrationStep(msg: string, msgLower: string, context: Record<string, any>): any {
    const collected = context.collected || {};

    // Role detection
    if (/firma|y[üu]k\s*sahibi|şirket/i.test(msg)) collected.role = 'FIRMA';
    else if (/ta[şs][ıi]y[ıi]c[ıi]|s[üu]r[üu]c[üu]|nakliye/i.test(msg)) collected.role = 'TASIYICI';
    else if (/i[şs]letme|lokanta|akaryak[ıi]t/i.test(msg)) collected.role = 'ISLETME';
    else if (/genel|normal|standart/i.test(msg)) collected.role = 'GENEL';

    // Name extraction
    const nameMatch = msg.match(/(?:ad[ıi]m|ismim|ad[ıi]\s*soyad[ıi]m?)\s*:?\s*(.+?)(?:\s*(?:telefon|tel|email|e-posta|\.|$))/i);
    if (nameMatch) collected.fullName = nameMatch[1].trim();
    else {
      const words = msg.split(/\s+/);
      const caps = words.filter((w: string) => /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$/.test(w));
      if (caps.length >= 2) collected.fullName = caps.slice(0, 2).join(' ');
    }

    // Phone
    const phoneMatch = msg.match(/(05\d{2})[\s-]*(\d{3})[\s-]*(\d{2})[\s-]*(\d{2})/);
    if (phoneMatch) collected.phone = '0' + phoneMatch[0].replace(/[\s-]/g, '');

    // Email
    const emailMatch = msg.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) collected.email = emailMatch[0];

    // Company info (for FIRMA role)
    if (collected.role === 'FIRMA' || /şirket|firma|limited/i.test(msg)) {
      const companyMatch = msg.match(/(?:şirket|firma|unvan)\s*:?\s*(.+?)(?:\s*(?:vergi|\.|$))/i);
      if (companyMatch) collected.companyTitle = companyMatch[1].trim();
    }

    // License type (TASIYICI)
    if (/([A-Z]\s*s[ıi]n[ıi]f[ıi]|ehliyet)/i.test(msg)) {
      const licMatch = msg.match(/([A-Z])\s*s[ıi]n[ıi]f[ıi]/i);
      if (licMatch) collected.licenseType = licMatch[1] + ' Sınıfı';
    }

    // Check what's missing
    const missing: string[] = [];
    if (!collected.role) missing.push('rol (Firma/Taşıyıcı/İşletme/Genel)');
    if (!collected.fullName) missing.push('ad soyad');
    if (!collected.phone) missing.push('telefon');
    if (!collected.email) missing.push('email');

    if (missing.length > 0) {
      const qs: Record<string, string> = {
        'rol (Firma/Taşıyıcı/İşletme/Genel)': 'Hangi rolde kayıt olmak istiyorsunuz? Firma, Taşıyıcı, İşletme veya Genel?',
        'ad soyad': 'Adınız ve soyadınız nedir?',
        'telefon': 'Telefon numaranız nedir?',
        'email': 'E-posta adresiniz nedir?',
      };
      const firstMissing = missing[0];
      return {
        success: true, intent: 'REGISTRATION', action: 'CONTINUE_CONVERSATION',
        conversationState: 'REGISTRATION', params: { step: (context.step || 1) + 1, collected },
        extracted: collected,
        response: qs[firstMissing] || `Lütfen şu bilgileri de belirtin: ${missing.join(', ')}`,
      };
    }

    // All collected
    return {
      success: true, intent: 'REGISTRATION', action: 'FILL_REGISTRATION',
      params: { collected },
      extracted: collected,
      response: `${collected.fullName}, kayıt bilgileriniz hazır! ${collected.role === 'FIRMA' ? 'Firma' : collected.role === 'TASIYICI' ? 'Taşıyıcı' : collected.role === 'ISLETME' ? 'İşletme' : 'Genel'} rolünde kayıt oluyorsunuz. Devam edebilirsiniz.`,
    };
  }

  private getHelpResponse(): any {
    return {
      success: true, intent: 'HELP',
      extracted: {},
      response: 'Şunları yapabilirim:\n📦 Yük ekleme\n🔍 Yük/araç/parça arama\n💰 Gelir/gider/yakıt kaydı\n📄 Fatura/irsaliye oluşturma\n👤 Profil/araç/müşteri yönetimi\n📍 Navigasyon ve takip\n\nSadece ne yapmak istediğinizi söyleyin. Örnek: "En yakın yükleri sırala"',
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
