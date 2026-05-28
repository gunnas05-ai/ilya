# ================================================================================
# KAPTAN LOJİSTİK VE TİCARİ PAZARYERİ PLATFORMU
# MASTER TEKNİK ŞARTNAME VE GELİŞTİRME PROMPTU v2.0
# ================================================================================

Bu doküman, KAPTAN Lojistik ve Ticari Pazaryeri Platformu için hazırlanmış olan 01'den 13'e kadar olan tüm şartname, kurallar, renk paleti ve mimari tasarım belgelerinin tek bir çatı altında birleştirildiği **Master Teknik Şartname ve Geliştirme Promptu**dur. 

Tüm uygulama katmanları (React Native mobil istemci, NestJS API sunucusu, PostgreSQL/PostGIS veri tabanı, Redis önbellek ve AI/OCR motorları) bu belgedeki spesifikasyonlara göre tasarlanmış, entegre edilmiş ve üretim seviyesinde (production-ready) hayata geçirilmiştir.

---

## 🎨 BÖLÜM 1: GENEL SİSTEM PRENSİPLERİ, GÖRSEL VE TASARIM STANDARTLARI (`00 kurallar.txt`, `00standart.txt` & `10_Renk_Paleti_ve_Tasarim_Standartlari.md`)

### 1.1 Global Sistem Prensipleri
* **Dil ve Yerelleştirme:** Sistemdeki teknik altyapı (veri tabanı, kod değişkenleri, API uç noktaları) İngilizce olabilir. Ancak son kullanıcıya görünen tüm menü, buton, form, popup, hata mesajı, veri alanı ve PDF çıktısı **TÜRKÇE** olmalı ve Türkçe karakterler eksiksiz desteklenmelidir.
* **Mükerrerlik ve Güvenlik:** Butonlara ardı ardına basılmasını (double-submit) engellemek için tüm aksiyonlarda throttle/debounce mekanizması veya loading spinner durumları aktif olmalıdır.
* **Geri Dön Buton Kuralı:** Uygulamanın tüm sayfalarında sol üst köşede tekil olarak hap (pill) şeklinde `CustomBackButton` bulunmalıdır. Bu buton kullanıcının geldiği bir önceki sayfaya güvenli dönüş sağlamalıdır; asla kullanıcıyı doğrudan ana sayfaya yönlendirmemelidir.
  * **Tasarım:** Aydınlık modda arkasında belirgin siyah gölge aura, karanlık modda ise soft aydınlık beyaz/turkuaz parlama aurası olmalıdır. pastel turkuaz (`#2DD4BF`) rengi ikon ve metin rengi olarak kullanılmalıdır.

### 1.2 Kart Tasarım Standartları (Sol Kenar Şerit Kuralı)
* ** border-left Yasağı:** Kartların durum veya önem derecesini göstermek amacıyla kart bileşeni üzerine doğrudan `borderLeftWidth` ve `borderLeftColor` tanımlanması KESİNLİKLE yasaktır.
* **Dikey Gösterge View Mimari Kuralı:** Her veri kartı (yük kartı, gider kartı, istasyon kartı vb.) içerisinde, sol tarafta yer alacak bağımsız ve dikey bir `View` (`styles.accent`) katmanı konumlandırılmalıdır.
  * Bu dikey çubuk, kartın sol köşesinde tam dikey yükseklikte uzamalı (`align-stretch`), genişliği sabit `4px` veya `6px` olmalı ve köşe yuvarlatmasını (`borderRadius`) kartın sol köşelerinden devralmalıdır.
  * Çubuğun rengi kartın durumuna (aktif, tamamlanmış, iptal edilmiş, yüksek riskli vb.) göre dinamik atanmalıdır.

