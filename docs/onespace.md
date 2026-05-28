# KAPTAN Lojistik — Görsel Tasarım Sistemi (onespace.md)

> Bu doküman `D:\Proje\01\kod\` dizinindeki KAPTAN Lojistik uygulamasının tüm görsel detaylarını içerir.
> Kendi aplikasyonunda birebir aynı görünümü yakalamak için buradaki tüm değerleri kullanabilirsin.

---

## 1. YAZI FONTU (Typography)

### Font Ailesi
```js
fontFamily: 'System'  // iOS: San Francisco, Android: Roboto
// Varsayılan sistem fontu kullanılıyor. Özel font YÜKLÜ DEĞİL.
// SpaceMono-Regular.ttf assets/fonts/ altında var ama KULLANILMIYOR.
```

### Tipografi Ölçeği (theme.ts → typography)

| Token | fontSize | fontWeight | color | Kullanım Yeri |
|-------|----------|------------|-------|---------------|
| `heroValue` | **42** | 700 | #FFFFFF | Dashboard büyük sayılar (gelir, yük sayısı) |
| `heroLabel` | **11** | 600 | #8B9DC3 | Hero alt etiketi, uppercase, letterSpacing:1 |
| `sectionTitle` | **18** | 700 | #FFFFFF | Bölüm başlıkları ("Aktif Yükler", "Son Teklifler") |
| `cardTitle` | **16** | 600 | #FFFFFF | Kart başlıkları |
| `cardValue` | **24** | 700 | #FFFFFF | Kart içindeki büyük değerler |
| `cardLabel` | **13** | 500 | #8B9DC3 | Kart içi etiketler |
| `body` | **15** | 400 | #FFFFFF | Genel metin |
| `bodySecondary` | **14** | 400 | #8B9DC3 | İkincil metin |
| `caption` | **12** | 500 | #5A7099 | Alt metin, zaman damgaları |
| `badge` | **11** | 700 | - | uppercase, letterSpacing:0.5 |
| `button` | **16** | 700 | - | Buton metni |
| `tabLabel` | **11** | 600 | - | Tab bar etiketleri |
| `price` | **20** | 700 | #FF6B00 | Fiyat gösterimi (turuncu) |
| `priceSmall` | **16** | 700 | #FF6B00 | Küçük fiyat (turuncu) |

### Özel Stil Kullanımları (StyleSheet ile)

| Konum | fontSize | fontWeight | Not |
|-------|----------|------------|-----|
| `styles.logoText` | 32 | 800 | Login ekranı "KAPTAN" yazısı |
| `styles.logoSubtext` | 14 | 400 | Login ekranı alt başlık |
| `styles.tabText` | 14 | 600 | Login tab (Giriş/Kayıt) |
| `styles.companyName` | 18 | 700 | Anasayfa header firma adı |
| `styles.greeting` | 13 | 500 | Anasayfa "Hoş geldin" |
| `styles.sectionTitle` | 18 | 700 | Anasayfa bölüm başlıkları |
| `styles.cardTitle` | 14 | 600 | Anasayfa kart başlığı |
| `styles.statsValue` | 32 | 800 | İstatistik değerleri |
| `styles.statsLabel` | 11 | 600 | uppercase, letterSpacing:0.5 |
| `styles.seeAll` | 13 | 600 | "Tümünü Gör" linki |
| `styles.availabilityText` | 13 | 600 | Müsaitlik durumu |
| `sharedStyles.headerTitle` | 18 | 700 | Sayfa başlığı |
| `sharedStyles.seeAll` | 13 | 600 | "Tümünü Gör" |
| `sharedStyles.inputLabel` | 11 | 700 | uppercase, letterSpacing:0.8 |
| `sharedStyles.inputField` | 15 | 400 | Form input |
| `sharedStyles.primaryButtonText` | 16 | 700 | Ana buton |
| `sharedStyles.emptyTitle` | 20 | 700 | Boş durum başlığı |
| `RouteDisplay.routeLabel` | 10 | 700 | uppercase, letterSpacing:1 (YÜKLEME/TESLİMAT) |
| `RouteDisplay.routeCity` | 17 | 700 | Rota şehir adı |
| `LoadTypeTag.tagText` | 10 | 700 | letterSpacing:0.5 |
| `StatusBadge.text` | 12 | 600 | Durum etiketi |
| `StatusBadge.textMd` | 13 | 600 | Büyük durum etiketi |

---

## 2. RENK PALETİ

### Koyu Tema (varsayılan) — `darkColors`

```js
primary:        '#FF6B00'   // Ana turuncu
primaryLight:   '#FF8A3D'   // Açık turuncu
primaryDark:    '#E05500'   // Koyu turuncu
primaryMuted:   'rgba(255, 107, 0, 0.12)'  // Soluk turuncu (arka plan)

