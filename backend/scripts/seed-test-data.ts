/**
 * Seed script — 10'ar adet test verisi ekler.
 * Kullanım: npx ts-node scripts/seed-test-data.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);
  const pwd = await bcrypt.hash('123456', 10);

  console.log('🌱 Test verileri ekleniyor...\n');

  // ── 10 Firma Sahibi (İşletme) ──
  const firmalar = [
    { fullName: 'Ahmet Yılmaz', email: 'ahmet@firma1.com', phone: '5551000001', role: 'isletme', companyTitle: 'Yılmaz Lojistik A.Ş.', taxNumber: '1111111111', taxOffice: 'İstanbul' },
    { fullName: 'Mehmet Demir', email: 'mehmet@firma2.com', phone: '5551000002', role: 'isletme', companyTitle: 'Demir Nakliyat Ltd.', taxNumber: '2222222222', taxOffice: 'Ankara' },
    { fullName: 'Ayşe Kaya', email: 'ayse@firma3.com', phone: '5551000003', role: 'isletme', companyTitle: 'Kaya Transport', taxNumber: '3333333333', taxOffice: 'İzmir' },
    { fullName: 'Ali Öztürk', email: 'ali@firma4.com', phone: '5551000004', role: 'isletme', companyTitle: 'Öztürk Taşımacılık', taxNumber: '4444444444', taxOffice: 'Bursa' },
    { fullName: 'Fatma Şahin', email: 'fatma@firma5.com', phone: '5551000005', role: 'isletme', companyTitle: 'Şahin Lojistik', taxNumber: '5555555555', taxOffice: 'Antalya' },
    { fullName: 'Mustafa Çelik', email: 'mustafa@firma6.com', phone: '5551000006', role: 'isletme', companyTitle: 'Çelik Transport A.Ş.', taxNumber: '6666666666', taxOffice: 'Konya' },
    { fullName: 'Zeynep Koç', email: 'zeynep@firma7.com', phone: '5551000007', role: 'isletme', companyTitle: 'Koç Lojistik Ltd.', taxNumber: '7777777777', taxOffice: 'Adana' },
    { fullName: 'Hüseyin Aksoy', email: 'huseyin@firma8.com', phone: '5551000008', role: 'isletme', companyTitle: 'Aksoy Nakliyat', taxNumber: '8888888888', taxOffice: 'Gaziantep' },
    { fullName: 'Emine Arslan', email: 'emine@firma9.com', phone: '5551000009', role: 'isletme', companyTitle: 'Arslan Taşımacılık', taxNumber: '9999999991', taxOffice: 'Mersin' },
    { fullName: 'Osman Aydın', email: 'osman@firma10.com', phone: '5551000010', role: 'isletme', companyTitle: 'Aydın Global Lojistik', taxNumber: '9999999992', taxOffice: 'Samsun' },
  ];
  for (const f of firmalar) {
    await ds.query(`INSERT INTO "user" (email, phone, "passwordHash", "fullName", role, "companyTitle", "taxNumber", "taxOffice", "isActive", "isPhoneVerified", "registrationStep") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,true,'completed') ON CONFLICT (email) DO NOTHING`,
      [f.email, f.phone, pwd, f.fullName, f.role, f.companyTitle, f.taxNumber, f.taxOffice]);
  }
  console.log('✅ 10 Firma Sahibi eklendi');

  // ── 10 Yük Sahibi (Yük Veren) ──
  const yukverenler = [
    { fullName: 'Burak Güneş', email: 'burak@yuk1.com', phone: '5552000001', role: 'yuk_veren' },
    { fullName: 'Selin Yıldız', email: 'selin@yuk2.com', phone: '5552000002', role: 'yuk_veren' },
    { fullName: 'Cem Karaca', email: 'cem@yuk3.com', phone: '5552000003', role: 'yuk_veren' },
    { fullName: 'Deniz Bulut', email: 'deniz@yuk4.com', phone: '5552000004', role: 'yuk_veren' },
    { fullName: 'Ece Polat', email: 'ece@yuk5.com', phone: '5552000005', role: 'yuk_veren' },
    { fullName: 'Fırat Ateş', email: 'firat@yuk6.com', phone: '5552000006', role: 'yuk_veren' },
    { fullName: 'Gizem Türk', email: 'gizem@yuk7.com', phone: '5552000007', role: 'yuk_veren' },
    { fullName: 'Hakan Albayrak', email: 'hakan@yuk8.com', phone: '5552000008', role: 'yuk_veren' },
    { fullName: 'İrem Keskin', email: 'irem@yuk9.com', phone: '5552000009', role: 'yuk_veren' },
    { fullName: 'Kaan Erdoğan', email: 'kaan@yuk10.com', phone: '5552000010', role: 'yuk_veren' },
  ];
  for (const y of yukverenler) {
    await ds.query(`INSERT INTO "user" (email, phone, "passwordHash", "fullName", role, "isActive", "isPhoneVerified", "registrationStep") VALUES ($1,$2,$3,$4,$5,true,true,'completed') ON CONFLICT (email) DO NOTHING`,
      [y.email, y.phone, pwd, y.fullName, y.role]);
  }
  console.log('✅ 10 Yük Sahibi eklendi');

  // ── 10 Taşıyıcı ──
  const tasiyicilar = [
    { fullName: 'Levent Şahin', email: 'levent@tas1.com', phone: '5553000001', role: 'tasiyici', vehicleType: 'Çekici (TIR)', plateNumber: '34 ABC 101', tonnageCapacity: 25, volumeCapacity: 90, kBelgesi: 'K-101', srcBelgesi: 'SRC-101', iban: 'TR0000000001' },
    { fullName: 'Murat Doğan', email: 'murat@tas2.com', phone: '5553000002', role: 'tasiyici', vehicleType: 'Kamyon', plateNumber: '06 DEF 202', tonnageCapacity: 15, volumeCapacity: 60, kBelgesi: 'K-202', srcBelgesi: 'SRC-202', iban: 'TR0000000002' },
    { fullName: 'Nuriye Aktaş', email: 'nuriye@tas3.com', phone: '5553000003', role: 'tasiyici', vehicleType: 'Frigorifik Araç', plateNumber: '35 GHI 303', tonnageCapacity: 20, volumeCapacity: 80, kBelgesi: 'K-303', srcBelgesi: 'SRC-303', iban: 'TR0000000003' },
    { fullName: 'Orhan Yalçın', email: 'orhan@tas4.com', phone: '5553000004', role: 'tasiyici', vehicleType: 'Lowbed Çekici', plateNumber: '16 JKL 404', tonnageCapacity: 40, volumeCapacity: 0, kBelgesi: 'K-404', srcBelgesi: 'SRC-404', iban: 'TR0000000004' },
    { fullName: 'Pınar Özcan', email: 'pinar@tas5.com', phone: '5553000005', role: 'tasiyici', vehicleType: 'Tanker Çekici', plateNumber: '01 MNO 505', tonnageCapacity: 30, volumeCapacity: 0, kBelgesi: 'K-505', srcBelgesi: 'SRC-505', iban: 'TR0000000005' },
    { fullName: 'Recep Kurt', email: 'recep@tas6.com', phone: '5553000006', role: 'tasiyici', vehicleType: 'Kamyon', plateNumber: '07 PRS 606', tonnageCapacity: 12, volumeCapacity: 50, kBelgesi: 'K-606', srcBelgesi: 'SRC-606', iban: 'TR0000000006' },
    { fullName: 'Sema Taş', email: 'sema@tas7.com', phone: '5553000007', role: 'tasiyici', vehicleType: 'Çekici (TIR)', plateNumber: '42 TUV 707', tonnageCapacity: 26, volumeCapacity: 92, kBelgesi: 'K-707', srcBelgesi: 'SRC-707', iban: 'TR0000000007' },
    { fullName: 'Tolga Ünal', email: 'tolga@tas8.com', phone: '5553000008', role: 'tasiyici', vehicleType: 'Panelvan', plateNumber: '34 XYZ 808', tonnageCapacity: 3, volumeCapacity: 15, kBelgesi: 'K-808', srcBelgesi: 'SRC-808', iban: 'TR0000000008' },
    { fullName: 'Umut Sönmez', email: 'umut@tas9.com', phone: '5553000009', role: 'tasiyici', vehicleType: 'Kamyonet', plateNumber: '06 WOW 909', tonnageCapacity: 2, volumeCapacity: 8, kBelgesi: 'K-909', srcBelgesi: 'SRC-909', iban: 'TR0000000009' },
    { fullName: 'Vildan Eren', email: 'vildan@tas10.com', phone: '5553000010', role: 'tasiyici', vehicleType: 'Frigorifik Araç', plateNumber: '16 FRG 010', tonnageCapacity: 22, volumeCapacity: 85, kBelgesi: 'K-010', srcBelgesi: 'SRC-010', iban: 'TR0000000010' },
  ];
  for (const t of tasiyicilar) {
    await ds.query(`INSERT INTO "user" (email, phone, "passwordHash", "fullName", role, "vehicleType", "plateNumber", "tonnageCapacity", "volumeCapacity", "kBelgesi", "srcBelgesi", iban, "isActive", "isPhoneVerified", "registrationStep") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,true,'completed') ON CONFLICT (email) DO NOTHING`,
      [t.email, t.phone, pwd, t.fullName, t.role, t.vehicleType, t.plateNumber, t.tonnageCapacity, t.volumeCapacity, t.kBelgesi, t.srcBelgesi, t.iban]);
  }
  console.log('✅ 10 Taşıyıcı eklendi');

  // ── 10 Genel Kullanıcı ──
  const genel = [
    { fullName: 'Cansu Korkmaz', email: 'cansu@genel1.com', phone: '5554000001' },
    { fullName: 'Doruk Aydemir', email: 'doruk@genel2.com', phone: '5554000002' },
    { fullName: 'Elif Sancak', email: 'elif@genel3.com', phone: '5554000003' },
    { fullName: 'Ferhat Tunç', email: 'ferhat@genel4.com', phone: '5554000004' },
    { fullName: 'Gamze Uysal', email: 'gamze@genel5.com', phone: '5554000005' },
    { fullName: 'Harun Tekin', email: 'harun@genel6.com', phone: '5554000006' },
    { fullName: 'Işıl Bayram', email: 'isil@genel7.com', phone: '5554000007' },
    { fullName: 'Kemal Sezer', email: 'kemal@genel8.com', phone: '5554000008' },
    { fullName: 'Lale Durmaz', email: 'lale@genel9.com', phone: '5554000009' },
    { fullName: 'Mert Güven', email: 'mert@genel10.com', phone: '5554000010' },
  ];
  for (const g of genel) {
    await ds.query(`INSERT INTO "user" (email, phone, "passwordHash", "fullName", role, "isActive", "isPhoneVerified", "registrationStep") VALUES ($1,$2,$3,$4,'genel',true,true,'completed') ON CONFLICT (email) DO NOTHING`,
      [g.email, g.phone, pwd, g.fullName]);
  }
  console.log('✅ 10 Genel Kullanıcı eklendi');

  // ── 10 Restoran ──
  const restoranlar = [
    { name: 'Anadolu Sofrası', city: 'İstanbul', district: 'Tuzla', fullAddress: 'Tuzla OSB Mah. 1.Cad No:5', latitude: 40.82, longitude: 29.30, phone: '02165550001', description: 'Yöresel ev yemekleri, TIR parkı mevcut', hasTirParking: true, parkingCapacity: 15, avgRating: 4.2, totalRatings: 85 },
    { name: 'Köfteci Mehmet Usta', city: 'Ankara', district: 'Sincan', fullAddress: 'Sincan OSB 2.Sok No:12', latitude: 39.97, longitude: 32.58, phone: '03125550002', description: 'Meşhur ızgara köfte ve çorba çeşitleri', hasTirParking: true, parkingCapacity: 20, avgRating: 4.5, totalRatings: 120 },
    { name: 'Ege Lokantası', city: 'İzmir', district: 'Bornova', fullAddress: 'Bornova Cad. No:45', latitude: 38.46, longitude: 27.22, phone: '02325550003', description: 'Zeytinyağlılar ve ızgara balık', hasTirParking: true, parkingCapacity: 10, avgRating: 4.0, totalRatings: 65 },
    { name: 'Toros Dürüm Evi', city: 'Adana', district: 'Seyhan', fullAddress: 'Seyhan Bulvarı No:78', latitude: 36.99, longitude: 35.32, phone: '03225550004', description: 'Adana kebap, şırdan, şalgam', hasTirParking: true, parkingCapacity: 25, avgRating: 4.7, totalRatings: 200 },
    { name: 'Fırat Çiğ Köfte', city: 'Gaziantep', district: 'Şahinbey', fullAddress: 'Şahinbey Cad. No:33', latitude: 37.06, longitude: 37.38, phone: '03425550005', description: 'Çiğ köfte, lahmacun, baklava', hasTirParking: true, parkingCapacity: 12, avgRating: 4.3, totalRatings: 90 },
    { name: 'Karadeniz Pide Salonu', city: 'Trabzon', district: 'Ortahisar', fullAddress: 'Ortahisar Mah. Sahil Cad. No:7', latitude: 41.00, longitude: 39.72, phone: '04625550006', description: 'Karadeniz pidesi, kuymak, muhlama', hasTirParking: false, parkingCapacity: 5, avgRating: 4.1, totalRatings: 55 },
    { name: 'Marmara Dinlenme Tesisi', city: 'Bursa', district: 'Gemlik', fullAddress: 'Gemlik Yolu 15.Km', latitude: 40.43, longitude: 29.16, phone: '02245550007', description: '24 saat açık, zengin menü', hasTirParking: true, parkingCapacity: 30, avgRating: 3.8, totalRatings: 150 },
    { name: 'Akdeniz Balıkçısı', city: 'Antalya', district: 'Kepez', fullAddress: 'Kepez Mah. Liman Cad. No:22', latitude: 36.90, longitude: 30.70, phone: '02425550008', description: 'Günlük taze balık, deniz manzaralı', hasTirParking: true, parkingCapacity: 18, avgRating: 4.4, totalRatings: 110 },
    { name: 'Sultan Sofrası', city: 'Konya', district: 'Selçuklu', fullAddress: 'Selçuklu Cad. No:90', latitude: 37.87, longitude: 32.49, phone: '03325550009', description: 'Etli ekmek, fırın kebabı, tirit', hasTirParking: true, parkingCapacity: 22, avgRating: 4.6, totalRatings: 180 },
    { name: 'Boğaz Köftecisi', city: 'Kocaeli', district: 'Gebze', fullAddress: 'Gebze OSB Yanı No:3', latitude: 40.80, longitude: 29.43, phone: '02625550010', description: 'Köfte çeşitleri ve serpme kahvaltı', hasTirParking: true, parkingCapacity: 14, avgRating: 3.9, totalRatings: 70 },
  ];
  for (const r of restoranlar) {
    await ds.query(`INSERT INTO restaurants (name, city, district, "fullAddress", latitude, longitude, phone, description, "hasTirParking", "parkingCapacity", "avgRating", "totalRatings", "workingStatus", is247) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',true) ON CONFLICT DO NOTHING`,
      [r.name, r.city, r.district, r.fullAddress, r.latitude, r.longitude, r.phone, r.description, r.hasTirParking, r.parkingCapacity, r.avgRating, r.totalRatings]);
  }
  console.log('✅ 10 Restoran eklendi');

  // ── 10 Yakıt İstasyonu ──
  const istasyonlar = [
    { name: 'Shell Tuzla', brand: 'Shell', city: 'İstanbul', district: 'Tuzla', fullAddress: 'Tuzla OSB Girişi', latitude: 40.82, longitude: 29.31, phone: '02165556001' },
    { name: 'Opet Sincan', brand: 'Opet', city: 'Ankara', district: 'Sincan', fullAddress: 'Sincan OSB 1.Cad', latitude: 39.97, longitude: 32.59, phone: '03125556002' },
    { name: 'BP Bornova', brand: 'BP', city: 'İzmir', district: 'Bornova', fullAddress: 'Bornova Çevreyolu', latitude: 38.46, longitude: 27.23, phone: '02325556003' },
    { name: 'Petrol Ofisi Adana', brand: 'Petrol Ofisi', city: 'Adana', district: 'Seyhan', fullAddress: 'Seyhan Bulvarı No:100', latitude: 36.99, longitude: 35.33, phone: '03225556004' },
    { name: 'Shell Gaziantep', brand: 'Shell', city: 'Gaziantep', district: 'Şahinbey', fullAddress: 'Şahinbey Otoyol Çıkışı', latitude: 37.06, longitude: 37.39, phone: '03425556005' },
    { name: 'Total Bursa', brand: 'Total', city: 'Bursa', district: 'Gemlik', fullAddress: 'Gemlik Yolu 20.Km', latitude: 40.43, longitude: 29.17, phone: '02245556006' },
    { name: 'Opet Antalya', brand: 'Opet', city: 'Antalya', district: 'Kepez', fullAddress: 'Kepez Çevreyolu', latitude: 36.90, longitude: 30.71, phone: '02425556007' },
    { name: 'BP Konya', brand: 'BP', city: 'Konya', district: 'Selçuklu', fullAddress: 'Selçuklu Çevreyolu No:55', latitude: 37.87, longitude: 32.50, phone: '03325556008' },
    { name: 'Shell Kocaeli', brand: 'Shell', city: 'Kocaeli', district: 'Gebze', fullAddress: 'Gebze OSB Yanı', latitude: 40.80, longitude: 29.44, phone: '02625556009' },
    { name: 'Petrol Ofisi Mersin', brand: 'Petrol Ofisi', city: 'Mersin', district: 'Akdeniz', fullAddress: 'Akdeniz Liman Yolu No:8', latitude: 36.80, longitude: 34.63, phone: '03245556010' },
  ];
  for (const i of istasyonlar) {
    await ds.query(`INSERT INTO fuel_stations (name, brand, city, district, "fullAddress", latitude, longitude, phone, "workingStatus", is247) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',true) ON CONFLICT DO NOTHING`,
      [i.name, i.brand, i.city, i.district, i.fullAddress, i.latitude, i.longitude, i.phone]);
  }
  console.log('✅ 10 Yakıt İstasyonu eklendi');

  console.log('\n🎉 Tüm test verileri başarıyla eklendi!');
  console.log('   Şifre (tüm kullanıcılar): 123456');
  await app.close();
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