### 1.3 Renk Paleti Standartları (HSL & Premium Slate)
Uygulamanın renk kimliği kurumsal **Pastel Turkuaz (#2DD4BF)** (Teal-400) rengi üzerine kuruludur.

#### ☀️ Aydınlık Mod (Light Mode)
* **Primary (Marka Rengi):** `#2DD4BF` (Pastel Turkuaz)
* **Arka Plan (Background):** `#F8F9FA` (Yumuşak Beyaz Aura)
* **Yüzeyler / Kartlar (Surface):** `#FFFFFF` (Saf Beyaz)
* **Sınırlar (Border):** `#E5E7EB` (Çok ince gri / Gray-200)
* **Birincil Metin (Text):** `#111827` (Derin Karbon / Gray-900)
* **İkincil Metin (Text Secondary):** `#6B7280` (Açıklama Grisi / Gray-500)
* **Gölge Aurası (Shadow):** `shadowColor: '#000000'`, `shadowOffset: { width: 0, height: 2 }`, `shadowOpacity: 0.20`, `shadowRadius: 3.5`, `elevation: 4`.

#### 🌙 Karanlık Mod (Dark Mode)
* **Arka Plan (Background):** `#090A0F` (Derin Gece Slate)
* **Yüzeyler / Kartlar (Surface):** `#141722` (Uzay Mavisi Grisi)
* **Sınırlar (Border):** `#2A2F3A` (Yumuşak Kömür)
* **Birincil Metin (Text):** `#F9FAFB` (Buz Beyazı / Gray-50)
* **İkincil Metin (Text Secondary):** `#9CA3AF` (Yumuşak Gri)
* **Gölge Aurası (Shadow):** `shadowColor: '#FFFFFF'`, `shadowOffset: { width: 0, height: 2 }`, `shadowOpacity: 0.35`, `shadowRadius: 3.5`, `elevation: 4` (Premium parlama efekti).

---

## 📦 BÖLÜM 2: YÜK EKLEME MODÜLÜ (`01 Yuk Ekle.txt`)

Yük veren kullanıcıların platforma lojistik sevkiyat ilanı eklemesini sağlayan, dinamik form motoru tabanlı çok adımlı (multi-step wizard) modüldür.

### 2.1 Birinci Ekran: Ortak Form Alanları
* **Yük Türü Seçimi (Dinamik Dropdown):**
  * *Tam Yük*, *Kısmi Yük*, *Evden Eve*, *Şehir İçi*.
  * Seçilen yük türüne göre 2. ekranın form alanları asenkron ve dinamik olarak değişir.
* **Başlık:** Min 5, maks 20 karakter uzunluğunda olmalıdır.
* **Nereden / Nereye (İl / İlce):** GPS destekli otomatik konum algılama ve "Konum Bul" harita arayüzü sunulur.
* **Adres Detayları:** Sokak, mahalle, bina no ve açık adres zorunludur.
* **İrtibat Kişisi:** Ad Soyad ve telefon numarası alanları yan yana konumlanır.
* **Tarih & Saat Seçimi:** Yükleme Tarihi/Saati ve Teslimat Tarihi/Saati. (Teslimat tarihi yükleme tarihinden önce olamaz).

### 2.2 İkinci Ekran: Yük Türüne Özel Dinamik Alanlar
* **A) Tam Yük:**
  * Araç Tipi (Çekici, Kamyon, Lowbed, Frigorifik vb.)
  * Dorse Tipi (Tenteli, Mega, Frigo, Damper vb.)
  * Toplam Ağırlık (Kg - Sayısal)
  * Soğuk Zincir Gereksinimi (Evet/Hayır)
* **B) Kısmi Yük:**
  * Parça Sayısı, Toplam Ağırlık (Ton), Hacim ($m^3$) ve Paket Tipi (Palet, Koli, Adet).
  * Paylaşımlı Taşıma İzni (Evet/Hayır) ve Yük Aciliyeti (Düşük, Normal, Yüksek).
* **C) Evden Eve:**
  * Taşıma Tipi (Ev Eşyası, Ofis, Beyaz Eşya, Antika vb.).
  * Kat Bilgileri (Gönderen Kat / Alıcı Kat) ve Asansör Durumu (Gönderen/Alıcı).
  * Ambalaj/Paketleme Talebi (Evet/Hayır).
* D) Şehir İçi:
  * Araç Tipi (Panelvan, Kamyonet, Moto Kurye, Minivan vb.).
  * Taşıma Türü (Market, İlaç, Soğuk Zincir, E-Ticaret vb.) ve Tahmini Mesafe (Km).

### 2.3 Üçüncü Ekran: Fiyatlandırma, İhale ve Sigorta
* **İhale Sistemi:** "Yük İhale Edilecek mi?" (Evet/Hayır). Evet ise: Alt/Üst limit fiyatı, ihale başlangıç/bitiş tarihleri ve saatleri zorunlu olarak girilir.
* **Fiyatlandırma Tipleri:**
  * *Tonaj Bazlı:* $\text{Toplam Fiyat} = \text{Tonaj} \times \text{Ton Başı Fiyat} + \%20\text{ KDV}$
  * *Komple / Adet Bazlı:* $\text{Toplam Fiyat} = \text{Sabit Fiyat} + \%20\text{ KDV}$