background:        '#0A1628'   // Ana arka plan (koyu lacivert)
backgroundSecondary: '#0F1D32' // İkincil arka plan
surface:           '#132039'   // Kart/panel yüzeyi
surfaceLight:      '#1A2A4A'   // Açık yüzey
surfaceElevated:   '#1E3355'   // Yükseltilmiş yüzey

textPrimary:    '#FFFFFF'   // Ana metin (beyaz)
textSecondary:  '#8B9DC3'   // İkincil metin (gri-mavi)
textMuted:      '#5A7099'   // Soluk metin
textAccent:     '#FF6B00'   // Vurgu metin (turuncu)

border:      '#1E3355'   // Kenar çizgisi
borderLight: '#253D5E'   // Açık kenar çizgisi

success:     '#10B981'   // Yeşil (başarı)
warning:     '#F59E0B'   // Sarı (uyarı)
error:       '#EF4444'   // Kırmızı (hata)
info:        '#3B82F6'   // Mavi (bilgi)

ftl:     '#3B82F6'   // Komple Yük rengi
ltl:     '#8B5CF6'   // Parsiyel rengi
city:    '#10B981'   // Şehir İçi rengi
moving:  '#EC4899'   // Evden Eve rengi

tabBarBg: '#060E1A'   // Tab bar arka plan
```

### Açık Tema — `lightColors`

```js
primary:        '#E85D00'   // Ana turuncu (biraz daha koyu)
primaryLight:   '#FF8A3D'
primaryDark:    '#C24900'
primaryMuted:   'rgba(232, 93, 0, 0.08)'

background:        '#F5F7FA'   // Açık gri arka plan
backgroundSecondary: '#FFFFFF'
surface:           '#FFFFFF'   // Beyaz kart
surfaceLight:      '#F0F2F5'
surfaceElevated:   '#E8ECF2'

textPrimary:    '#1A2332'   // Koyu metin
textSecondary:  '#556677'
textMuted:      '#8899AA'
textAccent:     '#E85D00'

border:      '#E2E8F0'
borderLight: '#EDF2F7'

success:     '#059669'
warning:     '#D97706'
error:       '#DC2626'
info:        '#2563EB'

ftl:     '#2563EB'
ltl:     '#7C3AED'
city:    '#059669'
moving:  '#DB2777'

tabBarBg: '#FFFFFF'
```

### `Colors.ts` (Expo default — uygulamada KULLANILMIYOR)

```js
light: { text:'#11181C', background:'#fff', tint:'#0a7ea4', icon:'#687076' }
dark:  { text:'#ECEDEE', background:'#151718', tint:'#fff', icon:'#9BA1A6' }
```

### Yük Tipi Renk Kodları (her yerde tutarlı)

| Tip | Renk | Kullanım |
|-----|------|----------|
| FTL (Komple) | `#3B82F6` (mavi) | LoadTypeTag, kartlar, filtre |
| LTL (Parsiyel) | `#8B5CF6` (mor) | LoadTypeTag, kartlar, filtre |
| City (Şehir İçi) | `#10B981` (yeşil) | LoadTypeTag, kartlar, filtre |
| Moving (Evden Eve) | `#EC4899` (pembe) | LoadTypeTag, kartlar, filtre |

### Durum Renk Kodları

| Durum | Renk | Opaklık (arka plan) |
|-------|------|---------------------|
| pending / draft | `#F59E0B` (sarı) | `+18` |
| matched / completed / info | `#3B82F6` (mavi) | `+18` |
| loading | `#8B5CF6` (mor) | `+18` |
| inTransit | `#FF6B00` (turuncu) | `+18` |
| delivered / open / success | `#10B981` (yeşil) | `+18` |
| cancelled / error | `#EF4444` (kırmızı) | `+18` |
| closed | `#8B9DC3` (gri) | `+18` |

---

## 3. BOŞLUK SİSTEMİ (Spacing)