* **Sigorta & Escrow Seçimi:** Kullanıcı isteğine bağlı sigorta poliçe paketleri listelenir ve Güvenli Ödeme (Escrow) seçeneği işaretlenirse yüke sistem genelinde **"Güvenli Ödeme"** etiketi basılır.

### 2.4 Veri Kaydetme Standartları
* **Benzersiz Yük ID Formatı:** `YIL + AY + GUN + SAAT + DAKIKA + SANIYE` (Örn: `20260615142506`).
* **Offline Mod Desteği:** İnternet bağlantısı kesildiğinde veriler `AsyncStorage` / `IndexedDB` kuyruğuna alınır; bağlantı sağlandığı an otomatik olarak arka planda senkronize edilir.

---

## 🚛 BÖLÜM 3: YÜK ALMA VE TAŞIYICI MODÜLÜ (`02 Yuk Al.txt`)

Taşıyıcı şoförlerin yük bulmasını, harita üzerinden ilanları incelemesini, teklif vermesini ve güvenli ödeme (escrow) blokesiyle çalışmasını sağlayan modüldür.

### 3.1 Teklif Öncesi Zorunlu Profil Kontrolü (Gateway & Guard)
Taşıyıcı teklif vermeden önce profildeki şu belgeleri sisteme kaydetmiş ve onaylatmış olmalıdır:
* *Ehliyet, Araç Plakası, Araç ve Dorse Tipi, Tonaj ve Hacim Kapasiteleri, K Belgesi Numarası, SRC Belgesi Numarası, IBAN ve Vergi Bilgileri, Escrow Ödeme Hesabı.*
* Eksik belge olması durumunda "Teklif Ver" butonu pasif hale getirilir ve **"Profilinizi Tamamlayın"** yönlendirme ekranı açılır.

### 3.2 Harita ve Arama Altyapısı
* **Açık Harita Katmanı:** Kesinlikle Google Maps kullanılmayacaktır; **OpenStreetMap + Leaflet.js / MapLibre** altyapısı entegre edilmiştir.
* **Marker Clustering:** Haritada çok sayıda yük marker'ı kümelenerek gösterilir. İlan pinleri yakıt, aciliyet veya escrow garantili durumlarına göre renkli simgelerle ayrıştırılır.
* **Pazarlık & Karşı Teklif:** WebSocket tabanlı anlık pazarlık paneli sunulur. Fiyat revizyonları, süre limitleri (15 dk, 30 dk, 1 saat...) ve komisyon kesintileri anlık güncellenir.

---

## 🔄 BÖLÜM 4: OTOMATİK GERİ DÖNÜŞ YÜKÜ BULMA MODÜLÜ (`03 Geri donus.txt`)

Şoförlerin teslimat sonrası boş dönmelerini engelleyen ve yakıt maliyetlerini optimize eden akıllı konum tabanlı geri dönüş yükü bulma servisidir.

### 4.1 Tetikleyici Olay ve Teslimat Doğrulama
* Şoför mobil uygulamada **"Yükü Teslim Ettim"** butonuna bastığında sistem çalışmaya başlar.
* **Doğrulama Koşulları:** Modülün devreye girebilmesi için şu teslim kanıtlarından en az birinin başarıyla sisteme yüklenmesi zorunludur:
  * *Dijital İmza, Süreli QR Kod Doğrulaması, Teslimat Alanı Fotoğrafı, SMS OTP Kodu, GPS Konum Doğrulaması.*

### 4.2 Geri Dönüş Arama Algoritması
* Teslim lokasyonunun merkez alındığı belirli bir yarıçapta (Varsayılan 100 KM; 25, 50, 250, 500 KM seçenekleriyle) aktif yük ilanları taranır.
* **AI Destekli Uyumluluk Skoru ($S_{\text{match}}$):**
  Sistem her yük ilanı için aşağıdaki formüle dayalı bir uyumluluk puanı hesaplar ve kartta yüzde (%) olarak gösterir:
  $$S_{\text{match}} = (w_1 \times \text{Araç/Dorse Uyumu}) + (w_2 \times \text{Mesafe Verimliliği}) + (w_3 \times \text{Kazanç Oranı}) - (w_4 \times \text{Boş KM})$$

### 4.3 Race Condition ve Rezervasyon Kontrolü
Aynı geri dönüş yüküne aynı anda birden fazla teklif gelmesi durumunda, veri tabanında **Optimistic Locking (Versiyon Kontrolü)** ve **Atomic Transaction** kullanılarak mükerrer rezervasyonlar engellenir.

---

## 📄 BÖLÜM 5: Gelir İdaresi Başkanlığı (GİB) UYUMLU E-BELGE MODÜLÜ (`04 GİB modulu.txt`)

Lojistik operasyonların resmî finansal faturalandırma süreçlerini yöneten, UBL-TR 1.2 XML ve resmî PDF standartlarına sahip immutable (değiştirilemez) kurumsal e-belge motorudur.

### 5.1 Desteklenen 12 Belge Tipi
1. *E-Fatura*, 2. *E-Arşiv Fatura*, 3. *Proforma Fatura*, 4. *Temel Fatura*, 5. *Ticari Fatura*, 6. *İrsaliyeli Fatura*, 7. *E-İrsaliye*, 8. *İstisna Faturası*, 9. *İhracat Faturası*, 10. *Tevkifatlı Fatura*, 11. *KDV Muaf Fatura*, 12. *U-ETDS Lojistik Bildirimi*.

### 5.2 Resmî A4 PDF Tasarım Standartları
* **Sayfa Düzeni:** A4 dikey (210x297 mm), saf beyaz arka plan (`#FFFFFF`), sol kenar boşluğu 20 mm, sağ kenar boşluğu 10 mm.
* **Font Ailesi:** Arial Bold (18pt başlıklar, 10pt etiketler), Arial Normal (9-10pt veriler) ve Courier New 10pt (ETTN ve VKN kodları).
* **Zorunlu Detaylar:** Sağ üstte büyük puntolarla belge tipi (örn: "E-ARŞİV FATURA"), UUID v4 formatında ETTN numarası, sol üstte logo.
* **Çerçeve ve Grid:** Dış çerçeve 1pt saf siyah (`#000000`), iç çizgiler 0.5pt gri (`#808080`), zebra satırlar `#FFFFFF` ve `#F4F4F4` şeklinde sıralanır.
* **Mali QR Kod:** Sağ alt köşede 22x22 mm boyutunda, GİB doğrulama URL'sini barındıran karekod zorunludur.
* **Filigran:** Sayfa ortasında 45 derece eğimli, açık gri renkte büyük "e-Fatura" filigranı bulunur.

### 5.3 Matematiksel Vergi Motoru (Decimal Hassasiyeti)
* Tüm parasal alanlar veri tabanında kesinlikle `DECIMAL(19,2)` olarak saklanır; float veri tipi yasaktır.
* KDV matrahı, iskonto oranları ve tevkifat kesintileri VUK standartlarına uygun olarak en yakın kuruşa (0.01 TL) yuvarlanır:
  $$\text{KDV Matrahı} = (\text{Miktar} \times \text{Birim Fiyat}) - \text{İskonto Tutarı}$$
  $$\text{KDV Tutarı} = \text{KDV Matrahı} \times (\text{KDV Oranı} / 100)$$
  $$\text{Net Ödenecek} = \text{KDV Matrahı} + \text{KDV Tutarı} - \text{Tevkifat Tutarı}$$

---

## 📊 BÖLÜM 6: GELİR-GİDER VE FİNANS MODÜLÜ (`05 Gelir-Gider.txt`)

Aile bütçesini, bireysel sürücü harcamalarını ve kurumsal lojistik maliyetlerini tek bir platformda birleştiren, OCR destekli harcama ve nakit akış yönetim modülüdür.

### 6.1 Kullanıcı Davet ve Yetki Sistemi
* **Owner (İşletme/Aile Sahibi):** Üye davet edebilir, bütçe sınırlarını belirler, araç ataması yapar ve finansal yetkileri yönetir.
* **Member (Sürücü/Aile Üyesi):** Sadece kendi harcamalarını veya atanan aracın giderlerini sisteme işleyebilir.
* **Davet Akışı:** QR Kod, davet linki veya süreli davet kodu ile üye kayıt süreci tamamlanır.

### 6.2 Gelir ve Gider Kapsamı
* **Gelir Tipleri:** Maaş, Kira, Ticari Kazanç, Yatırım, Taşıma Kazancı.
  * *Otomatik Gelir:* Taşıma tamamlandığında (`shipment.completed` olayı tetiklendiğinde) sistem asenkron olarak fatura tutarını cüzdana otomatik gelir olarak işler. Bu kayıtlar kilitlidir ve silinemez.