```js
spacing: {
  xs:   4,   // minik boşluk (ikon-text arası)
  sm:   8,   // küçük boşluk (kart içi)
  md:   12,  // orta boşluk
  lg:   16,  // standart padding
  xl:   20,  // geniş boşluk
  xxl:  24,  // çok geniş
  xxxl: 32,  // maksimum
}
```

### Nerelerde kullanılıyor:

| Değer | Kullanım Yeri |
|-------|--------------|
| **4** | icon-text gap, dot'lar |
| **8** | routeRow gap, section başlık altı, filterChip paddingY, badge paddingY |
| **12** | kart içi marginBottom, headerRow gap |
| **14** | RouteDisplay detay gap |
| **16** | standart paddingHorizontal, headerRow paddingX, card padding, primaryButton paddingY, inputField paddingX |
| **20** | emptyTitle marginBottom, sectionHeader marginBottom |
| **24** | emptyDesc marginBottom |
| **40** | emptyState paddingTop |

---

## 4. KÖŞE YUVARLAMA (Border Radius)

```js
radius: {
  sm:   8,     // küçük kart, input
  md:   12,    // butonlar, inputField
  lg:   16,    // ana kartlar
  xl:   20,    // büyük kartlar
  full: 9999,  // pill/oval (badge, chip)
}
```

| Değer | Kullanım Yeri |
|-------|--------------|
| **6** | LoadTypeTag, RouteDisplay dot |
| **8** | Tab/kart |
| **12** | inputField |
| **14** | primaryButton, secondaryButton |
| **16** | card |
| **20** | statusBadge, filterChip |
| **22** | backButton (44x44 circle) |

---

## 5. GÖLGE SİSTEMİ (Shadows)

```js
// card shadow (varsayılan)
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.3
shadowRadius: 6
elevation: 4

// elevated shadow (yükseltilmiş)
shadowColor: '#000'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.4
shadowRadius: 12
elevation: 8
```

---

## 6. TEMA GEÇİŞ ANİMASYONU

Tema değişimi sırasında:
1. **Overlay fade-in**: 180ms `Easing.out(Easing.quad)` ile opaklık 0→1
2. **Tema switch**: 180ms sonra
3. **Overlay fade-out**: 280ms `Easing.in(Easing.quad)` ile opaklık 1→0

Overlay rengi: Koyu tema `#0A1628`, Açık tema `#F5F7FA`

---

## 7. KOMPONENT GÖRSEL DETAYLARI

### StatusBadge (`components/ui/StatusBadge.tsx`)

```
┌──────────────────────┐
│ ● Beklemede          │  ← paddingHorizontal:10, paddingVertical:4, gap:6
└──────────────────────┘  ← borderRadius:20, dot:6x6 borderRadius:3
                          ← fontSize:12 fontWeight:600
```

### LoadTypeTag (`components/ui/LoadTypeTag.tsx`)

```
┌──────┐
│ FTL  │  ← paddingHorizontal:10, paddingVertical:4, borderRadius:6
└──────┘  ← fontSize:10 fontWeight:700 letterSpacing:0.5
          ← icon:14px (opsiyonel)
```

### RouteDisplay — Compact (`components/ui/RouteDisplay.tsx`)

```
● İstanbul  →  ● Mersin  950 km
  └─ dot:8x8     └─ dot:8x8   └─ fontSize:12 color:textMuted
  └─ success     └─ primary
  └─ fontSize:14 fontWeight:600
```

### RouteDisplay — Detailed

```
YÜKLEME                 fontSize:10 fontWeight:700 letterSpacing:1
İstanbul                fontSize:17 fontWeight:700
Esenyurt OSB            fontSize:13 color:textSecondary

TESLİMAT
Mersin
Tarsus OSB
```

### ProgressRing (`components/ui/ProgressRing.tsx`)

```
SVG Circle tabanlı ilerleme halkası
- size: 120 (varsayılan)
- strokeWidth: 6
- trackColor: rgba(255,255,255,0.08)
- color: primary (turuncu)
- strokeLinecap: round
```

### Primary Button (`sharedStyles`)

```
┌──────────────────────────────┐
│         BUTON METNI           │  ← borderRadius:14, paddingVertical:16
└──────────────────────────────┘  ← gap:8 (ikonluysa)
                                  ← fontSize:16 fontWeight:700 color:#FFF
                                  ← backgroundColor:primary
```

### Secondary Button

```
┌──────────────────────────────┐
│         BUTON METNI           │  ← borderRadius:14, paddingVertical:14
└──────────────────────────────┘  ← borderWidth:1 borderColor:border
                                  ← backgroundColor:surface
                                  ← fontSize:15 fontWeight:600 color:textSecondary
```