* **Gider Kategorileri:**
  * *Lojistik:* Yakıt, Bakım, Sigorta, Vergi, Personel, Köprü-Otoyol Geçişi, Lastik, Ceza.
  * *Aile:* Fatura, Market, Sağlık, Eğitim, Kira, Ulaşım, Giyim.

### 6.3 OCR Destekli Fiş/Fatura İşleme Pipeline
1. **Görsel Ön İşleme (Preprocessing):** Sharp ile binarizasyon, kontrast artırma, gürültü temizleme (denoise) ve perspektif düzeltme.
2. **OCR Çıkarma (Extraction):** Birincil olarak `OCR.space` API, hata veya timeout durumunda fallback olarak yerel `Tesseract.js` kütüphanesi devreye girer.
3. **Regex Algoritması ile Veri Ayrıştırma:** OCR metninden Vergi No, Fiş Tarihi, Toplam Tutar, KDV Oranı ve İşletme Adı otomatik yakalanır.
4. **Onay Arayüzü:** Doğruluk skoru (confidence score) ile birlikte orijinal fiş resmi ve okunan alanlar karşılaştırmalı olarak gösterilir, manuel düzeltme imkanı sunulur.

---

## 🔒 BÖLÜM 7: GÜVENLİ ÖDEME (ESCROW) VE CÜZDAN MİMARİSİ (`06 Güvenli ödeme.txt` & `12_Ticari_Pazaryeri_Sistemi_Mimari_Tasarimi.md`)

Platformdaki tüm finansal işlemleri güvence altına alan, sahtekarlık korumalı (fraud-resistant), milestone destekli kurumsal cüzdan ve emanet (escrow) sistemidir.

### 7.1 Defter-i Kebir (Double-Entry Ledger) Prensibi
Sistemdeki hiçbir para hareketi havada kalamaz. Her işlemde borçlu cüzdan alacaklandırılırken alacaklı cüzdan borçlandırılır. Toplam bakiye eşitliği her transaction sonunda doğrulanır.
* **Available Balance:** Kullanılabilir serbest bakiye.
* **Escrow Balance:** Güvenli ödemede kilitli tutulan emanet bakiye.
* **Pending Release Balance:** Teslimatı yapılmış ancak onay bekleyen bloke bakiye.

### 7.2 AES-256-GCM Şifreli QR Teslimat Kodu
Teslimatın fiziksel olarak gerçekleştiğini doğrulamak için kullanılan yüksek güvenlikli QR doğrulama mekanizması:
* **QR Payload İçeriği:** `ShipmentId`, `DriverId`, `BuyerId`, `Timestamp` (ISO 8601), `Nonce` (Tek kullanımlık UUID).
* **Güvenlik Katmanı:** QR kodu içeriği **AES-256-GCM** ile şifrelenir ve veri bütünlüğü için **HMAC-SHA256** ile imzalanır.
* **Geçerlilik Süresi (TTL):** QR kodunun geçerlilik süresi 15 dakikadır. Replay attack'ları engellemek için her nonce veri tabanında tek seferlik kaydedilir.

### 7.3 AI Sahtekarlık Tespit Motoru (AI Fraud Engine)
Bir yük ilanı girildiğinde veya teklif kabul edildiğinde AI fraud motoru asenkron çalışarak 0.00 - 1.00 arasında bir risk skoru ($R_{\text{fraud}}$) hesaplar:
* **Risk Kriterleri:** Fiyat standart sapması ($P_{\text{dev}}$), IP-GPS lokasyon uyuşmazlığı, duplicate görsel benzerliği, emülatör/root tespiti ve cüzdan hareket anomalileri.
* **Skor Eşikleri:**
  * $0.00 \leq R_{\text{fraud}} < 0.30$ $\rightarrow$ **Otomatik Serbest Bırakma (Auto Release)**
  * $0.30 \leq R_{\text{fraud}} < 0.70$ $\rightarrow$ **Manuel Operasyon İncelemesi (Manual Review)**
  * $0.70 \leq R_{\text{fraud}} \leq 1.00$ $\rightarrow$ **Ödeme Bloke / Askıya Alma (Payment On Hold)**

---

## 🗺️ BÖLÜM 8: YAKIT İSTASYONLARI VE POSTGIS COĞRAFİ KONUM MOTORU (`07 Akaryakıt istasyonları.txt`)

Sürücülerin rota üzerindeki en uygun akaryakıt istasyonlarını fiyat, mesafe ve ek hizmetler bazında bulmalarını sağlayan PostGIS tabanlı coğrafi modüldür.

### 8.1 İstasyon ve Fiyat Güncelliği Kuralları
* İstasyonlarda *Motorin* fiyat girişi zorunlu, *Kurşunsuz*, *LPG*, *AdBlue* ve *Elektrikli Şarj* fiyatları opsiyoneldir.
* **Fiyat Stale (Eskime) Kontrolü:**
  * Son 24 saatte güncellenmemiş fiyatların yanında **"Güncel Değil"** uyarısı gösterilir.
  * Son 48 saatte güncellenmemiş fiyatlar silik (faded) duruma getirilir ve aramalarda en alta itilir.

### 8.2 Rota Üzeri Proximity (ST_DWithin) Spatial Sorguları
PostGIS GiST indeksleri kullanılarak, şoförün gitmekte olduğu OSRM rotasına en fazla `deviationKm` (örn: 10 KM) mesafedeki istasyonları listeleyen optimize SQL sorgusu:
```sql
SELECT id, brand, price, ST_Distance(coordinate::geography, route_line::geography) as dist 
FROM fuel_stations 
WHERE ST_DWithin(coordinate::geography, route_line::geography, 10000) 
ORDER BY price ASC, dist ASC;
```

---

## 🍽️ BÖLÜM 9: LOKANTALAR VE YEME-İÇME MODÜLÜ MİMARİSİ (`08 Lokanta.txt` & `11_Lokantalar_ve_Yeme_Icme_Modulu_Mimari_Tasarimi.md`)

Uzun yol şoförlerinin yol üstü mola ve lezzet noktalarını keşfetmelerini, zaman bazlı ön sipariş vermelerini sağlayan michelin standartlarında harita modülüdür.

### 9.1 Konum Doğrulamalı Yorum Yetki Koruması (`VerifiedCarrierGuard`)
Restoran yorumlarının gerçekçi olmasını sağlamak ve spam puanlamaları engellemek için geliştirilmiş coğrafi güvenlik filtresidir:
* Sadece **Taşıyıcı (tasiyici)** rolündeki kullanıcılar yorum yapabilir.
* Şoförün yorum yapabilmesi için, son 48 saat içerisindeki telemetri GPS geçmişinde ilgili restoranın koordinatına en az **1 KM** yaklaşmış olması (PostGIS `ST_DWithin` ile) zorunludur. Aksi takdirde yorum izni verilmez.

### 9.2 Zaman Bazlı Ön Sipariş ve Rezervasyon Akışı
Şoförler mola sürelerini kaybetmemek için restorana ulaşmadan önce rezervasyon yapabilirler:
* **ETA Tabanlı Hazırlık:** Şoförün OSRM bazlı varış saatine (ETA) 30 dakika kala restoran mutfak ekranına otomatik **"Hazırlığa Başla" (PREPARING)** uyarısı düşer. Şoför vardığında yemek sıcak şekilde servise hazır hale getirilir.

---

## 🔒 BÖLÜM 10: GİRİŞ, ROL SEÇİMİ VE GÜVENLİ ONBOARDING (`09_Login_Ekran_Tasarimi.md`)

Güvenli kullanıcı kaydı, rol bazlı onboarding süreçleri ve KVKK uyumluluk yönetiminin sağlandığı kapı modülüdür.

### 10.1 Süper Admin Bypass Giriş Mekanizması
* **Süper Admin E-postası:** `ilyas_duran@hotmail.com` (şifresiz bypass girişi aktif).
* Bu kullanıcı sisteme giriş yaptığında doğrudan en üst yetki seviyesine sahip olur. Admin panelinden promosyon ayarlarını değiştirebilir, kullanıcıları banlayabilir / admin olarak yetkilendirebilir ve yasal KVKK metinlerini güncelleyebilir.

### 10.2 KVKK ve Sözleşmeler Bottom Sheet Standardı
* Giriş/Kayıt butonlarının altındaki KVKK onay linkine tıklandığında, kullanıcının uygulamadan kopmaması için dış tarayıcı açılmaz.
* Metin, uygulama içinde **Premium Bottom Sheet (Native Blur Surface)** olarak açılır ve smooth-scroll ile okunabilir.