### Card (`sharedStyles.card`)

```
┌──────────────────────────────┐
│                              │  ← backgroundColor:surface
│         Kart İçeriği          │  ← borderRadius:16, padding:16
│                              │  ← borderWidth:1 borderColor:border
└──────────────────────────────┘  ← marginBottom:12
                                  ← shadow (elevation:4)
```

### Input Field (`sharedStyles.inputField`)

```
┌──────────────────────────────┐
│  Placeholder text...          │  ← backgroundColor:surface
└──────────────────────────────┘  ← borderRadius:12, paddingHorizontal:16
                                  ← paddingVertical:14
                                  ← borderWidth:1 borderColor:border
                                  ← fontSize:15 color:textPrimary

LABEL                             ← fontSize:11 fontWeight:700
                                  ← color:textMuted letterSpacing:0.8
                                  ← marginBottom:8
```

### Filter Chip

```
┌──────────┐  ┌──────────┐
│  Normal   │  │  Active   │  ← borderRadius:20 paddingHorizontal:14 paddingVertical:8
└──────────┘  └──────────┘  ← Normal: bg:surface, border:border
                            ← Active: bg:primary, border:primary
                            ← fontSize:13 fontWeight:600
```

---

## 8. TAB BAR GÖRSEL DETAYLARI

```js
height: insets.bottom + 60   // platform'a göre değişir
paddingTop: 8
paddingBottom: insets.bottom + 8
backgroundColor: darkColors.tabBarBg (koyu: '#060E1A', açık: '#FFFFFF')
borderTopWidth: 1
borderTopColor: border

activeTintColor: primary (turuncu)
inactiveTintColor: textMuted

labelStyle: { fontSize: 11, fontWeight: '600' }
```

### Tab Bar İkonları (MaterialIcons)

| Tab | İkon | Başlık |
|-----|------|--------|
| index | `dashboard` | Anasayfa |
| loads | `person` | Kişisel Bilgiler |
| shipments | `route` | Taşımalarım |
| profile | `settings` | Profil |

### Badge (bildirim sayısı)

```
  ┌──┐
  │3 │  ← position:absolute, top:-4, right:-8
  └──┘  ← backgroundColor:error (kırmızı)
        ← borderRadius:8, minWidth:16, height:16
        ← fontSize:9 fontWeight:700 color:#FFF
```

---


---

## 9. KULLANILAN İKON SETİ VE RENKLERİ

Tüm ikonlar `@expo/vector-icons` → **MaterialIcons** ailesinden.
Her ikonun rengi kullanıldığı bağlama göre değişir:

| Bağlam | İkon Rengi |
|--------|-----------|
| Buton içi | `#FFF` (beyaz) |
| Tab bar aktif | `primary` (turuncu) |
| Tab bar inaktif | `textMuted` |
| Kart başlık ikonu | `primary` |
| Header ikon | `textSecondary` |
| Badge/etiket ikonu | Etiket rengiyle aynı |

---

## 10. ÖZET: KENDİ UYGULAMANA TAŞIMAK İÇİN

### Adım 1 — Renkleri kopyala
`contexts/ThemeContext.tsx` içindeki `darkColors` ve `lightColors` objelerini birebir al.

### Adım 2 — Tipografiyi kopyala
`constants/theme.ts` içindeki `typography` objesini ve yukarıdaki tablodaki fontSize/weight değerlerini kullan.

### Adım 3 — Ortak stilleri kopyala
`constants/styles.ts` içindeki `sharedStyles` objesini al (card, button, input, badge, filterChip, emptyState).

### Adım 4 — Boşluk ve radius
`theme.spacing` ve `theme.radius` değerlerini kullan.

### Adım 5 — Bileşenleri kopyala
Şu 5 bileşen görsel tutarlılık için kritik:
1. `StatusBadge` — tüm durum etiketleri
2. `LoadTypeTag` — yük tipi etiketleri
3. `RouteDisplay` — rota gösterimi (compact + detailed)
4. `ProgressRing` — ilerleme halkası
5. `sharedStyles` — card, button, input, chip stilleri

### Adım 6 — Tema geçişi
`ThemeContext.tsx` içindeki `toggleTheme()` fonksiyonu fade animasyonu ile tema değiştirir. `useTheme()` hook'u ile her yerden erişilir.