---

## 🛡️ BÖLÜM 11: SÜPER ADMİN OPERASYON MERKEZİ VE TİCARİ PAZARYERİ (`12_Ticari_Pazaryeri_Sistemi_Mimari_Tasarimi.md` & `13 suber admin.txt`)

Süper adminlerin platformun tüm işleyişini, DevOps metriklerini ve operasyonel akışlarını tek bir merkezden izlediği, eldivenle dahi tıklanabilir büyük butonlara sahip yönetim panelidir.

### 11.1 Sekmeli Komuta ve Operasyon Merkezi (AdminPanelScreen.tsx)
* **Sekme 1: Dashboard (Yönetici Özeti):** Aktif yük sayısı, toplam cüzdan/escrow kilitli hacmi, online şoför haritası ve tetiklenen yüksek riskli AI fraud alarmları listelenir.
* **Sekme 2: Üyeler & Belge Onay (OCR):** Kayıtlı kullanıcıların listesi, hesap engelleme / kilit açma, kullanıcıyı admin/süper admin olarak yetkilendirme (`handleAuthorizeAdmin`) ve OCR ile okunan ehliyet/SRC/K-belgelerini inceleyip onaylama ekranı.
* **Sekme 3: İlan Moderasyonu:** AI risk skoru yüksek olan çekici, dorse ve yedek parça ilanlarını anında inceleme, onaylama veya moderatör yetkisiyle sistemden silme.
* **Sekme 4: Güvenli Ödeme & Dispute Çözümü:** İhtilaflı (hasar, gecikme, eksik teslim) işlemlerde kanıtları (fotoğraf, GPS, sensör PDF'leri) inceleyerek fonları alıcıya iade etme (`REFUND`) veya satıcıya aktarma (`RELEASE`) override motoru.
* **Sekme 5: Sesli Komut Dinleyicisi (Hands-Free):** Sürücülerin veya saha personelinin eller serbest kullanımı için Web Speech API simülasyonu. "Yük listesini oku", "Dispute aç" gibi lojistik komutlarının ses kaydıyla simüle edildiği konsol.
* **Sekme 6: DevOps & Prometheus Sistem İzleme:** API p95 gecikme süreleri, veri tabanı CPU/RAM grafikleri, Redis gecikmeleri ve WebSocket bağlantı uptime istatistikleri.
* **Sekme 7: Ayarlar:** Promosyon kodları üretme, komisyon oranlarını değiştirme ve Rich Text WYSIWYG destekli KVKK Gizlilik Sözleşmesi metnini güncelleme paneli.

### 11.2 Towing (Dorse & Çekici) Mekanik Uyum Analiz Motoru
Ticari pazaryerinde satılık çekici ve dorse ilanları arasında eşleştirme yaparken mekanik kazaları önlemek amacıyla geliştirilen NestJS uyumluluk analiz algoritması:
* **Denetim Kriterleri:** Çekici pimi çapı ile dorse king pin çapı uyuşması (2" veya 3.5" uyumu), aks taşıma kapasiteleri, ADR tehlikeli madde tescil uyumu ve dorse uzunluk/kurtarma açısı limitleri.

---

## 🧪 BÖLÜM 12: DOĞRULAMA, GÜVENLİK VE DERLEME KARARLILIĞI

### 12.1 TypeScript Derleme Kararlılığı (Strict Type Checking)
* Mobil (`mobile`) ve sunucu (`backend`) dizinlerinde yer alan tüm dosyalar TypeScript strict modunda hatasız derlenmektedir.
* `npx tsc --noEmit` ve `npm run build` komutları sıfır hata (**Exit Code: 0**) döndürecek şekilde derleme kararlılığına sahiptir.

### 12.2 Güvenlik ve Şifreleme Protokolleri
* Tüm istemci-sunucu haberleşmesi **TLS 1.3** üzerinden HTTPS ve WSS protokolleriyle şifrelenmiştir.
* Veri tabanında yer alan hassas kişisel veriler (PII) ve cüzdan anahtarları **AES-256 at rest** yöntemiyle şifrelenmiş olarak saklanır.
* REST API uç noktaları için JWT token geçerlilik süresi 15 dakika, refresh token süresi 7 gün olarak ayarlanmıştır.

# ================================================================================
# END OF KAPTAN MASTER TECHNICAL SPECIFICATION PROMPT
# ================================================================================
