import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './users/user.entity';
import { Load, LoadType, LoadStatus } from './loads/load.entity';
import { Bid, BidStatus } from './bids/bid.entity';
import { EscrowTransaction, EscrowStatus } from './escrow/escrow-transaction.entity';
import { Wallet } from './escrow/wallet.entity';
import { ExpenseCategory, ExpenseCategoryType } from './finance/expense-category.entity';
import { Expense } from './finance/expense.entity';
import { Income, IncomeType, IncomeSource } from './finance/income.entity';
import { Invoice, InvoiceType, InvoiceStatus } from './gib/invoice.entity';
import { InvoiceItem } from './gib/invoice-item.entity';
import { Restaurant, WorkingStatus, RestaurantImage, RestaurantImageType, Menu, MenuItem, RestaurantReview } from './restaurants';
import { FuelStation, WorkingStatus as FuelStationStatus } from './fuel-stations/fuel-station.entity';
import { FuelPrice, FuelType } from './fuel-stations/fuel-price.entity';
import { StationService, StationServiceType, ServiceCategory } from './fuel-stations/station-service.entity';
import { StationReview as FuelStationReview } from './fuel-stations/station-review.entity';
import { Announcement } from './announcements/announcement.entity';
import { Vehicle as VehicleEntity, VehiclePhoto as VehiclePhotoEntity, VehicleStatus } from './vehicles/vehicle.entity';
import { VehicleCategory as VehicleCategoryEntity } from './vehicles/category.entity';
import { VehicleListing as VehicleListingEntity, VehicleBid as VehicleBidEntity, SaleType, ListingStatus } from './vehicles/listing.entity';
import * as bcrypt from 'bcrypt';


// City coordinates for realistic distance calculations
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'İstanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'İzmir': { lat: 38.4192, lng: 27.1287 },
  'Bursa': { lat: 40.2669, lng: 29.0634 },
  'Antalya': { lat: 36.8841, lng: 30.7056 },
  'Adana': { lat: 37.0, lng: 35.3213 },
  'Konya': { lat: 37.8667, lng: 32.4831 },
  'Kocaeli': { lat: 40.7655, lng: 29.9408 },
  'Mersin': { lat: 36.8, lng: 34.6333 },
  'Gaziantep': { lat: 37.0667, lng: 37.3833 },
  'Samsun': { lat: 41.2867, lng: 36.33 },
  'Trabzon': { lat: 41.0, lng: 39.7167 },
  'Eskişehir': { lat: 39.7667, lng: 30.5167 },
  'Denizli': { lat: 37.7667, lng: 29.0833 },
  'Sivas': { lat: 39.75, lng: 37.0167 },
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const DISTRICTS: Record<string, string[]> = {
  'İstanbul': ['Kadıköy', 'Ümraniye', 'Pendik', 'Kartal', 'Tuzla', 'Maltepe', 'Ataşehir', 'Sultanbeyli'],
  'Ankara': ['Çankaya', 'Sincan', 'Yenimahalle', 'Etimesgut', 'Keçiören', 'Mamak', 'Altındağ', 'Gölbaşı'],
  'İzmir': ['Karşıyaka', 'Bornova', 'Konak', 'Buca', 'Çiğli', 'Menemen', 'Torbalı', 'Gaziemir'],
  'Bursa': ['Osmangazi', 'Yıldırım', 'Nilüfer', 'Mudanya', 'Gemlik', 'Gürsu', 'İnegöl', 'Karacabey'],
  'Antalya': ['Muratpaşa', 'Konyaaltı', 'Kepez', 'Alanya', 'Manavgat', 'Serik', 'Kumluca', 'Finike'],
};

async function seed() {
  const app = await NestFactory.create(AppModule);
  const userRepo = app.get(getRepositoryToken(User));
  const loadRepo = app.get(getRepositoryToken(Load));
  const bidRepo = app.get(getRepositoryToken(Bid));
  const escrowRepo = app.get(getRepositoryToken(EscrowTransaction));
  const walletRepo = app.get(getRepositoryToken(Wallet));
  const categoryRepo = app.get(getRepositoryToken(ExpenseCategory));
  const expenseRepo = app.get(getRepositoryToken(Expense));
  const incomeRepo = app.get(getRepositoryToken(Income));
  const invoiceRepo = app.get(getRepositoryToken(Invoice));
  const invoiceItemRepo = app.get(getRepositoryToken(InvoiceItem));
  
  const restaurantRepo = app.get(getRepositoryToken(Restaurant));
  const restaurantImageRepo = app.get(getRepositoryToken(RestaurantImage));
  const menuRepo = app.get(getRepositoryToken(Menu));
  const menuItemRepo = app.get(getRepositoryToken(MenuItem));
  const restaurantReviewRepo = app.get(getRepositoryToken(RestaurantReview));

  const fuelStationRepo = app.get(getRepositoryToken(FuelStation));
  const fuelPriceRepo = app.get(getRepositoryToken(FuelPrice));
  const fuelServiceRepo = app.get(getRepositoryToken(StationService));
  const fuelReviewRepo = app.get(getRepositoryToken(FuelStationReview));
  const announcementRepo = app.get(getRepositoryToken(Announcement));

  // Clear existing database tables
  await announcementRepo.query('DELETE FROM announcements');
  await bidRepo.query('DELETE FROM bids');
  await escrowRepo.query('DELETE FROM escrow_transactions');
  await escrowRepo.query('DELETE FROM disputes');
  await escrowRepo.query('DELETE FROM wallet_transactions');
  await loadRepo.query('DELETE FROM loads');
  await expenseRepo.query('DELETE FROM expenses');
  // Truncate all user-data tables
  const dbType = userRepo.manager.connection.options.type;
  if (dbType === 'postgres') {
    await userRepo.query(`
      DO $$ DECLARE r RECORD; BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('migrations','typeorm_metadata','kaptan_migrations')) LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
  } else {
    // SQLite fallback: delete from known tables
    const tables = ['escrow_transactions','disputes','wallet_transactions','loads','bids','invoices','invoice_items','expenses','incomes','tracking_record','notifications','chat_messages','chat_rooms','qr_codes','withdrawal_requests','user_subscriptions'];
    for (const t of tables) {
      try { await userRepo.query('DELETE FROM ' + t); } catch {}
    }
  }

  const passwordHash = await bcrypt.hash('123456', 12);
  const superAdminPasswordHash = await bcrypt.hash('Alp5326741416', 12);

  // ======== 1. SEED 10 USERS (INCLUDING İLYAS DURAN SUPER ADMIN) ========
  const users = [];
  const userData = [
    { email: 'ilyas_duran@hotmail.com', phone: '05320000000', fullName: 'İlyas Duran', role: UserRole.SUPER_ADMIN, plate: '34 ILY 55' },
    { email: 'mehmet@kaptan.com', phone: '05320000001', fullName: 'Mehmet Yılmaz', role: UserRole.TASIYICI, vehicleType: 'Çekici (TIR)', tonnage: 24, volume: 90, plate: '34 ABC 123' },
    { email: 'ayse@kaptan.com', phone: '05320000002', fullName: 'Ayşe Demir', role: UserRole.TASIYICI, vehicleType: 'Kamyon', tonnage: 12, volume: 45, plate: '35 XYZ 456' },
    { email: 'ali@kaptan.com', phone: '05320000003', fullName: 'Ali Kaya', role: UserRole.TASIYICI, vehicleType: 'Frigorifik Araç', tonnage: 18, volume: 70, plate: '16 JKL 789' },
    { email: 'veli@kaptan.com', phone: '05320000004', fullName: 'Veli Şahin', role: UserRole.TASIYICI, vehicleType: 'Kırkayak Kamyon', tonnage: 20, volume: 80, plate: '06 MNO 321' },
    { email: 'zeynep@kaptan.com', phone: '05320000006', fullName: 'Zeynep Ak', role: UserRole.YUK_VEREN },
    { email: 'ahmet@kaptan.com', phone: '05320000007', fullName: 'Ahmet Öztürk', role: UserRole.YUK_VEREN },
    { email: 'mustafa@kaptan.com', phone: '05320000008', fullName: 'Mustafa Koç', role: UserRole.YUK_VEREN },
    { email: 'elif@kaptan.com', phone: '05320000009', fullName: 'Elif Kara', role: UserRole.FILO_YONETICISI, vehicleType: 'Çekici (TIR)', tonnage: 28, volume: 95, plate: '34 UVW 987' },
    { email: 'emre@kaptan.com', phone: '05320000010', fullName: 'Emre Yıldız', role: UserRole.SOFOR, vehicleType: 'Kamyon', tonnage: 10, volume: 40, plate: '41 RST 555' },
  ];

  for (const d of userData) {
    const isSuperAdmin = d.role === UserRole.SUPER_ADMIN;
    const u = await userRepo.save({
      email: d.email,
      phone: d.phone,
      passwordHash: isSuperAdmin ? superAdminPasswordHash : passwordHash,
      fullName: d.fullName,
      role: d.role,
      isActive: true,
      vehicleType: d.vehicleType || null,
      tonnageCapacity: d.tonnage || null,
      volumeCapacity: d.volume || null,
      plateNumber: d.plate || null,
      licenseNumber: d.plate ? `EH-${Math.floor(100000 + Math.random() * 900000)}` : null,
      kBelgesi: d.role === UserRole.TASIYICI || d.role === UserRole.SUPER_ADMIN ? `K-${Math.floor(10000 + Math.random() * 90000)}` : null,
      srcBelgesi: d.role === UserRole.TASIYICI || d.role === UserRole.SUPER_ADMIN ? `SRC-${Math.floor(10000 + Math.random() * 90000)}` : null,
      iban: d.role === UserRole.TASIYICI || d.role === UserRole.SUPER_ADMIN ? `TR${Math.floor(Math.random() * 1000000000000000000)}` : null,
      taxNumber: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      taxOffice: ['Kadıköy VD', 'Şişli VD', 'Çankaya VD', 'Konak VD', 'Nilüfer VD'][Math.floor(Math.random() * 5)],
      escrowAccountVerified: true,
      rating: +(4 + Math.random()).toFixed(1),
      completedLoads: Math.floor(Math.random() * 50),
    });
    users.push(u);
  }

  const superAdmin = users[0];

  // Wallets for all users
  for (const user of users) {
    await walletRepo.save({
      userId: user.id,
      availableBalance: 250000 + Math.floor(Math.random() * 75000),
      escrowBalance: 0,
      pendingRelease: 0,
    });
  }

  // ======== 2. SEED 12 LOADS ========
  const loadDefs: any[] = [
    { title: '28 Ton Kömür Sevkiyatı', type: LoadType.TAM_YUK, from: 'Zonguldak', to: 'İstanbul', vehicle: 'Çekici (TIR)', trailer: 'Tenteli Dorse', weight: 28000, tonnage: 28, escrow: true, insurance: true, price: 25000, pickupDate: '2026-05-22', deliveryDate: '2026-05-25', creatorIdx: 5 },
    { title: 'Elektronik Parça Kısmi Yük', type: LoadType.KISMI_YUK, from: 'İstanbul', to: 'Ankara', vehicle: 'Kamyon', trailer: 'Damper Dorse', weight: 8000, tonnage: 8, volume: 20, escrow: true, insurance: true, price: 12000, partCount: 50, pickupDate: '2026-05-23', deliveryDate: '2026-05-25', creatorIdx: 6 },
    { title: '3+1 Ev Eşyası Taşıma', type: LoadType.EVDEN_EVE, from: 'Ankara', to: 'İzmir', vehicle: 'Kamyon', weight: 6000, price: 18000, escrow: true, pickupDate: '2026-05-24', deliveryDate: '2026-05-28', creatorIdx: 5, transportType: 'Ev Eşyası', packaging: true },
    { title: 'Soğuk Zincir Gıda Ürünleri', type: LoadType.TAM_YUK, from: 'Bursa', to: 'Antalya', vehicle: 'Frigorifik Araç', trailer: 'Frigorifik Dorse', weight: 15000, tonnage: 15, coldChain: true, escrow: true, insurance: true, price: 22000, pickupDate: '2026-05-21', deliveryDate: '2026-05-24', creatorIdx: 6 },
    { title: 'İnşaat Malzemesi Nakliyesi', type: LoadType.TAM_YUK, from: 'Kocaeli', to: 'Samsun', vehicle: 'Kırkayak Kamyon', trailer: 'Platform Dorse', weight: 22000, tonnage: 22, escrow: false, insurance: true, price: 28000, pickupDate: '2026-05-25', deliveryDate: '2026-05-28', creatorIdx: 7 },
    { title: 'Kimyasal Hammadde Kısmi Yük', type: LoadType.KISMI_YUK, from: 'İzmir', to: 'Konya', vehicle: 'Tanker Çekici', trailer: 'Tanker Dorse', weight: 12000, tonnage: 12, volume: 30, escrow: true, insurance: true, price: 15000, partCount: 30, pickupDate: '2026-05-22', deliveryDate: '2026-05-24', creatorIdx: 7 },
    { title: 'Şehir İçi Hafif Nakliye', type: LoadType.SEHIR_ICI, from: 'İstanbul', to: 'İstanbul', vehicle: 'Kamyonet', weight: 2000, cityUrgency: 'Aynı Gün', price: 4000, loadSize: 'Küçük', pickupDate: '2026-05-20', deliveryDate: '2026-05-20', creatorIdx: 5 },
    { title: 'Lowbed İş Makinesi Taşıma', type: LoadType.TAM_YUK, from: 'Ankara', to: 'Gaziantep', vehicle: 'Lowbed Çekici', trailer: 'Lowbed Dorse', weight: 35000, tonnage: 35, escrow: true, insurance: true, price: 45000, pickupDate: '2026-05-26', deliveryDate: '2026-05-30', creatorIdx: 6 },
    { title: 'Mega Dorse Koli Yük', type: LoadType.KISMI_YUK, from: 'İstanbul', to: 'Trabzon', vehicle: 'Çekici (TIR)', trailer: 'Mega Dorse', weight: 10000, tonnage: 10, volume: 55, escrow: false, insurance: false, price: 16000, partCount: 80, pickupDate: '2026-05-24', deliveryDate: '2026-05-27', creatorIdx: 7 },
    { title: 'Paletli Gıda Dağıtımı', type: LoadType.TAM_YUK, from: 'Mersin', to: 'Sivas', vehicle: 'Kamyon', trailer: 'Tenteli Dorse', weight: 18000, tonnage: 18, escrow: true, insurance: true, price: 20000, pickupDate: '2026-05-23', deliveryDate: '2026-05-26', creatorIdx: 6 },
    { title: 'Demir Çelik Sac Rulo', type: LoadType.TAM_YUK, from: 'Kocaeli', to: 'İzmir', vehicle: 'Çekici (TIR)', trailer: 'Damper Dorse', weight: 26000, tonnage: 26, escrow: true, insurance: true, price: 31000, pickupDate: '2026-05-27', deliveryDate: '2026-05-29', creatorIdx: 5 },
    { title: 'Hazır Giyim Tekstil Kolileri', type: LoadType.KISMI_YUK, from: 'İstanbul', to: 'Bursa', vehicle: 'Kamyon', trailer: 'Tenteli Dorse', weight: 4000, tonnage: 4, volume: 15, escrow: true, insurance: true, price: 8500, pickupDate: '2026-05-28', deliveryDate: '2026-05-29', creatorIdx: 7 }
  ];

  const loads = [];
  for (const d of loadDefs) {
    const fromCoords = CITY_COORDS[d.from] || { lat: 39.0, lng: 35.0 };
    const toCoords = CITY_COORDS[d.to] || { lat: 39.0, lng: 35.0 };
    const routeDistance = calculateDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);

    const load = await loadRepo.save({
      title: d.title,
      loadType: d.type,
      fromCity: d.from,
      fromDistrict: DISTRICTS[d.from] ? DISTRICTS[d.from][Math.floor(Math.random() * DISTRICTS[d.from].length)] : 'Merkez',
      fromAddress: `${d.from} OSB Mah. Sanayi Cad. No:${Math.floor(10 + Math.random() * 100)}`,
      toCity: d.to,
      toDistrict: DISTRICTS[d.to] ? DISTRICTS[d.to][Math.floor(Math.random() * DISTRICTS[d.to].length)] : 'Merkez',
      toAddress: `${d.to} Sanayi Bölgesi No:${Math.floor(1 + Math.random() * 50)}`,
      pickupLatitude: +(fromCoords.lat + (Math.random() - 0.5) * 0.1).toFixed(4),
      pickupLongitude: +(fromCoords.lng + (Math.random() - 0.5) * 0.1).toFixed(4),
      deliveryLatitude: +(toCoords.lat + (Math.random() - 0.5) * 0.1).toFixed(4),
      deliveryLongitude: +(toCoords.lng + (Math.random() - 0.5) * 0.1).toFixed(4),
      contactName: users[d.creatorIdx].fullName,
      contactPhone: users[d.creatorIdx].phone,
      pickupDate: d.pickupDate,
      deliveryDate: d.deliveryDate,
      description: `${d.title} - ${d.from} → ${d.to}`,
      vehicleType: d.vehicle || null,
      trailerType: d.trailer || null,
      totalWeight: d.weight,
      totalTonnage: d.tonnage || null,
      escrow: d.escrow || false,
      insurance: d.insurance || false,
      totalPrice: d.price,
      pricingType: d.type === LoadType.KISMI_YUK ? 'tonaj' : 'komple',
      routeDistance,
      creatorId: users[d.creatorIdx].id,
      status: LoadStatus.BEKLEMEDE,
      bidCount: 0,
    });
    loads.push(load);
  }

  // ======== 3. SEED 7 EXPENSE CATEGORIES ========
  const categoriesData = [
    { nameTr: 'Akaryakıt (Dizel)', nameEn: 'Fuel', icon: 'local-gas-station', colorCode: '#EF4444' },
    { nameTr: 'Yol ve Köprü Geçişleri', nameEn: 'Tolls & Bridges', icon: 'add-road', colorCode: '#3B82F6' },
    { nameTr: 'Araç Bakım & Onarım', nameEn: 'Maintenance & Repair', icon: 'build', colorCode: '#F59E0B' },
    { nameTr: 'Yemek & Kumanya', nameEn: 'Meals', icon: 'restaurant', colorCode: '#10B981' },
    { nameTr: 'Konaklama', nameEn: 'Lodging', icon: 'hotel', colorCode: '#8B5CF6' },
    { nameTr: 'Taşıt Sigortası (Kasko/ZMM)', nameEn: 'Insurance', icon: 'shield', colorCode: '#EC4899' },
    { nameTr: 'Diğer Lojistik Masrafları', nameEn: 'Other Logistics', icon: 'more-horiz', colorCode: '#6B7280' },
  ];

  const categories = [];
  for (const c of categoriesData) {
    const cat = await categoryRepo.save({
      nameTr: c.nameTr,
      nameEn: c.nameEn,
      type: ExpenseCategoryType.LOGISTICS,
      icon: c.icon,
      colorCode: c.colorCode,
    });
    categories.push(cat);
  }

  // ======== 4. SEED 20 EXPENSE RECORDS ========
  const expensesData = [
    { amount: 4500, categoryIdx: 0, desc: 'TIR Mazot Alımı - Shell', daysAgo: 1, userIdx: 0 },
    { amount: 850, categoryIdx: 1, desc: 'Osmangazi Köprüsü Geçişi', daysAgo: 1, userIdx: 0 },
    { amount: 350, categoryIdx: 3, desc: 'Yol Üstü Dinlenme Tesisi Akşam Yemeği', daysAgo: 2, userIdx: 0 },
    { amount: 12000, categoryIdx: 2, desc: '100,000 Km Ağır Bakım Servisi', daysAgo: 5, userIdx: 0 },
    { amount: 6500, categoryIdx: 5, desc: 'Yıllık Kasko Sigorta Poliçesi Taksiti', daysAgo: 10, userIdx: 0 },
    
    { amount: 3800, categoryIdx: 0, desc: 'Dizel Yakıt Alımı - Opet', daysAgo: 3, userIdx: 1 },
    { amount: 420, categoryIdx: 1, desc: 'Yavuz Sultan Selim Köprüsü HGS', daysAgo: 2, userIdx: 1 },
    { amount: 1500, categoryIdx: 4, desc: 'Şoför Konaklama - Bolu Öğretmenevi', daysAgo: 4, userIdx: 1 },
    { amount: 2800, categoryIdx: 2, desc: 'Dorse Lastik Değişimi', daysAgo: 8, userIdx: 1 },
    
    { amount: 5200, categoryIdx: 0, desc: 'Yakıt Alımı - Petrol Ofisi', daysAgo: 1, userIdx: 2 },
    { amount: 980, categoryIdx: 1, desc: 'Niğde-Ankara Otoyol Geçişi', daysAgo: 1, userIdx: 2 },
    { amount: 220, categoryIdx: 3, desc: 'Sabah Kahvaltısı ve Su Alımı', daysAgo: 2, userIdx: 2 },
    
    { amount: 4800, categoryIdx: 0, desc: 'Dizel Mazot Dolumu', daysAgo: 3, userIdx: 3 },
    { amount: 560, categoryIdx: 1, desc: 'Kuzey Marmara Otoyolu Geçişi', daysAgo: 2, userIdx: 3 },
    { amount: 3100, categoryIdx: 2, desc: 'Ön Balata Değişimi', daysAgo: 7, userIdx: 3 },
    
    { amount: 6200, categoryIdx: 0, desc: 'Total Akaryakıt Alımı', daysAgo: 4, userIdx: 4 },
    { amount: 1100, categoryIdx: 1, desc: 'Avrasya Tüneli Çift Yön Geçiş', daysAgo: 3, userIdx: 4 },
    { amount: 450, categoryIdx: 3, desc: 'Şoför Yol Kumanyası', daysAgo: 4, userIdx: 4 },
    { amount: 1600, categoryIdx: 4, desc: 'Otokoç Dinlenme İstasyonu Konaklama', daysAgo: 5, userIdx: 4 },
    { amount: 1500, categoryIdx: 6, desc: 'Kantar ve Muayene Harç Bedeli', daysAgo: 6, userIdx: 4 }
  ];

  for (const e of expensesData) {
    const expenseDate = new Date();
    expenseDate.setDate(expenseDate.getDate() - e.daysAgo);
    
    await expenseRepo.save({
      userId: users[e.userIdx].id,
      categoryId: categories[e.categoryIdx].id,
      amount: e.amount,
      currency: 'TRY',
      date: expenseDate,
      taxStatus: true,
      paymentMethod: ['Kredi Kartı', 'HGS/Otomatik', 'Nakit'][Math.floor(Math.random() * 3)],
      isDeleted: false,
    });
  }

  // ======== 5. SEED 15 INCOME RECORDS ========
  const incomesData = [
    { amount: 25000, type: IncomeType.TASIMA_KAZANCI, desc: 'İstanbul-Ankara Kömür Nakliyesi Hakedişi', daysAgo: 1, userIdx: 0 },
    { amount: 12000, type: IncomeType.TASIMA_KAZANCI, desc: 'Kısmi Yük Elektronik Dağıtım Bedeli', daysAgo: 2, userIdx: 0 },
    { amount: 35000, type: IncomeType.MAAS, desc: 'Kaptan Şoför Aylık Maaş Ödemesi', daysAgo: 15, userIdx: 0 },
    { amount: 4500, type: IncomeType.DIGER, desc: 'Yol Harcırahı Geri Ödemesi', daysAgo: 3, userIdx: 0 },
    
    { amount: 18000, type: IncomeType.TASIMA_KAZANCI, desc: 'Ankara-İzmir Ev Eşyası Taşıma Hakedişi', daysAgo: 4, userIdx: 1 },
    { amount: 22000, type: IncomeType.TASIMA_KAZANCI, desc: 'Bursa-Antalya Soğuk Zincir Dağıtım Bedeli', daysAgo: 6, userIdx: 1 },
    { amount: 8000, type: IncomeType.TICARI_KAZANC, desc: 'Alt Yüklenici Komisyon Bedeli', daysAgo: 10, userIdx: 1 },
    
    { amount: 28000, type: IncomeType.TASIMA_KAZANCI, desc: 'Kocaeli-Samsun İnşaat Malzemesi Taşımacılığı', daysAgo: 2, userIdx: 2 },
    { amount: 15000, type: IncomeType.TASIMA_KAZANCI, desc: 'İzmir-Konya Kimyasal Hammadde Nakliyesi', daysAgo: 5, userIdx: 2 },
    
    { amount: 4000, type: IncomeType.TASIMA_KAZANCI, desc: 'İstanbul İçi Panelvan Dağıtım Hakedişi', daysAgo: 1, userIdx: 3 },
    { amount: 45000, type: IncomeType.TASIMA_KAZANCI, desc: 'Ankara-Gaziantep Ağır İş Makinesi Taşıma Bedeli', daysAgo: 7, userIdx: 3 },
    
    { amount: 16000, type: IncomeType.TASIMA_KAZANCI, desc: 'Trabzon Seferi Komple Dorse Taşıma Hakedişi', daysAgo: 3, userIdx: 4 },
    { amount: 20000, type: IncomeType.TASIMA_KAZANCI, desc: 'Mersin-Sivas Paletli Gıda Dağıtım Hakedişi', daysAgo: 5, userIdx: 4 },
    { amount: 31000, type: IncomeType.TASIMA_KAZANCI, desc: 'Sac Rulo Demir Çelik Nakliye Bedeli', daysAgo: 8, userIdx: 4 },
    { amount: 8500, type: IncomeType.TASIMA_KAZANCI, desc: 'Hazır Giyim Tekstil Sevkiyat Kazancı', daysAgo: 9, userIdx: 4 }
  ];

  for (const inc of incomesData) {
    const incomeDate = new Date();
    incomeDate.setDate(incomeDate.getDate() - inc.daysAgo);
    
    await incomeRepo.save({
      userId: users[inc.userIdx].id,
      type: inc.type,
      amount: inc.amount,
      currency: 'TRY',
      date: incomeDate,
      paymentMethod: 'Banka Havalesi (EFT)',
      description: inc.desc,
      source: IncomeSource.AUTO,
      isDeleted: false,
    });
  }

  // ======== 6. SEED 15 INVOICES WITH ITEMS ========
  const invoiceData = [
    { type: InvoiceType.E_FATURA, no: 'FA20260501080000001', typeStr: 'e_fatura', scenario: 'TEMEL', userIdx: 0, clientName: 'Lojistik Depolama A.Ş.', clientTax: '1234567890', subtotal: 25000, vat: 5000, grand: 30000, desc: 'Tır Komple Taşımacılık Hizmeti' },
    { type: InvoiceType.E_ARSIV, no: 'AR20260501080000002', typeStr: 'e_arsiv', scenario: 'TICARI', userIdx: 0, clientName: 'Ahmet Yılmaz (Bireysel)', clientTax: '11111111111', subtotal: 12000, vat: 2400, grand: 14400, desc: 'Evden Eve Ev Eşyası Taşıma Hizmeti Bedeli' },
    { type: InvoiceType.TEMEL, no: 'TM20260501080000003', typeStr: 'temel', scenario: 'TEMEL', userIdx: 0, clientName: 'Gıda Pazarlama Ltd. Şti.', clientTax: '9876543210', subtotal: 22000, vat: 4400, grand: 26400, desc: 'Soğuk Zincir Frigo Taşımacılık Bedeli' },
    { type: InvoiceType.TICARI, no: 'TC20260501080000004', typeStr: 'ticari', scenario: 'TICARI', userIdx: 0, clientName: 'Metalurji Sanayi Tic. A.Ş.', clientTax: '5555555555', subtotal: 31000, vat: 6200, grand: 37200, desc: 'Sac Rulo Demir Çelik Nakliye Hizmeti' },
    { type: InvoiceType.E_IRSALIYE, no: 'IR20260501080000005', typeStr: 'e_irsaliye', scenario: 'TEMEL', userIdx: 0, clientName: 'İnşaat Malzemeleri A.Ş.', clientTax: '4444444444', subtotal: 28000, vat: 5600, grand: 33600, desc: 'Kanca Demir Çimento Sevkiyat İrsaliyesi' },
    
    { type: InvoiceType.E_FATURA, no: 'FA20260501080000006', typeStr: 'e_fatura', scenario: 'TEMEL', userIdx: 1, clientName: 'Antalya Meyve Sebze Halcilik', clientTax: '2222222222', subtotal: 18000, vat: 3600, grand: 21600, desc: 'Narenciye Kasaları Sevk Hizmeti' },
    { type: InvoiceType.E_ARSIV, no: 'AR20260501080000007', typeStr: 'e_arsiv', scenario: 'TICARI', userIdx: 1, clientName: 'Ayşe Demir (Şahıs)', clientTax: '22222222222', subtotal: 6500, vat: 1300, grand: 7800, desc: 'Kısmi Ofis Eşyası Taşıma Ücreti' },
    { type: InvoiceType.TEMEL, no: 'TM20260501080000008', typeStr: 'temel', scenario: 'TEMEL', userIdx: 1, clientName: 'Bursa Otomotiv Yan Sanayi', clientTax: '3333333333', subtotal: 15000, vat: 3000, grand: 18000, desc: 'Paletli Yedek Parça Taşımacılığı' },
    
    { type: InvoiceType.E_FATURA, no: 'FA20260501080000009', typeStr: 'e_fatura', scenario: 'TEMEL', userIdx: 2, clientName: 'Samsun Un Fabrikaları A.Ş.', clientTax: '8888888888', subtotal: 24000, vat: 4800, grand: 28800, desc: 'Un Çuvalı Komple TIR Taşıma Bedeli' },
    { type: InvoiceType.E_ARSIV, no: 'AR20260501080000010', typeStr: 'e_arsiv', scenario: 'TICARI', userIdx: 2, clientName: 'Konya Tarım Kooperatifi', clientTax: '7777777777', subtotal: 12500, vat: 2500, grand: 15000, desc: 'Tarım Gübresi Kısmi Nakliye Hizmeti' },
    
    { type: InvoiceType.E_FATURA, no: 'FA20260501080000011', typeStr: 'e_fatura', scenario: 'TEMEL', userIdx: 3, clientName: 'Adana Mensucat Fabrikası', clientTax: '6666666666', subtotal: 19000, vat: 3800, grand: 22800, desc: 'Tekstil Hammadde Bobin Sevkiyatı' },
    { type: InvoiceType.E_IRSALIYE, no: 'IR20260501080000012', typeStr: 'e_irsaliye', scenario: 'TEMEL', userIdx: 3, clientName: 'Gaziantep Plastik Sanayi', clientTax: '4545454545', subtotal: 26000, vat: 5200, grand: 31200, desc: 'Plastik Hammadde Granül Taşıma İrsaliyesi' },
    
    { type: InvoiceType.E_FATURA, no: 'FA20260501080000013', typeStr: 'e_fatura', scenario: 'TEMEL', userIdx: 4, clientName: 'Trabzon Balıkçılık Ticaret', clientTax: '9090909090', subtotal: 14000, vat: 2800, grand: 16800, desc: 'Soğuk Hava Kasalı Balık Sevkiyat Bedeli' },
    { type: InvoiceType.E_ARSIV, no: 'AR20260501080000014', typeStr: 'e_arsiv', scenario: 'TICARI', userIdx: 4, clientName: 'Mersin Narenciye İthalat', clientTax: '1010101010', subtotal: 33000, vat: 6600, grand: 39600, desc: 'Limon Paletleri Komple TIR Nakliyesi' },
    { type: InvoiceType.TEMEL, no: 'TM20260501080000015', typeStr: 'temel', scenario: 'TEMEL', userIdx: 4, clientName: 'Sivas Çimento Sanayi', clientTax: '3030303030', subtotal: 20000, vat: 4000, grand: 24000, desc: 'Dökme Çimento Yapı Malzemesi Taşımacılığı' }
  ];

  for (const inv of invoiceData) {
    const senderJson = JSON.stringify({
      name: 'KAPTAN LOJİSTİK VE TAŞIMACILIK A.Ş.',
      taxNumber: users[inv.userIdx].taxNumber || '9990008881',
      taxOffice: users[inv.userIdx].taxOffice || 'Kadıköy VD',
      address: 'Ataşehir Lojistik Plaza Kat:4 No:12 İstanbul',
    });

    const receiverJson = JSON.stringify({
      name: inv.clientName,
      taxNumber: inv.clientTax,
      taxOffice: 'Sanayi Vergi Dairesi',
      address: 'Organize Sanayi Bölgesi 2. Cadde Ankara',
    });

    const invoice = await invoiceRepo.save({
      companyId: users[inv.userIdx].id,
      customerId: users[(inv.userIdx + 1) % users.length].id,
      invoiceType: inv.type,
      invoiceNo: inv.no,
      ettn: `f3781fb9-521c-4b0f-aef1-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      scenario: inv.scenario,
      currency: 'TRY',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      status: InvoiceStatus.SENT,
      senderJson,
      receiverJson,
      subtotal: inv.subtotal,
      discountTotal: 0,
      vatTotal: inv.vat,
      withholdingTotal: 0,
      grandTotal: inv.grand,
      paidAmount: 0,
      plateNumber: users[inv.userIdx].plateNumber || '34 ILY 55',
      driverTcNo: '12345678901',
      shippingAddress: 'Lojistik Sevkiyat Noktası A blok Şekerpınar Kocaeli',
      transportType: 'Karayolu',
      createdById: users[inv.userIdx].id,
    });

    // Create Invoice Item
    await invoiceItemRepo.save({
      invoiceId: invoice.id,
      lineNo: 1,
      productCode: 'LOJ-001',
      description: inv.desc,
      quantity: 1,
      unit: 'Adet',
      unitPrice: inv.subtotal,
      discountPct: 0,
      vatRate: 20,
      vatAmount: inv.vat,
      withholdingRate: 0,
      withholdingAmount: 0,
      lineTotal: inv.grand,
    });
  }

  // ======== 7. SEED BIDS ========
  const carrierUsers = users.filter(u => u.role === UserRole.TASIYICI || u.role === UserRole.SUPER_ADMIN);
  for (let i = 0; i < Math.min(5, loads.length); i++) {
    const load = loads[i];
    const carrier = carrierUsers[i % carrierUsers.length];
    const bidAmount = load.totalPrice ? Math.round(load.totalPrice * (0.90 + Math.random() * 0.05)) : 15000;
    const commission = Math.round(bidAmount * 0.08);
    const escrowFee = Math.round(bidAmount * 0.03);
    const vat = Math.round(bidAmount * 0.20);
    const netAmount = bidAmount - commission - escrowFee;

    await bidRepo.save({
      loadId: load.id,
      carrierId: carrier.id,
      amount: bidAmount,
      note: `${Math.floor(2 + Math.random() * 3)} gün içinde teslim edilir.`,
      estimatedDeliveryDays: Math.floor(2 + Math.random() * 3),
      hasReturnLoad: Math.random() > 0.5,
      pickupTime: `09:00`,
      requestEscrow: true,
      validUntil: new Date(Date.now() + 3 * 86400000),
      status: i === 0 ? BidStatus.ACCEPTED : BidStatus.PENDING,
      platformCommission: commission,
      escrowFee,
      vat,
      netAmount,
    });
  }

  // ======== 8. SEED ESCROW ========
  if (loads.length > 0) {
    const firstBid = await bidRepo.findOne({ where: { loadId: loads[0].id } });
    if (firstBid) {
      await escrowRepo.save({
        loadId: loads[0].id,
        shipperId: loads[0].creatorId,
        carrierId: firstBid.carrierId,
        amount: firstBid.amount,
        status: EscrowStatus.BLOKEDE,
      });
    }
  }

  // ======== 9. SEED 10 REAL HIGHWAY RESTAURANTS ========
  const realRestaurants = [
    {
      name: 'Bolu Dağı Bereket Dinlenme Tesisi',
      city: 'Bolu',
      district: 'Merkez',
      fullAddress: 'Bolu Dağı Geçidi D-100 Karayolu No:45 Bolu',
      latitude: 40.7381,
      longitude: 31.4982,
      phone: '0374 257 11 22',
      email: 'bereket@boludagi.com',
      website: 'www.bolubereket.com',
      description: 'Bolu Dağı’nın eşsiz manzarasında, tır şoförlerimize özel geniş otoparkı ve efsanevi çorba çeşitleriyle 24 saat hizmetinizdeyiz.',
      hasTirParking: true,
      parkingCapacity: 100,
      is247: true,
      averageRating: 4.8,
      reviewCount: 3
    },
    {
      name: 'Köfteci Yusuf - Bozüyük Dinlenme İstasyonu',
      city: 'Bilecik',
      district: 'Bozüyük',
      fullAddress: 'İstanbul-Antalya Yolu 3. Km Bozüyük Bilecik',
      latitude: 39.9022,
      longitude: 30.0384,
      phone: '444 61 62',
      email: 'bozuyuk@kofteciyusuf.com',
      website: 'www.kofteciyusuf.com',
      description: 'Yol üstündeki en lezzetli mola noktanız. Geniş park alanı, hızlı servis ve tır şoförlerimize özel indirimlerle hizmetinizdeyiz.',
      hasTirParking: true,
      parkingCapacity: 150,
      is247: true,
      averageRating: 4.6,
      reviewCount: 2
    },
    {
      name: 'Derince Tır Mola Tesisleri',
      city: 'Kocaeli',
      district: 'Derince',
      fullAddress: 'E-80 Otoyolu Derince Çıkışı No:10 Kocaeli',
      latitude: 40.7712,
      longitude: 29.8251,
      phone: '0262 239 44 55',
      email: 'derincetir@mola.com',
      website: 'www.derincetirmola.com',
      description: 'Güvenli tır park alanı, banyo/dinlenme odaları ve 24 saat sıcak çorba ile liman öncesi en önemli mola noktanız.',
      hasTirParking: true,
      parkingCapacity: 80,
      is247: true,
      averageRating: 4.5,
      reviewCount: 2
    },
    {
      name: 'Adana Pozantı Akün Dinlenme Tesisleri',
      city: 'Adana',
      district: 'Pozantı',
      fullAddress: 'Adana-Ankara Otoyolu Pozantı Geçişi Akün Tesisleri Adana',
      latitude: 37.4265,
      longitude: 34.8692,
      phone: '0322 581 22 33',
      email: 'akun@akun.com',
      website: 'www.akuntesisi.com',
      description: 'Toros Dağları eteklerinde, Adana Kebabı ve saç kavurmasıyla ünlü, tır parklı meşhur mola noktanız.',
      hasTirParking: true,
      parkingCapacity: 90,
      is247: true,
      averageRating: 4.7,
      reviewCount: 2
    },
    {
      name: 'Kaynaşlı Karadeniz Tır Parkı & Pide Salonu',
      city: 'Düzce',
      district: 'Kaynaşlı',
      fullAddress: 'O-4 Otoyolu Kaynaşlı Kavşağı No:3 Düzce',
      latitude: 40.7854,
      longitude: 31.3021,
      phone: '0380 544 12 34',
      email: 'kaynasli@tirmola.com',
      website: 'www.kaynaslipide.com',
      description: 'Gerçek Karadeniz pidesi ve sabah sıcak çorbası ile güvenli tır park alanına sahip aile işletmesi.',
      hasTirParking: true,
      parkingCapacity: 60,
      is247: false,
      averageRating: 4.4,
      reviewCount: 1
    },
    {
      name: 'Afyon Kolaylı Dinlenme Tesisleri',
      city: 'Afyonkarahisar',
      district: 'Merkez',
      fullAddress: 'İzmir-Ankara Çevreyolu 5. Km Afyon',
      latitude: 38.7425,
      longitude: 30.4852,
      phone: '0272 223 55 66',
      email: 'kolayli@kolayli.com.tr',
      website: 'www.kolayli.com.tr',
      description: 'Meşhur Afyon sucuk döneri, kaymaklı ekmek kadayıfı ve geniş otoparkıyla Ege geçişinin kalbi.',
      hasTirParking: true,
      parkingCapacity: 120,
      is247: true,
      averageRating: 4.6,
      reviewCount: 2
    },
    {
      name: 'Bolu Filiz Restoran & Mola İstasyonu',
      city: 'Bolu',
      district: 'Gerede',
      fullAddress: 'Karadeniz Bağlantı Yolu Gerede Kavşağı Bolu',
      latitude: 40.8012,
      longitude: 32.1852,
      phone: '0374 311 88 99',
      email: 'filiz@gerede.com',
      website: 'www.filizgerede.com',
      description: 'Gerede kavşağında ev yemekleri, ızgara çeşitleri ve geniş tır otoparkıyla 24 saat sıcak durak.',
      hasTirParking: true,
      parkingCapacity: 70,
      is247: true,
      averageRating: 4.3,
      reviewCount: 1
    },
    {
      name: 'Susurluk Yasa Dinlenme Tesisleri',
      city: 'Balıkesir',
      district: 'Susurluk',
      fullAddress: 'İstanbul-İzmir Otoyolu Susurluk Mevkii Balıkesir',
      latitude: 39.9124,
      longitude: 28.1523,
      phone: '0266 865 11 22',
      email: 'yasa@yasa.com.tr',
      website: 'www.yasatesisleri.com',
      description: 'Meşhur köpüklü Susurluk ayranı ve çift kaşarlı tostuyla seyahatlerin en sevilen lezzet durağı.',
      hasTirParking: true,
      parkingCapacity: 110,
      is247: true,
      averageRating: 4.7,
      reviewCount: 2
    },
    {
      name: 'Çamlıdere Çetinler Dinlenme İstasyonu',
      city: 'Ankara',
      district: 'Kızılcahamam',
      fullAddress: 'İstanbul-Ankara Otobanı 110. Km Kızılcahamam Ankara',
      latitude: 40.4682,
      longitude: 32.6124,
      phone: '0312 736 12 34',
      email: 'cetinler@cetinler.com',
      website: 'www.cetinlertesisleri.com',
      description: 'Ankara otobanı üzerinde Kızılcahamam bazlaması, güveçte kuru fasulyesi and güvenli park alanıyla hizmetinizdeyiz.',
      hasTirParking: true,
      parkingCapacity: 85,
      is247: true,
      averageRating: 4.5,
      reviewCount: 1
    },
    {
      name: 'Çamlıyayla Çınar Mola Alanı & Çorbacısı',
      city: 'Mersin',
      district: 'Çamlıyayla',
      fullAddress: 'Tarsus-Çamlıyayla Yolu 15. Km Mersin',
      latitude: 37.1652,
      longitude: 34.6187,
      phone: '0324 676 44 33',
      email: 'cinar@cinarmola.com',
      website: 'www.cinarmola.com',
      description: 'Yayla havasında enfes çorba çeşitleri, saç kavurması ve tır şoförlerimize özel dinlenme alanları.',
      hasTirParking: true,
      parkingCapacity: 50,
      is247: false,
      averageRating: 4.4,
      reviewCount: 1
    }
  ];

  for (const rData of realRestaurants) {
    const restaurant = await restaurantRepo.save({
      name: rData.name,
      city: rData.city,
      district: rData.district,
      fullAddress: rData.fullAddress,
      latitude: rData.latitude,
      longitude: rData.longitude,
      phone: rData.phone,
      email: rData.email,
      website: rData.website,
      description: rData.description,
      hasTirParking: rData.hasTirParking,
      parkingCapacity: rData.parkingCapacity,
      workingStatus: WorkingStatus.ACTIVE,
      is247: rData.is247,
      workingHours: [
        { day: 'Pazartesi', open: '00:00', close: '23:59' },
        { day: 'Salı', open: '00:00', close: '23:59' },
        { day: 'Çarşamba', open: '00:00', close: '23:59' },
        { day: 'Perşembe', open: '00:00', close: '23:59' },
        { day: 'Cuma', open: '00:00', close: '23:59' },
        { day: 'Cumartesi', open: '00:00', close: '23:59' },
        { day: 'Pazar', open: '00:00', close: '23:59' }
      ],
      averageRating: rData.averageRating,
      reviewCount: rData.reviewCount,
      createdById: superAdmin.id,
      isDeleted: false
    });

    // Create Menus
    const menuCorba = await menuRepo.save({
      restaurantId: restaurant.id,
      name: 'Çorbalar',
      description: '24 Saat Taze Sıcak Çorbalar',
      isActive: true,
      sortOrder: 1
    });

    const menuIzgara = await menuRepo.save({
      restaurantId: restaurant.id,
      name: 'Izgaralar & Yemekler',
      description: 'Ateş Üstünde Pişen Eşsiz Lezzetler',
      isActive: true,
      sortOrder: 2
    });

    const menuTatlilar = await menuRepo.save({
      restaurantId: restaurant.id,
      name: 'Tatlılar & İçecekler',
      description: 'Mola Sonu Keyif Lezzetleri',
      isActive: true,
      sortOrder: 3
    });

    // Create Menu Items
    await menuItemRepo.save({
      menuId: menuCorba.id,
      name: 'Mercimek Çorbası',
      price: 75.00,
      portionDescription: 'Tam Porsiyon (Limon ve Kıtır Ekmek İle)',
      isActive: true,
      isDailyMenu: true,
      hasTirDiscount: true,
      isPopular: true
    });

    await menuItemRepo.save({
      menuId: menuCorba.id,
      name: 'Ezogelin Çorbası',
      price: 80.00,
      portionDescription: 'Tam Porsiyon',
      isActive: true,
      isDailyMenu: true,
      hasTirDiscount: true,
      isPopular: false
    });

    await menuItemRepo.save({
      menuId: menuIzgara.id,
      name: 'Meşhur Saç Kavurma',
      price: 260.00,
      portionDescription: 'Sıcak Demir Tavada',
      isActive: true,
      isDailyMenu: false,
      hasTirDiscount: true,
      isPopular: true
    });

    await menuItemRepo.save({
      menuId: menuIzgara.id,
      name: 'Karışık Izgara Tabağı',
      price: 340.00,
      portionDescription: 'Köfte, Tavuk, Adana Kebap Bir Arada',
      isActive: true,
      isDailyMenu: false,
      hasTirDiscount: true,
      isPopular: true
    });

    await menuItemRepo.save({
      menuId: menuTatlilar.id,
      name: 'Fırın Sütlaç',
      price: 65.00,
      portionDescription: 'Fındıklı Toprak Kasede',
      isActive: true,
      isDailyMenu: false,
      hasTirDiscount: false,
      isPopular: false
    });

    // Create Restaurant Images
    await restaurantImageRepo.save({
      restaurantId: restaurant.id,
      imageType: RestaurantImageType.DIS_MEKAN,
      url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
      isDeleted: false
    });

    await restaurantImageRepo.save({
      restaurantId: restaurant.id,
      imageType: RestaurantImageType.YEMEKLER,
      url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      isDeleted: false
    });

    // Create Restaurant Reviews from dynamic Seeded Users
    const reviewerUsers = users.filter(u => u.role === UserRole.TASIYICI);
    for (let k = 0; k < Math.min(rData.reviewCount, reviewerUsers.length); k++) {
      await restaurantReviewRepo.save({
        restaurantId: restaurant.id,
        userId: reviewerUsers[k].id,
        rating: Math.floor(4 + Math.random() * 2),
        comment: [
          'Tır parkı mükemmel, çok geniş ve güvenli. Yemekler sıcak ve hızlı servis ediliyor.',
          'Mercimek çorbası ve saç kavurması efsane. Şoför arkadaşlara mutlaka tavsiye ederim.',
          'Hizmet kalitesi harika, tır şoförlerine indirim yapıyorlar. Kesinlikle tekrar uğrayacağım.',
          'Banyosu temiz, otoparkı çok rahat. Çorbası bol porsiyonlu ve sıcak geliyor.'
        ][k % 4],
        menuItemId: null,
        isDeleted: false,
        helpfulCount: Math.floor(Math.random() * 15)
      });
    }
  }

  console.log('✅ GERÇEK 10 YOL ÜSTÜ LOKANTA VE MENÜLERİ VERİTABANINA ENTEGRE EDİLDİ!');

  // ======== 6. SEED 10 HIGHLY REALISTIC FUEL STATIONS IN TURKEY ========
  console.log('==================================================');
  console.log('⛽ GERÇEKÇİ 10 ADET AKARYAKIT İSTASYONU SEED EDİLİYOR...');

  const fuelStationsData = [
    {
      name: 'Opet Kaynaşlı Dinlenme Tesisi',
      brand: 'Opet',
      brandColor: '#005EA6',
      city: 'Düzce',
      district: 'Kaynaşlı',
      fullAddress: 'Anadolu Otoyolu Kaynaşlı Mevkii, Düzce',
      latitude: 40.7854,
      longitude: 31.3021,
      phone: '+90 380 544 1020',
      is247: true,
      parkingCapacity: 120,
      description: 'Geniş tır park alanı, sıcak banyo/duş imkanı, 7/24 sıcak çorba ve dinlenme odasıyla hizmetinizdeyiz.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.10 },
        { type: FuelType.KURSUNSUZ, price: 43.50 },
        { type: FuelType.LPG, price: 21.20 },
        { type: FuelType.ADBLUE, price: 18.50 },
        { type: FuelType.ELEKTRIK_SARJ, price: 7.90 }
      ],
      services: [
        StationServiceType.ARAC_YIKAMA,
        StationServiceType.LOKANTA,
        StationServiceType.KAFE,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.UCRETSIZ_WIFI,
        StationServiceType.CAY_KAHVE
      ]
    },
    {
      name: 'Shell Bolu Dağı Tünel Çıkışı Tesisi',
      brand: 'Shell',
      brandColor: '#FFD500',
      city: 'Bolu',
      district: 'Merkez',
      fullAddress: 'TEM Otoyolu Bolu Dağı Mevkii Tünel Çıkışı, Bolu',
      latitude: 40.7335,
      longitude: 31.5204,
      phone: '+90 374 250 3040',
      is247: true,
      parkingCapacity: 150,
      description: 'Bolu geçişinde güvenli mola noktanız. 24 saat açık tır otoparkı, duş, lastikçi ve oto kurtarma hizmetleri.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.15 },
        { type: FuelType.KURSUNSUZ, price: 43.45 },
        { type: FuelType.LPG, price: 21.15 },
        { type: FuelType.ADBLUE, price: 18.40 },
        { type: FuelType.ELEKTRIK_SARJ, price: 8.20 }
      ],
      services: [
        StationServiceType.ARAC_YIKAMA,
        StationServiceType.LOKANTA,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.LASTIKCI,
        StationServiceType.UCRETSIZ_WIFI
      ]
    },
    {
      name: 'BP Hereke Kuzey Dinlenme Tesisi',
      brand: 'BP',
      brandColor: '#009B4E',
      city: 'Kocaeli',
      district: 'Körfez',
      fullAddress: 'TEM Otoyolu Hereke Mevkii Kuzey Şeridi, Kocaeli',
      latitude: 40.7850,
      longitude: 29.6200,
      phone: '+90 262 511 4455',
      is247: true,
      parkingCapacity: 80,
      description: 'İstanbul-Ankara otobanı üzerinde, güvenli tır cebi, kahve istasyonu ve temiz sosyal alanlar.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.30 },
        { type: FuelType.KURSUNSUZ, price: 43.60 },
        { type: FuelType.LPG, price: 21.40 },
        { type: FuelType.ADBLUE, price: 19.00 }
      ],
      services: [
        StationServiceType.KAFE,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.BANKA_ATM,
        StationServiceType.CAY_KAHVE
      ]
    },
    {
      name: 'Petrol Ofisi Hendek Dinlenme Tesisi',
      brand: 'Petrol Ofisi',
      brandColor: '#E30613',
      city: 'Sakarya',
      district: 'Hendek',
      fullAddress: 'D-100 Karayolu Hendek Geçişi, Sakarya',
      latitude: 40.7922,
      longitude: 30.7483,
      phone: '+90 264 614 9900',
      is247: true,
      parkingCapacity: 100,
      description: 'Genişletilmiş tır park alanı, elektrikli şarj istasyonu, 24 saat sıcak sulu duş kabinleri ve mescit.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.08 },
        { type: FuelType.KURSUNSUZ, price: 43.38 },
        { type: FuelType.LPG, price: 21.10 },
        { type: FuelType.ADBLUE, price: 18.00 },
        { type: FuelType.ELEKTRIK_SARJ, price: 7.80 }
      ],
      services: [
        StationServiceType.ARAC_YIKAMA,
        StationServiceType.LOKANTA,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.SERVIS_TAMIR,
        StationServiceType.UCRETSIZ_WIFI
      ]
    },
    {
      name: 'Total Kızılcahamam Otoban Tesisi',
      brand: 'Total',
      brandColor: '#002C82',
      city: 'Ankara',
      district: 'Kızılcahamam',
      fullAddress: 'Ankara-İstanbul Otoyolu 70. km, Kızılcahamam, Ankara',
      latitude: 40.4682,
      longitude: 32.6517,
      phone: '+90 312 736 8899',
      is247: true,
      parkingCapacity: 90,
      description: 'Ankara girişinde kaliteli yakıt ve tır dinlenme otoparkı. Geniş market ve sıcak yemek servisi.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.22 },
        { type: FuelType.KURSUNSUZ, price: 43.55 },
        { type: FuelType.LPG, price: 21.30 },
        { type: FuelType.ADBLUE, price: 18.70 }
      ],
      services: [
        StationServiceType.LOKANTA,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.UCRETSIZ_WIFI
      ]
    },
    {
      name: 'Opet Gebze Otoban İstasyonu',
      brand: 'Opet',
      brandColor: '#005EA6',
      city: 'Kocaeli',
      district: 'Gebze',
      fullAddress: 'TEM Otoyolu Gebze Mevkii Güney Şerit, Kocaeli',
      latitude: 40.8012,
      longitude: 29.4308,
      phone: '+90 262 642 7700',
      is247: true,
      parkingCapacity: 60,
      description: 'Sanayinin merkezinde, tır ve kamyon şoförleri için özel tasarlanmış otopark, duş ve dinlenme kabinleri.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.32 },
        { type: FuelType.KURSUNSUZ, price: 43.65 },
        { type: FuelType.LPG, price: 21.45 },
        { type: FuelType.ADBLUE, price: 19.20 },
        { type: FuelType.ELEKTRIK_SARJ, price: 8.00 }
      ],
      services: [
        StationServiceType.KAFE,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.BANKA_ATM
      ]
    },
    {
      name: 'Shell Susurluk Dinlenme İstasyonu',
      brand: 'Shell',
      brandColor: '#FFD500',
      city: 'Balıkesir',
      district: 'Susurluk',
      fullAddress: 'İstanbul-İzmir Otoyolu Susurluk Mevkii, Balıkesir',
      latitude: 39.9142,
      longitude: 28.1567,
      phone: '+90 266 865 3010',
      is247: true,
      parkingCapacity: 110,
      description: 'Meşhur Susurluk ayranı ve tostu eşliğinde güvenli dinlenme. 24 saat açık modern tır parkı.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.25 },
        { type: FuelType.KURSUNSUZ, price: 43.58 },
        { type: FuelType.LPG, price: 21.28 },
        { type: FuelType.ADBLUE, price: 18.60 },
        { type: FuelType.ELEKTRIK_SARJ, price: 8.10 }
      ],
      services: [
        StationServiceType.ARAC_YIKAMA,
        StationServiceType.LOKANTA,
        StationServiceType.KAFE,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.UCRETSIZ_WIFI
      ]
    },
    {
      name: 'BP Sivrihisar Otoban Tesisi',
      brand: 'BP',
      brandColor: '#009B4E',
      city: 'Eskişehir',
      district: 'Sivrihisar',
      fullAddress: 'Ankara-İzmir D-200 Karayolu Sivrihisar Kavşağı, Eskişehir',
      latitude: 39.4447,
      longitude: 31.5303,
      phone: '+90 222 711 2030',
      is247: true,
      parkingCapacity: 75,
      description: 'Anadolu kavşağında 24 saat açık tır otoparkı, lezzetli çorbalar ve lastik tamir atölyesi.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.15 },
        { type: FuelType.KURSUNSUZ, price: 43.48 },
        { type: FuelType.LPG, price: 21.20 },
        { type: FuelType.ADBLUE, price: 18.30 }
      ],
      services: [
        StationServiceType.LOKANTA,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.LASTIKCI,
        StationServiceType.CAY_KAHVE
      ]
    },
    {
      name: 'Petrol Ofisi Akhisar Otoban İstasyonu',
      brand: 'Petrol Ofisi',
      brandColor: '#E30613',
      city: 'Manisa',
      district: 'Akhisar',
      fullAddress: 'İstanbul-İzmir Otoyolu Akhisar Mevkii, Manisa',
      latitude: 38.9244,
      longitude: 27.8406,
      phone: '+90 236 412 8844',
      is247: true,
      parkingCapacity: 130,
      description: 'Ege yolunda modern tır dinlenme parkı. Şoför indirimli lokanta, oto yıkama ve elektrikli şarj istasyonları.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.20 },
        { type: FuelType.KURSUNSUZ, price: 43.52 },
        { type: FuelType.LPG, price: 21.25 },
        { type: FuelType.ADBLUE, price: 18.50 },
        { type: FuelType.ELEKTRIK_SARJ, price: 7.95 }
      ],
      services: [
        StationServiceType.ARAC_YIKAMA,
        StationServiceType.LOKANTA,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.UCRETSIZ_WIFI,
        StationServiceType.CAY_KAHVE
      ]
    },
    {
      name: 'Opet Kemalpaşa Lojistik İstasyonu',
      brand: 'Opet',
      brandColor: '#005EA6',
      city: 'İzmir',
      district: 'Kemalpaşa',
      fullAddress: 'İzmir-Ankara Yolu Kemalpaşa Girişi, İzmir',
      latitude: 38.4239,
      longitude: 27.4172,
      phone: '+90 232 878 9911',
      is247: true,
      parkingCapacity: 140,
      description: 'İzmir lojistik bölgesinin en büyük tır parkına sahip modern yakıt and dinlenme kompleksi.',
      prices: [
        { type: FuelType.MOTORIN, price: 42.28 },
        { type: FuelType.KURSUNSUZ, price: 43.60 },
        { type: FuelType.LPG, price: 21.35 },
        { type: FuelType.ADBLUE, price: 18.90 },
        { type: FuelType.ELEKTRIK_SARJ, price: 7.90 }
      ],
      services: [
        StationServiceType.ARAC_YIKAMA,
        StationServiceType.LOKANTA,
        StationServiceType.KAFE,
        StationServiceType.MARKET,
        StationServiceType.OTOPARK,
        StationServiceType.DUS_WC,
        StationServiceType.ELEKTRIKLI_SARJ,
        StationServiceType.SERVIS_TAMIR,
        StationServiceType.BANKA_ATM,
        StationServiceType.UCRETSIZ_WIFI
      ]
    }
  ];

  const carrierUsersForFuel = users.filter(u => u.role === UserRole.TASIYICI);

  for (const sData of fuelStationsData) {
    const station = fuelStationRepo.create({
      name: sData.name,
      brand: sData.brand,
      brandColor: sData.brandColor,
      city: sData.city,
      district: sData.district,
      fullAddress: sData.fullAddress,
      latitude: sData.latitude,
      longitude: sData.longitude,
      phone: sData.phone,
      is247: sData.is247,
      workingStatus: FuelStationStatus.ACTIVE,
      averageRating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
      reviewCount: 3 + Math.floor(Math.random() * 5),
      createdById: users[0].id // Super Admin (İlyas Duran)
    });
    const savedStation = await fuelStationRepo.save(station);

    // Seed Prices
    for (const p of sData.prices) {
      await fuelPriceRepo.save({
        stationId: savedStation.id,
        fuelType: p.type,
        price: p.price,
        isConfirmed: true,
        source: 'seed',
        confidenceScore: 1.0,
        updatedById: users[0].id
      });
    }

    // Seed Services
    for (const svc of sData.services) {
      await fuelServiceRepo.save({
        stationId: savedStation.id,
        serviceType: svc,
        category: svc === StationServiceType.ELEKTRIKLI_SARJ ? ServiceCategory.PREMIUM : ServiceCategory.TEMEL,
        description: `${sData.brand} kalitesiyle ${svc} hizmeti.`
      });
    }

    // Seed Reviews
    for (let rIdx = 0; rIdx < savedStation.reviewCount; rIdx++) {
      const userIdx = (carrierUsersForFuel.length > 0) ? (rIdx % carrierUsersForFuel.length) : 0;
      const reviewerId = carrierUsersForFuel[userIdx]?.id || users[0].id;
      await fuelReviewRepo.save({
        stationId: savedStation.id,
        userId: reviewerId,
        rating: Math.floor(4 + Math.random() * 2),
        comment: [
          'Tır parkı çok geniş ve zemin oldukça düzgün. Duş alanları temizdi.',
          'Yakıt kalitesi harika, şoförler için dinlenme tesisleri çok konforlu.',
          'Market zengin içerikli, personel güler yüzlü. Tavsiye ederim.',
          'Sıcak çorba ve duş imkanı harika, güvenli tır parkı arayanlar için ideal.',
          '7/24 hizmet vermesi harika bir kolaylık. Tır otoparkı güvenli ve aydınlık.'
        ][rIdx % 5],
        isDeleted: false
      });
    }
  }

  // ======== 6. SEED 15 DETAILED HIGHWAY RESTAURANTS (LEZZET DURAKLARI) ========
  console.log('🍽️ GERÇEKÇİ 15 ADET YOL ÜSTÜ LOKANTASI SEED EDİLİYOR...');

  const restaurantsData = [
    {
      name: 'Kervan Dinlenme ve Lezzet Tesisi',
      city: 'Düzce',
      district: 'Kaynaşlı',
      fullAddress: 'TEM Otoyolu Kaynaşlı Mevkii Lojistik Kavşağı, Düzce',
      latitude: 40.7854,
      longitude: 31.3021,
      phone: '0380 544 1020',
      description: 'Lojistik koridorunun tam merkezinde, 24 saat taze kuru fasulye, çorba çeşitleri ve güvenli geniş tır parkı ile şoför dostu mola yeri.',
      hasTirParking: true,
      parkingCapacity: 120,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı', 'Çocuk Oyun Alanı'],
      menus: [
        {
          name: 'Çorbalar',
          items: [
            { name: 'Süzme Mercimek Çorbası', price: 80.00, portionDescription: 'Tereyağlı kıtır ekmek ile', isPopular: true },
            { name: 'Ezogelin Çorbası', price: 80.00, portionDescription: 'Limonlu ve baharatlı' },
            { name: 'Kelle Paça Çorbası', price: 140.00, portionDescription: 'Sarımsak ve sirke soslu', isPopular: true }
          ]
        },
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'Tereyağlı Kuru Fasulye', price: 120.00, portionDescription: 'İspir fasulyesi, güveçte', isPopular: true },
            { name: 'Etli Nohut', price: 120.00, portionDescription: 'Kucu etli' },
            { name: 'Orman Kebabı', price: 180.00, portionDescription: 'Sebzeli dana kuşbaşı' }
          ]
        },
        {
          name: 'Izgaralar (köfte, şiş, pirzola, kanat, tavuk şiş)',
          items: [
            { name: 'Kervan Kasap Köfte', price: 210.00, portionDescription: 'Közlenmiş biber ve domates ile', isPopular: true },
            { name: 'Kuzu Şiş', price: 280.00, portionDescription: 'Pilav ve salata ile' }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Fırın Sütlaç', price: 70.00, portionDescription: 'Fındıklı, dağ sütüyle' },
            { name: 'Hafif Kazandibi', price: 70.00, portionDescription: 'Manda sütüyle yapılmış' }
          ]
        },
        {
          name: 'İçecekler (ayran, kola, soda, meyve suyu, çay, kahve, su)',
          items: [
            { name: 'Yayık Ayranı', price: 30.00, portionDescription: 'Köpüklü soğuk ayran' },
            { name: 'Siyah Demleme Çay', price: 15.00, portionDescription: 'Rize çayı, bardak' }
          ]
        }
      ]
    },
    {
      name: 'Bolu Dağı Esentepe Hilal Lokantası',
      city: 'Bolu',
      district: 'Merkez',
      fullAddress: 'D-100 Karayolu Bolu Dağı Geçişi No:45, Bolu',
      latitude: 40.7325,
      longitude: 31.5212,
      phone: '0374 254 9080',
      description: 'Tarihi Bolu Dağı virajında, eşsiz doğa manzarası eşliğinde meşhur Bolu kavurması ve sıcacık çorbalar.',
      hasTirParking: true,
      parkingCapacity: 90,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Çorbalar',
          items: [
            { name: 'Sıcak İşkembe Çorbası', price: 120.00, portionDescription: 'Özel terbiye soslu', isPopular: true },
            { name: 'Süzme Mercimek Çorbası', price: 80.00 }
          ]
        },
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'Meşhur Bolu Kavurması', price: 290.00, portionDescription: 'Sıcak sac tava üzerinde pilavla', isPopular: true },
            { name: 'Tavuk Sote', price: 140.00, portionDescription: 'Biber ve domates soslu' }
          ]
        },
        {
          name: 'Pide ve Lahmacun',
          items: [
            { name: 'Kıymalı Kaşarlı Pide', price: 160.00 },
            { name: 'Çıtır Lahmacun', price: 60.00, portionDescription: 'Limon ve yeşillik ile' }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Bolu Ev Baklavası', price: 90.00, portionDescription: 'Bol cevizli ev yapımı' }
          ]
        },
        {
          name: 'İçecekler (ayran, kola, soda, meyve suyu, çay, kahve, su)',
          items: [
            { name: 'Kola', price: 40.00 },
            { name: 'Şişe Su', price: 15.00 }
          ]
        }
      ]
    },
    {
      name: 'Susurluk Bereket Dinlenme Tesisi',
      city: 'Balıkesir',
      district: 'Susurluk',
      fullAddress: 'İstanbul-İzmir Otoyolu Susurluk Mevkii, Balıkesir',
      latitude: 39.9142,
      longitude: 28.1567,
      phone: '0266 865 4422',
      description: 'Meşhur köpüklü Susurluk ayranı ve özel tost ekmeğine yapılmış Susurluk tostuyla şoförlerin uğrak lezzet durağı.',
      hasTirParking: true,
      parkingCapacity: 150,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı', 'Çocuk Oyun Alanı'],
      menus: [
        {
          name: 'Kahvaltılıklar (serpme kahvaltı, menemen, sucuklu yumurta)',
          items: [
            { name: 'Sucuklu Yumurta', price: 130.00, portionDescription: 'Susurluk kasap sucuğu ile', isPopular: true },
            { name: 'Karışık Menemen', price: 110.00, portionDescription: 'Biber, domates ve kaşar' }
          ]
        },
        {
          name: 'Ekmek Arası (tost, sandviç, döner dürüm, tavuk dürüm)',
          items: [
            { name: 'Çift Kaşarlı Susurluk Tostu', price: 95.00, portionDescription: 'Özel tost ekmeğine, tereyağlı', isPopular: true },
            { name: 'Karışık Tost (Sucuk + Kaşar)', price: 110.00, portionDescription: 'Mükemmel çıtır kıvam' }
          ]
        },
        {
          name: 'Izgaralar (köfte, şiş, pirzola, kanat, tavuk şiş)',
          items: [
            { name: 'Susurluk Köftesi', price: 220.00, portionDescription: 'Özel baharat karışımlı köfte' }
          ]
        },
        {
          name: 'İçecekler (ayran, kola, soda, meyve suyu, çay, kahve, su)',
          items: [
            { name: 'Köpüklü Susurluk Ayranı', price: 35.00, portionDescription: 'Yayık makinesinden taze', isPopular: true },
            { name: 'Türk Kahvesi', price: 50.00, portionDescription: 'Lokum eşliğinde' }
          ]
        }
      ]
    },
    {
      name: 'Sapanca Berceste Lezzet Durağı',
      city: 'Sakarya',
      district: 'Sapanca',
      fullAddress: 'TEM Otoyolu Sapanca Mevkii Güney Şeridi, Sakarya',
      latitude: 40.6940,
      longitude: 30.2642,
      phone: '0264 582 1090',
      description: 'Sapanca Gölü yakınında, doğayla iç içe premium dinlenme alanları, zengin serpme kahvaltısı ve harika ızgara çeşitleri.',
      hasTirParking: true,
      parkingCapacity: 80,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı', 'Çocuk Oyun Alanı'],
      menus: [
        {
          name: 'Kahvaltılıklar (serpme kahvaltı, menemen, sucuklu yumurta)',
          items: [
            { name: 'Serpme Yörük Kahvaltısı', price: 280.00, portionDescription: '2 kişilik zengin yöresel peynirler ve reçeller', isPopular: true }
          ]
        },
        {
          name: 'Izgaralar (köfte, şiş, pirzola, kanat, tavuk şiş)',
          items: [
            { name: 'Karışık Izgara Plakası', price: 390.00, portionDescription: 'Adana, Urfa, Köfte, Tavuk Kanat ortak sunum', isPopular: true },
            { name: 'Tavuk Şiş', price: 180.00, portionDescription: 'Marine edilmiş soslu tavuk göğsü' }
          ]
        },
        {
          name: 'Pide ve Lahmacun',
          items: [
            { name: 'Kuşbaşılı Kaşarlı Karadeniz Pidesi', price: 190.00, isPopular: true }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Sıcak Künefe', price: 110.00, portionDescription: 'Hatay usulü şerbetli antep fıstıklı' }
          ]
        }
      ]
    },
    {
      name: 'Geyve Yörem Ev Yemekleri',
      city: 'Sakarya',
      district: 'Geyve',
      fullAddress: 'Bilecik-Eskişehir Karayolu Geyve Ayrımı, Sakarya',
      latitude: 40.5211,
      longitude: 30.2922,
      phone: '0264 517 8810',
      description: 'Anadolu köylerinden gelen doğal malzemelerle pişen ev yemekleri, taze sebze güveçleri ve yöresel zeytinyağlılar.',
      hasTirParking: true,
      parkingCapacity: 50,
      is247: false,
      services: ['WC', 'Otopark', 'Mescit', 'Kredi Kartı'],
      menus: [
        {
          name: 'Salatalar',
          items: [
            { name: 'Çoban Salatası', price: 50.00, portionDescription: 'Sızma zeytinyağlı' },
            { name: 'Mevsim Salatası', price: 50.00 }
          ]
        },
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'Güveçte Dana Yahni', price: 210.00, portionDescription: 'Arpacık soğanlı kuzu eti kıvamında', isPopular: true },
            { name: 'Zeytinyağlı Yaprak Sarması', price: 90.00 }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Kabak Tatlısı', price: 80.00, portionDescription: 'Geyve bal kabağından tahinli fındıklı', isPopular: true }
          ]
        }
      ]
    },
    {
      name: 'Hendek Sofra Kebap Salonu',
      city: 'Sakarya',
      district: 'Hendek',
      fullAddress: 'D-100 Karayolu Hendek Lojistik Geçişi, Sakarya',
      latitude: 40.7922,
      longitude: 30.7483,
      phone: '0264 614 1122',
      description: 'Zırh kıymasıyla hazırlanan Adana kebabı, çıtır lahmacunu ve acılı ezmesiyle tır şoförlerinin favori kebapçısı.',
      hasTirParking: true,
      parkingCapacity: 110,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Soğuk Başlangıçlar (mezeler)',
          items: [
            { name: 'Acılı Ezme', price: 55.00, portionDescription: 'Taze nane ve sumaklı' },
            { name: 'Haydari', price: 55.00, portionDescription: 'Süzme yoğurtlu dereotlu' }
          ]
        },
        {
          name: 'Izgaralar (köfte, şiş, pirzola, kanat, tavuk şiş)',
          items: [
            { name: 'Zırh Adana Kebabı', price: 240.00, portionDescription: 'Lavaş ve közlenmiş soğan eşliğinde', isPopular: true },
            { name: 'Terbiyeli Tavuk Kanat', price: 190.00 }
          ]
        },
        {
          name: 'Pide ve Lahmacun',
          items: [
            { name: 'Çıtır Lahmacun (Tek)', price: 60.00, isPopular: true }
          ]
        }
      ]
    },
    {
      name: 'Kızılcahamam Yörük Sofrası',
      city: 'Ankara',
      district: 'Kızılcahamam',
      fullAddress: 'Ankara-İstanbul Otoyolu 75. km Dinlenme Alanı, Kızılcahamam, Ankara',
      latitude: 40.4682,
      longitude: 32.6517,
      phone: '0312 736 1090',
      description: 'Ankara otobanı üzerinde çam ormanlarının kıyısında, meşhur Kızılcahamam bazlamasıyla sıcak sac kavurma keyfi.',
      hasTirParking: true,
      parkingCapacity: 100,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Çorbalar',
          items: [
            { name: 'Sıcak Tarhana Çorbası', price: 80.00, portionDescription: 'Ev yapımı yöresel un tarhanası', isPopular: true }
          ]
        },
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'Sac Kavurma', price: 270.00, portionDescription: 'Kızılcahamam tereyağı ile sıcak sunum', isPopular: true }
          ]
        },
        {
          name: 'Kahvaltılıklar (serpme kahvaltı, menemen, sucuklu yumurta)',
          items: [
            { name: 'Bazlama Tostu (Kaşarlı)', price: 90.00, portionDescription: 'Dev bazlama ekmeğinde eritilmiş peynir' }
          ]
        }
      ]
    },
    {
      name: 'Sivrihisar Başkent Lokantası',
      city: 'Eskişehir',
      district: 'Sivrihisar',
      fullAddress: 'Ankara-İzmir D-200 Otoyolu Sivrihisar Kavşağı No:10, Eskişehir',
      latitude: 39.4447,
      longitude: 31.5303,
      phone: '0222 711 5599',
      description: 'İzmir-Ankara yolunun kesişiminde, meşhur Sivrihisar muska böreği ve enfes sulu yemek çeşitleriyle 7/24 hizmetinizde.',
      hasTirParking: true,
      parkingCapacity: 115,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Sıcak Başlangıçlar',
          items: [
            { name: 'Sivrihisar Muska Böreği', price: 75.00, portionDescription: 'Kıymalı çıtır muska böreği', isPopular: true }
          ]
        },
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'İzmir Köfte', price: 170.00, portionDescription: 'Fırın patatesli sulu soslu' },
            { name: 'Kıymalı Taze Fasulye', price: 120.00 }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Ev Yapımı Kemalpaşa Tatlısı', price: 70.00, portionDescription: 'Tahinli ve bol fındıklı' }
          ]
        }
      ]
    },
    {
      name: 'Hereke Karadeniz Pide Evi',
      city: 'Kocaeli',
      district: 'Körfez',
      fullAddress: 'TEM Otoyolu Hereke Geçişi Kuzey Cebri, Kocaeli',
      latitude: 40.7850,
      longitude: 29.6200,
      phone: '0262 511 2040',
      description: 'Karadenizden gelen tereyağı and peynirlerle odun ateşinde pişmiş dev pideler. Lojistikçiler için indirimli menüler.',
      hasTirParking: true,
      parkingCapacity: 70,
      is247: true,
      services: ['WC', 'Otopark', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Pide ve Lahmacun',
          items: [
            { name: 'Yumurtalı Kaşarlı Karadeniz Pidesi', price: 180.00, portionDescription: 'Hakiki Vakfıkebir tereyağı ile', isPopular: true },
            { name: 'Kavurmalı Kaşarlı Kapalı Pide', price: 220.00, portionDescription: 'Eriyen kaşar ve Rize kavurması', isPopular: true }
          ]
        },
        {
          name: 'İçecekler (ayran, kola, soda, meyve suyu, çay, kahve, su)',
          items: [
            { name: 'Büyük Bardak Açık Ayran', price: 30.00 }
          ]
        }
      ]
    },
    {
      name: 'Tuzla Otoyol Köftecisi',
      city: 'İstanbul',
      district: 'Tuzla',
      fullAddress: 'TEM Otoyolu Orhanlı Mevkii Kuzey Şerit, İstanbul',
      latitude: 40.8012,
      longitude: 29.4308,
      phone: '0216 482 1090',
      description: 'İstanbul girişinin en büyük dinlenme alanında, lezzetli kasap köftesi, taze salata büfesi ve tır şoförlerine özel %15 indirim.',
      hasTirParking: true,
      parkingCapacity: 130,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı', 'Çocuk Oyun Alanı'],
      menus: [
        {
          name: 'Izgaralar (köfte, şiş, pirzola, kanat, tavuk şiş)',
          items: [
            { name: 'Tuzla Özel Kasap Köfte', price: 230.00, portionDescription: 'Izgara domates ve közlenmiş biber ile', isPopular: true },
            { name: 'Kuzu Pirzola (4 Adet)', price: 340.00, portionDescription: 'Tereyağlı pilav eşliğinde' }
          ]
        },
        {
          name: 'Makarnalar',
          items: [
            { name: 'Bolonez Soslu Spagetti', price: 120.00 }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Fırın Sütlaç', price: 70.00 }
          ]
        }
      ]
    },
    {
      name: 'Kemalpaşa Ege Sofrası',
      city: 'İzmir',
      district: 'Kemalpaşa',
      fullAddress: 'İzmir-Ankara Karayolu Kemalpaşa Organize Kavşağı No:5, İzmir',
      latitude: 38.4239,
      longitude: 27.4172,
      phone: '0232 878 1245',
      description: 'Ege otları, zeytinyağlı enginar, kuzu etli şevketi bostan gibi eşsiz Ege lezzetleri ve şoför bütçesine uygun menü alternatifleri.',
      hasTirParking: true,
      parkingCapacity: 100,
      is247: false,
      services: ['WC', 'Otopark', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Soğuk Başlangıçlar (mezeler)',
          items: [
            { name: 'Zeytinyağlı Enginar', price: 110.00, isPopular: true },
            { name: 'Deniz Börülcesi', price: 70.00 }
          ]
        },
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'Kuzu Etli Şevketi Bostan', price: 230.00, portionDescription: 'Limon terbiye soslu', isPopular: true }
          ]
        }
      ]
    },
    {
      name: 'Akhisar Köfteci Ramiz Otoban',
      city: 'Manisa',
      district: 'Akhisar',
      fullAddress: 'İstanbul-İzmir Otoyolu Akhisar Mevkii Batı Şeridi, Manisa',
      latitude: 38.9244,
      longitude: 27.8406,
      phone: '0236 412 9010',
      description: 'Akhisarlı Ramiz ustanın yarım asırlık formülüyle hazırlanan tereyağlı pide üzerinde servis edilen efsane Akhisar köftesi.',
      hasTirParking: true,
      parkingCapacity: 140,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı', 'Çocuk Oyun Alanı'],
      menus: [
        {
          name: 'Izgaralar (köfte, şiş, pirzola, kanat, tavuk şiş)',
          items: [
            { name: 'Pide Üstü Akhisar Köfte', price: 240.00, portionDescription: 'Tereyağlı sos and yoğurt ile', isPopular: true },
            { name: 'Tavuk Pirzola', price: 180.00 }
          ]
        },
        {
          name: 'Salatalar',
          items: [
            { name: 'Gavurdağı Salatası', price: 80.00, portionDescription: 'Nar ekşili cevizli', isPopular: true }
          ]
        }
      ]
    },
    {
      name: 'Polatlı Bozkır Çorbacısı',
      city: 'Ankara',
      district: 'Polatlı',
      fullAddress: 'Eskişehir-Ankara Karayolu Polatlı Girişi No:120, Ankara',
      latitude: 39.5833,
      longitude: 32.1333,
      phone: '0312 622 3040',
      description: 'Sıcak çorba severler için İç Anadolu bozkırında 7/24 hizmet veren, şifa kaynağı beyran, kelle paça ve mercimek çorbaları.',
      hasTirParking: true,
      parkingCapacity: 60,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Çorbalar',
          items: [
            { name: 'Antep Usulü Beyran', price: 160.00, portionDescription: 'Bol sarımsak and acı biberli', isPopular: true },
            { name: 'Mercimek Çorbası', price: 75.00 },
            { name: 'Kelle Paça Çorbası', price: 130.00 }
          ]
        }
      ]
    },
    {
      name: 'Afyon Kolaylı Gastronomi Tesisi',
      city: 'Afyonkarahisar',
      district: 'Merkez',
      fullAddress: 'İzmir-Antalya-İstanbul Kavşağı Çevre Yolu, Afyonkarahisar',
      latitude: 38.7569,
      longitude: 30.5381,
      phone: '0272 222 1010',
      description: 'Gastronomi şehri Afyonkarahisarın merkezinde, hakiki dana sucuğuyla yapılan sucuk döner, kaymaklı ekmek kadayıfı ve dahası.',
      hasTirParking: true,
      parkingCapacity: 160,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı', 'Çocuk Oyun Alanı'],
      menus: [
        {
          name: 'Ekmek Arası (tost, sandviç, döner dürüm, tavuk dürüm)',
          items: [
            { name: 'Afyon Sucuk Döner Dürüm', price: 140.00, portionDescription: 'Hakiki manda kaşarı ve baharatlı sucuk', isPopular: true },
            { name: 'Afyon Sucuklu Tost', price: 110.00 }
          ]
        },
        {
          name: 'Tatlılar (sütlaç, kazandibi, baklava, künefe)',
          items: [
            { name: 'Kaymaklı Ekmek Kadayıfı', price: 95.00, portionDescription: 'Hakiki Afyon manda kaymağıyla', isPopular: true }
          ]
        }
      ]
    },
    {
      name: 'Bozüyük Ömür Dinlenme Tesisi',
      city: 'Bilecik',
      district: 'Bozüyük',
      fullAddress: 'Bursa-Eskişehir Karayolu Bozüyük Çıkışı, Bilecik',
      latitude: 39.9056,
      longitude: 30.0389,
      phone: '0228 314 9080',
      description: 'Eskişehir and Bursa geçiş noktasında şoförler için tasarlanmış geniş sosyal tesis. Meşhur güveç kuru fasulyesi ve 24 saat sıcak duş imkanı.',
      hasTirParking: true,
      parkingCapacity: 125,
      is247: true,
      services: ['WC', 'Otopark', 'Duş', 'Mescit', 'Wi-Fi', 'Kredi Kartı'],
      menus: [
        {
          name: 'Ana Yemekler (etli, tavuklu, kuru bakliyat)',
          items: [
            { name: 'Güveçte Kuru Fasulye', price: 120.00, isPopular: true },
            { name: 'Nohutlu Pilav', price: 80.00 }
          ]
        },
        {
          name: 'Fast Food (hamburger, patates kızartması, nugget)',
          items: [
            { name: 'Şoför Hamburger Menü', price: 160.00, portionDescription: 'Patates kızartması ve kola ile', isPopular: true }
          ]
        }
      ]
    }
  ];

  const carrierUsersForRest = users.filter(u => u.role === UserRole.TASIYICI);

  for (const rData of restaurantsData) {
    const restaurant = restaurantRepo.create({
      name: rData.name,
      city: rData.city,
      district: rData.district,
      fullAddress: rData.fullAddress,
      latitude: rData.latitude,
      longitude: rData.longitude,
      phone: rData.phone,
      description: rData.description,
      hasTirParking: rData.hasTirParking,
      parkingCapacity: rData.parkingCapacity,
      workingStatus: WorkingStatus.ACTIVE,
      is247: rData.is247,
      services: rData.services,
      averageRating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
      reviewCount: 3 + Math.floor(Math.random() * 4),
      michelinScore: Math.floor(Math.random() * 4), // 0 to 3 stars
      createdById: superAdmin.id,
      isDeleted: false
    } as any) as unknown as Restaurant;
    const savedRest = await restaurantRepo.save(restaurant) as unknown as Restaurant;

    // Seeding menus and menu items
    for (let mIdx = 0; mIdx < rData.menus.length; mIdx++) {
      const menuData = rData.menus[mIdx];
      const menu = await menuRepo.save({
        restaurantId: savedRest.id,
        name: menuData.name,
        sortOrder: mIdx,
        isActive: true
      });

      for (const item of menuData.items as any[]) {
        await menuItemRepo.save({
          menuId: menu.id,
          name: item.name,
          price: item.price,
          portionDescription: item.portionDescription || '',
          isActive: true,
          isPopular: item.isPopular || false
        });
      }
    }

    // Seeding reviews
    for (let rIdx = 0; rIdx < savedRest.reviewCount; rIdx++) {
      const uIdx = (carrierUsersForRest.length > 0) ? (rIdx % carrierUsersForRest.length) : 0;
      const reviewerId = carrierUsersForRest[uIdx]?.id || superAdmin.id;
      await restaurantReviewRepo.save({
        restaurantId: savedRest.id,
        userId: reviewerId,
        rating: Math.floor(4 + Math.random() * 2),
        comment: [
          'Kuru fasulyesi ve pilavı gerçekten harika. Tır otoparkı çok büyük ve emniyetli.',
          'Banyoları tertemiz, şoförler için dinlenme alanı çok konforlu tasarlanmış.',
          'Hizmet hızlı, porsiyonlar doyurucu, fiyatlar da şoför dostu. Tavsiye ederim.',
          '7/24 sıcak çorba bulabilmek harika bir lüks. Güvenli park yeri arayanlara ideal.',
          'Mescidi temiz, otoparkı güvenli ve çalışanları son derece kibar.'
        ][rIdx % 5],
        isDeleted: false
      });
    }
  }

  console.log('✅ GERÇEKÇİ 15 ADET LOKANTA VE ALT MENÜ ÜRÜNLERİ EKLENDİ!');
  console.log('✅ GERÇEKÇİ 10 ADET AKARYAKIT İSTASYONU VE HİZMETLERİ EKLENDİ!');

  // Seed default announcement
  await announcementRepo.save(announcementRepo.create({
    content: 'Örnek Duyuru: Bu akşam 02:00-04:00 saatleri arasında sistem düzenlemesi yapılacağından uygulama geçici olarak devre dışı kalacaktır.'
  }));
  console.log('✅ ÖRNEK SİSTEM DUYURUSU SEED EDİLDİ!');

  console.log('==================================================');
  console.log('✅ SEED BAŞARIYLA TAMAMLANDI! EN AZ 20 VERİ YÜKLENDİ.');
  console.log('==================================================');
  console.log(`👤 Kullanıcı sayısı: ${users.length} (İlyas Duran Super Admin dahil!)`);
  console.log(`📦 Yük sayısı: ${loads.length}`);
  console.log(`📁 Gider Kategori sayısı: ${categories.length}`);
  console.log(`📉 Toplam Gider sayısı: 20`);
  console.log(`📈 Toplam Gelir sayısı: 15`);
  console.log(`📄 Toplam E-Belge (Fatura) sayısı: 15`);
  // ── Demo Vehicles & Listings ─────────────────────────────
  const vehicleRepo = app.get(getRepositoryToken(VehicleEntity));
  const vehiclePhotoRepo = app.get(getRepositoryToken(VehiclePhotoEntity));
  const vehicleCatRepo = app.get(getRepositoryToken(VehicleCategoryEntity));
  const vehicleListingRepo = app.get(getRepositoryToken(VehicleListingEntity));
  const vehicleBidRepo = app.get(getRepositoryToken(VehicleBidEntity));

  console.log('Seeding 10 demo vehicles...');
  try {

  const demoVehicles = [
    { brand: 'Ford', model: 'F-Max', year: 2023, mileage: 85000, fuelType: 'dizel', transmission: 'otomatik', color: 'Beyaz', plate: '34FM2023', description: 'Ford F-Max cekici, bakimli ve kazasiz. Uzun yolda sorunsuz calisir. filo aracimizdi.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Yetkili servis bakimli, tum kayitlar mevcut.' },
    { brand: 'Mercedes', model: 'Actros', year: 2022, mileage: 120000, fuelType: 'dizel', transmission: 'otomatik', color: 'Kirmizi', plate: '06MA2022', description: 'Mercedes Actros 1845 LS. Frigorifik dorseli, soguk zincir tasimaciligina uygun. Tam bakimli.', hasAccident: true, accidentDetail: '2024 yilinda tampon degisimi yapildi, agir hasar yok.', hasServiceRecord: true, serviceDetail: 'Mercedes yetkili servis bakimli.' },
    { brand: 'Scania', model: 'R500', year: 2021, mileage: 200000, fuelType: 'dizel', transmission: 'manuel', color: 'Mavi', plate: '35SR2021', description: 'Scania R500 cekici, yuksek cekis gucu ve yakit tasarrufuyla one cikar. duzgun kullanilmistir.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Periyodik bakimlari aksatilmadi.' },
    { brand: 'Volvo', model: 'FH16', year: 2024, mileage: 45000, fuelType: 'dizel', transmission: 'otomatik', color: 'Siyah', plate: '34VV2024', description: 'Sifir ayarinda Volvo FH16 750 HP. Garantisi devam ediyor. filomuzu kuculttugumuz icin satiyoruz.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Volvo Turkiye garantili, 45.000 km bakimi yapildi.' },
    { brand: 'BMC', model: 'Pro 1144', year: 2020, mileage: 310000, fuelType: 'dizel', transmission: 'manuel', color: 'Beyaz', plate: '34BM2020', description: 'Yerli uretim BMC Pro 1144 cekici, yedek parcasi ucuz ve her yerde bulunur. ekonomik cozum.', hasAccident: true, accidentDetail: '2016 yilinda on panel degisimi, motor ve sase saglam.', hasServiceRecord: false },
    { brand: 'Ford', model: 'Cargo', year: 2022, mileage: 95000, fuelType: 'dizel', transmission: 'manuel', color: 'Yesil', plate: '06FC2022', description: 'Ford Cargo 1838 kamyon, sehirler arasi nakliyeye uygun. 18 ton kapasiteli, temiz arac.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Filo bakimli, 12 ayda bir yag ve filtre degisimi yapilir.' },
    { brand: 'Mercedes', model: 'Atego', year: 2023, mileage: 65000, fuelType: 'dizel', transmission: 'otomatik', color: 'Turuncu', plate: '16MA2023', description: 'Mercedes Atego 1518, sehir ici dagitim icin ideal. frigorifik kasali, 4x2 cekis.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Mercedes Bursa yetkili servisi tarafindan duzenli bakimli.' },
    { brand: 'Iveco', model: 'Stralis', year: 2021, mileage: 155000, fuelType: 'dizel', transmission: 'otomatik', color: 'Lacivert', plate: '07IS2021', description: 'Iveco Stralis AS440 cekici. ekonomik yakit tuketimi ve konforlu surusuyle bilinir.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Tum periyodik bakimlari tam.' },
    { brand: 'Renault', model: 'T-High', year: 2023, mileage: 78000, fuelType: 'dizel', transmission: 'otomatik', color: 'Beyaz', plate: '59RT2023', description: 'Renault Trucks T-High 520. turbo compound motor, dusuk yakit tuketimi. uzun yol konforu.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'Renault Turkiye garantili.' },
    { brand: 'MAN', model: 'TGX', year: 2022, mileage: 110000, fuelType: 'dizel', transmission: 'otomatik', color: 'Gri', plate: '34MT2022', description: 'MAN TGX 18.510. yuksek tork, yuksek performans. filo standardimiz degistigi icin satisa cikarildi.', hasAccident: false, hasServiceRecord: true, serviceDetail: 'MAN yetkili servis bakimli.' },
  ];

  // Build categories from vehicles
  const catMap = new Map<string, string>();
  for (const v of demoVehicles) {
    const brandKey = v.brand;
    const modelKey = `${v.brand}/${v.model}`;
    if (!catMap.has(brandKey)) {
      let brandCat = await vehicleCatRepo.findOne({ where: { name: v.brand, type: 'brand', parentId: null as any } });
      if (!brandCat) {
        brandCat = vehicleCatRepo.create({ name: v.brand, slug: v.brand.toLowerCase(), type: 'brand' });
        brandCat = await vehicleCatRepo.save(brandCat);
      }
      catMap.set(brandKey, brandCat.id);
    }
    const brandId = catMap.get(brandKey)!;
    if (!catMap.has(modelKey)) {
      let modelCat = await vehicleCatRepo.findOne({ where: { name: v.model, type: 'model', parentId: brandId } });
      if (!modelCat) {
        modelCat = vehicleCatRepo.create({ name: v.model, slug: `${v.brand.toLowerCase()}/${v.model.toLowerCase()}`, type: 'model', parentId: brandId });
        modelCat = await vehicleCatRepo.save(modelCat);
      }
      catMap.set(modelKey, modelCat.id);
    }
  }

  // Create vehicles and listings
  const vehicleOwnerUsers = users.slice(1, 5); // first 4 carriers as vehicle owners
  const vehicleEntities = [];
  for (let i = 0; i < demoVehicles.length; i++) {
    const dv = demoVehicles[i];
    const owner = vehicleOwnerUsers[i % vehicleOwnerUsers.length];
    const modelKey = `${dv.brand}/${dv.model}`;
    const categoryId = catMap.get(modelKey);

    const v = vehicleRepo.create({ ...dv, userId: owner.id, status: VehicleStatus.DRAFTED, categoryId });
    const saved = await vehicleRepo.save(v as any);

    // Add 3-5 photos per vehicle
    const photoCount = 3 + (i % 3);
    for (let p = 0; p < photoCount; p++) {
      const photo = vehiclePhotoRepo.create({
        vehicleId: saved.id,
        url: `https://picsum.photos/seed/vehicle${i}${p}/640/480`,
        sortOrder: p,
      });
      await vehiclePhotoRepo.save(photo as any);
    }

    // Create listings for half the vehicles
    if (i < 5) {
      const isAuction = i % 2 === 0;
      const listing = vehicleListingRepo.create({
        vehicleId: saved.id,
        sellerId: owner.id,
        saleType: isAuction ? SaleType.AUCTION : SaleType.FIXED,
        price: isAuction ? null : 800000 + i * 150000,
        startingBid: isAuction ? 500000 + i * 100000 : null,
        reservePrice: isAuction ? 700000 + i * 120000 : null,
        buyNowPrice: isAuction ? 1200000 + i * 100000 : null,
        bidIncrement: 5000,
        auctionStart: isAuction ? new Date() : null,
        auctionEnd: isAuction ? new Date(Date.now() + 3 * 86400000) : null,
        status: ListingStatus.ACTIVE,
      });
      await vehicleListingRepo.save(listing as any);

      // Mark vehicle as active
      await vehicleRepo.update(saved.id, { status: VehicleStatus.ACTIVE } as any);
    }
  }

  console.log('Demo vehicles seeded successfully.');
  } catch (err: any) {
    console.log(`Demo vehicles skipped: ${err.message?.substring(0, 120)}`);
  }

  // ======== 8.2: CITIES & DISTRICTS SEED ========
  console.log('Seeding 81 cities with districts...');
  const { City } = await import('./common/city.entity');
  const { District } = await import('./common/district.entity');
  const cityRepo = app.get(getRepositoryToken(City));
  const districtRepo = app.get(getRepositoryToken(District));

  const CITY_DATA: Array<{ code: string; name: string; districts: string[] }> = [
    { code: '01', name: 'Adana', districts: ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Ceyhan', 'Kozan'] },
    { code: '02', name: 'Adıyaman', districts: ['Merkez', 'Besni', 'Gölbaşı', 'Kâhta'] },
    { code: '03', name: 'Afyonkarahisar', districts: ['Merkez', 'Bolvadin', 'Dinar', 'Sandıklı'] },
    { code: '04', name: 'Ağrı', districts: ['Merkez', 'Doğubayazıt', 'Patnos', 'Diyadin'] },
    { code: '05', name: 'Amasya', districts: ['Merkez', 'Merzifon', 'Suluova', 'Taşova'] },
    { code: '06', name: 'Ankara', districts: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Polatlı', 'Kızılcahamam'] },
    { code: '07', name: 'Antalya', districts: ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat', 'Serik'] },
    { code: '08', name: 'Artvin', districts: ['Merkez', 'Hopa', 'Arhavi', 'Borçka'] },
    { code: '09', name: 'Aydın', districts: ['Efeler', 'Kuşadası', 'Didim', 'Nazilli', 'Söke'] },
    { code: '10', name: 'Balıkesir', districts: ['Karesi', 'Altıeylül', 'Bandırma', 'Edremit', 'Ayvalık', 'Susurluk'] },
    { code: '11', name: 'Bilecik', districts: ['Merkez', 'Bozüyük', 'Osmaneli', 'Söğüt'] },
    { code: '12', name: 'Bingöl', districts: ['Merkez', 'Genç', 'Solhan', 'Karlıova'] },
    { code: '13', name: 'Bitlis', districts: ['Merkez', 'Tatvan', 'Ahlat', 'Adilcevaz'] },
    { code: '14', name: 'Bolu', districts: ['Merkez', 'Gerede', 'Mengen', 'Mudurnu'] },
    { code: '15', name: 'Burdur', districts: ['Merkez', 'Bucak', 'Gölhisar', 'Tefenni'] },
    { code: '16', name: 'Bursa', districts: ['Osmangazi', 'Yıldırım', 'Nilüfer', 'Gemlik', 'İnegöl', 'Mudanya'] },
    { code: '17', name: 'Çanakkale', districts: ['Merkez', 'Biga', 'Gelibolu', 'Ezine', 'Ayvacık'] },
    { code: '18', name: 'Çankırı', districts: ['Merkez', 'Çerkeş', 'Ilgaz', 'Orta'] },
    { code: '19', name: 'Çorum', districts: ['Merkez', 'Sungurlu', 'Alaca', 'Osmancık'] },
    { code: '20', name: 'Denizli', districts: ['Pamukkale', 'Merkezefendi', 'Çivril', 'Sarayköy', 'Tavas'] },
    { code: '21', name: 'Diyarbakır', districts: ['Kayapınar', 'Bağlar', 'Yenişehir', 'Sur', 'Bismil', 'Silvan'] },
    { code: '22', name: 'Edirne', districts: ['Merkez', 'Keşan', 'Uzunköprü', 'İpsala'] },
    { code: '23', name: 'Elazığ', districts: ['Merkez', 'Keban', 'Baskil', 'Palu'] },
    { code: '24', name: 'Erzincan', districts: ['Merkez', 'Tercan', 'Üzümlü', 'Refahiye'] },
    { code: '25', name: 'Erzurum', districts: ['Yakutiye', 'Palandöken', 'Aziziye', 'Horasan', 'Oltu'] },
    { code: '26', name: 'Eskişehir', districts: ['Odunpazarı', 'Tepebaşı', 'Sivrihisar', 'İnönü'] },
    { code: '27', name: 'Gaziantep', districts: ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye', 'Nurdağı'] },
    { code: '28', name: 'Giresun', districts: ['Merkez', 'Bulancak', 'Tirebolu', 'Görele'] },
    { code: '29', name: 'Gümüşhane', districts: ['Merkez', 'Kelkit', 'Şiran', 'Torul'] },
    { code: '30', name: 'Hakkâri', districts: ['Merkez', 'Yüksekova', 'Şemdinli', 'Çukurca'] },
    { code: '31', name: 'Hatay', districts: ['Antakya', 'İskenderun', 'Defne', 'Kırıkhan', 'Reyhanlı'] },
    { code: '32', name: 'Isparta', districts: ['Merkez', 'Yalvaç', 'Eğirdir', 'Şarkikaraağaç'] },
    { code: '33', name: 'Mersin', districts: ['Akdeniz', 'Toroslar', 'Yenişehir', 'Mezitli', 'Tarsus', 'Silifke'] },
    { code: '34', name: 'İstanbul', districts: ['Fatih', 'Kadıköy', 'Beşiktaş', 'Şişli', 'Üsküdar', 'Tuzla', 'Gebze_referans', 'Pendik', 'Beylikdüzü', 'Esenyurt', 'Sarıyer'] },
    { code: '35', name: 'İzmir', districts: ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir', 'Aliağa'] },
    { code: '36', name: 'Kars', districts: ['Merkez', 'Sarıkamış', 'Kağızman', 'Digor'] },
    { code: '37', name: 'Kastamonu', districts: ['Merkez', 'Tosya', 'Taşköprü', 'İnebolu'] },
    { code: '38', name: 'Kayseri', districts: ['Melikgazi', 'Kocasinan', 'Talas', 'Develi', 'Yahyalı'] },
    { code: '39', name: 'Kırklareli', districts: ['Merkez', 'Lüleburgaz', 'Babaeski', 'Pınarhisar'] },
    { code: '40', name: 'Kırşehir', districts: ['Merkez', 'Kaman', 'Mucur', 'Çiçekdağı'] },
    { code: '41', name: 'Kocaeli', districts: ['İzmit', 'Gebze', 'Darıca', 'Körfez', 'Derince', 'Dilovası'] },
    { code: '42', name: 'Konya', districts: ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir'] },
    { code: '43', name: 'Kütahya', districts: ['Merkez', 'Tavşanlı', 'Simav', 'Gediz'] },
    { code: '44', name: 'Malatya', districts: ['Battalgazi', 'Yeşilyurt', 'Doğanşehir', 'Darende'] },
    { code: '45', name: 'Manisa', districts: ['Şehzadeler', 'Yunusemre', 'Akhisar', 'Salihli', 'Turgutlu', 'Soma'] },
    { code: '46', name: 'Kahramanmaraş', districts: ['Dulkadiroğlu', 'Onikişubat', 'Elbistan', 'Afşin', 'Pazarcık'] },
    { code: '47', name: 'Mardin', districts: ['Artuklu', 'Kızıltepe', 'Nusaybin', 'Midyat'] },
    { code: '48', name: 'Muğla', districts: ['Menteşe', 'Bodrum', 'Fethiye', 'Marmaris', 'Milas', 'Datça'] },
    { code: '49', name: 'Muş', districts: ['Merkez', 'Bulanık', 'Malazgirt', 'Varto'] },
    { code: '50', name: 'Nevşehir', districts: ['Merkez', 'Ürgüp', 'Avanos', 'Gülşehir'] },
    { code: '51', name: 'Niğde', districts: ['Merkez', 'Bor', 'Ulukışla', 'Çiftlik'] },
    { code: '52', name: 'Ordu', districts: ['Altınordu', 'Fatsa', 'Ünye', 'Perşembe'] },
    { code: '53', name: 'Rize', districts: ['Merkez', 'Çayeli', 'Ardeşen', 'Pazar'] },
    { code: '54', name: 'Sakarya', districts: ['Adapazarı', 'Serdivan', 'Erenler', 'Hendek', 'Akyazı', 'Karasu'] },
    { code: '55', name: 'Samsun', districts: ['İlkadım', 'Atakum', 'Canik', 'Bafra', 'Çarşamba', 'Tekkeköy'] },
    { code: '56', name: 'Siirt', districts: ['Merkez', 'Kurtalan', 'Eruh', 'Pervari'] },
    { code: '57', name: 'Sinop', districts: ['Merkez', 'Boyabat', 'Gerze', 'Türkeli'] },
    { code: '58', name: 'Sivas', districts: ['Merkez', 'Divriği', 'Zara', 'Suşehri', 'Gemerek', 'Şarkışla'] },
    { code: '59', name: 'Tekirdağ', districts: ['Süleymanpaşa', 'Çorlu', 'Çerkezköy', 'Malkara', 'Saray'] },
    { code: '60', name: 'Tokat', districts: ['Merkez', 'Turhal', 'Zile', 'Erbaa', 'Niksar'] },
    { code: '61', name: 'Trabzon', districts: ['Ortahisar', 'Akçaabat', 'Araklı', 'Of', 'Yomra'] },
    { code: '62', name: 'Tunceli', districts: ['Merkez', 'Pertek', 'Ovacık', 'Çemişgezek'] },
    { code: '63', name: 'Şanlıurfa', districts: ['Haliliye', 'Karaköprü', 'Eyyübiye', 'Siverek', 'Suruç', 'Viranşehir'] },
    { code: '64', name: 'Uşak', districts: ['Merkez', 'Banaz', 'Eşme', 'Ulubey'] },
    { code: '65', name: 'Van', districts: ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş', 'Başkale', 'Özalp'] },
    { code: '66', name: 'Yozgat', districts: ['Merkez', 'Sorgun', 'Yerköy', 'Akdağmadeni'] },
    { code: '67', name: 'Zonguldak', districts: ['Merkez', 'Ereğli', 'Çaycuma', 'Devrek'] },
    { code: '68', name: 'Aksaray', districts: ['Merkez', 'Ortaköy', 'Eskil', 'Gülağaç'] },
    { code: '69', name: 'Bayburt', districts: ['Merkez', 'Aydıntepe', 'Demirözü'] },
    { code: '70', name: 'Karaman', districts: ['Merkez', 'Ermenek', 'Ayrancı', 'Kazımkarabekir'] },
    { code: '71', name: 'Kırıkkale', districts: ['Merkez', 'Yahşihan', 'Delice', 'Keskin'] },
    { code: '72', name: 'Batman', districts: ['Merkez', 'Kozluk', 'Sason', 'Beşiri'] },
    { code: '73', name: 'Şırnak', districts: ['Merkez', 'Cizre', 'Silopi', 'İdil'] },
    { code: '74', name: 'Bartın', districts: ['Merkez', 'Kurucaşile', 'Ulus', 'Amasra'] },
    { code: '75', name: 'Ardahan', districts: ['Merkez', 'Göle', 'Çıldır', 'Hanak'] },
    { code: '76', name: 'Iğdır', districts: ['Merkez', 'Tuzluca', 'Aralık', 'Karakoyunlu'] },
    { code: '77', name: 'Yalova', districts: ['Merkez', 'Çınarcık', 'Çiftlikköy', 'Termal'] },
    { code: '78', name: 'Karabük', districts: ['Merkez', 'Safranbolu', 'Yenice', 'Eskipazar'] },
    { code: '79', name: 'Kilis', districts: ['Merkez', 'Musabeyli', 'Polateli', 'Elbeyli'] },
    { code: '80', name: 'Osmaniye', districts: ['Merkez', 'Kadirli', 'Düziçi', 'Bahçe'] },
    { code: '81', name: 'Düzce', districts: ['Merkez', 'Akçakoca', 'Cumayeri', 'Gölyaka', 'Kaynaşlı'] },
  ];

  for (const c of CITY_DATA) {
    const city = cityRepo.create({ plateCode: c.code, name: c.name });
    await cityRepo.save(city);

    for (let i = 0; i < c.districts.length; i++) {
      const d = districtRepo.create({
        cityPlateCode: c.code,
        name: c.districts[i],
        isDefault: i === 0,
      });
      await districtRepo.save(d);
    }
  }
  console.log(`Seeded ${CITY_DATA.length} cities with districts.`);

  // ======== EX-013: MARKETPLACE SEED ========
  console.log('Seeding marketplace categories...');
  const { ListingCategory: MktCategory } = await import('./marketplace/listing-category.entity');
  const { Listing: MktListing, ListingStatus: MktListingStatus } = await import('./marketplace/listing.entity');
  const { VehicleDetail: MktVehicleDetail, VehicleType: MktVehicleType } = await import('./marketplace/vehicle-detail.entity');
  const mktCatRepo = app.get(getRepositoryToken(MktCategory));
  const mktListingRepo = app.get(getRepositoryToken(MktListing));
  const mktVehicleDetRepo = app.get(getRepositoryToken(MktVehicleDetail));

  const marketCategories = [
    { nameTr: 'Çekici (TIR)', nameEn: 'Tractor Truck', slug: 'cekici-tir', icon: '🚛', sortOrder: 1 },
    { nameTr: 'Dorse / Treyler', nameEn: 'Trailer', slug: 'dorse-treyler', icon: '📦', sortOrder: 2 },
    { nameTr: 'Kamyon', nameEn: 'Truck', slug: 'kamyon', icon: '🚚', sortOrder: 3 },
    { nameTr: 'Kamyonet / Panelvan', nameEn: 'Pickup/Van', slug: 'kamyonet-panelvan', icon: '🚐', sortOrder: 4 },
    { nameTr: 'Frigorifik Araç', nameEn: 'Refrigerated Vehicle', slug: 'frigorifik-arac', icon: '❄️', sortOrder: 5 },
    { nameTr: 'Tanker / Silobas', nameEn: 'Tanker/Silo', slug: 'tanker-silobas', icon: '⛽', sortOrder: 6 },
    { nameTr: 'Lowbed / Ağır Nakliye', nameEn: 'Lowbed/Heavy Haul', slug: 'lowbed-agir-nakliye', icon: '⚙️', sortOrder: 7 },
    { nameTr: 'Lastik & Jant', nameEn: 'Tires & Rims', slug: 'lastik-jant', icon: '🛞', sortOrder: 8 },
    { nameTr: 'Yedek Parça', nameEn: 'Spare Parts', slug: 'yedek-parca', icon: '🔧', sortOrder: 9 },
    { nameTr: 'Konteyner / Ekipman', nameEn: 'Container/Equipment', slug: 'konteyner-ekipman', icon: '📦', sortOrder: 10 },
  ];
  for (const mc of marketCategories) {
    await mktCatRepo.save(mktCatRepo.create(mc));
  }

  console.log('Seeding demo marketplace listings...');
  const tasiyicilar = await userRepo.find({ where: { role: UserRole.TASIYICI }, take: 5 });
  const seller = tasiyicilar[0] || (await userRepo.findOne({ where: { role: UserRole.SUPER_ADMIN } }));

  const demoListings = [
    { title: '2019 Mercedes Actros 1845 LS Çekici', catIdx: 0, price: 1850000, city: 'İstanbul', desc: '450 HP, Euro 6, 680.000 km, bakımlı, kazasız' },
    { title: 'Saf kar Kuruyük Dorse 13.60m', catIdx: 1, price: 520000, city: 'Ankara', desc: 'Tenteli, 13.60m, 2020 model, fren sistemi yenilenmiş' },
    { title: '2021 BMC Pro 940 Kamyon', catIdx: 2, price: 1200000, city: 'İzmir', desc: '400 HP, 10 teker, damperli kasa, 150.000 km' },
    { title: 'Ford Transit 350L Panelvan', catIdx: 3, price: 450000, city: 'Bursa', desc: '2022 model, 80.000 km, şehir içi dağıtım için ideal' },
    { title: 'Thermo King Frigorifik Treyler', catIdx: 4, price: 750000, city: 'Mersin', desc: 'Soğutma ünitesi 2000 saat, ATP FRC sertifikalı' },
  ];

  for (const dl of demoListings) {
    const listing = mktListingRepo.create({
      title: dl.title,
      categoryId: dl.catIdx + 1,
      sellerId: seller.id,
      price: dl.price,
      currency: 'TRY',
      description: dl.desc,
      fullAddress: `${dl.city} OSB Mah. Lojistik Cad.`,
      city: dl.city,
      district: 'Merkez',
      status: MktListingStatus.ACTIVE,
      isEscrowSupported: true,
      isNegotiable: true,
    });
    const saved = await mktListingRepo.save(listing);

    const vd = mktVehicleDetRepo.create({
      listingId: saved.id,
      vehicleType: dl.catIdx <= 2 ? (dl.catIdx === 0 ? MktVehicleType.CEKICI : dl.catIdx === 1 ? MktVehicleType.DORSE : MktVehicleType.KAMYON) : MktVehicleType.CEKICI,
      brand: dl.title.split(' ')[0],
      model: dl.title.split(' ').slice(1, 3).join(' '),
      modelYear: 2019 + dl.catIdx,
      totalWeightKg: 25000 + dl.catIdx * 5000,
      axleCapacityKg: 11500,
      kingPinDiameter: 2.0,
      adrClass: dl.catIdx === 5 ? '3' : null,
    });
    await mktVehicleDetRepo.save(vd);
  }
  console.log(`Seeded ${demoListings.length} marketplace listings with vehicle details.`);

  // ======== EX-005: RBAC PERMISSIONS SEED ========
  console.log('Seeding RBAC permissions...');
  const { Permission } = await import('./common/permission.entity');
  const { RolePermission } = await import('./common/role-permission.entity');
  const permRepo = app.get(getRepositoryToken(Permission));
  const rolePermRepo = app.get(getRepositoryToken(RolePermission));

  const permissionDefs: { key: string; label: string; group: string }[] = [
    // Load / Shipment (7) — mobile uyumlu
    { key: 'load:create', label: 'Yük Oluştur', group: 'Yük' },
    { key: 'load:view', label: 'Yük Görüntüle', group: 'Yük' },
    { key: 'load:edit', label: 'Yük Düzenle', group: 'Yük' },
    { key: 'load:delete', label: 'Yük Sil', group: 'Yük' },
    { key: 'load:bid', label: 'Yüke Teklif Ver', group: 'Yük' },
    { key: 'load:accept', label: 'Yük Kabul Et', group: 'Yük' },
    { key: 'load:track', label: 'Yük Takip Et', group: 'Yük' },
    // Bid (4)
    { key: 'bid:create', label: 'Teklif Ver', group: 'Teklif' },
    { key: 'bid:accept', label: 'Teklif Kabul Et', group: 'Teklif' },
    { key: 'bid:reject', label: 'Teklif Reddet', group: 'Teklif' },
    { key: 'bid:view', label: 'Teklifleri Gör', group: 'Teklif' },
    // GIB / E-Documents (3)
    { key: 'gib:view_invoices', label: 'Faturaları Gör', group: 'E-Belge' },
    { key: 'gib:create_invoice', label: 'Fatura Oluştur', group: 'E-Belge' },
    { key: 'gib:send_gib', label: 'GİB\'e Gönder', group: 'E-Belge' },
    // Finance (5) — mobile finance:create_expense, create_income, manage_budget
    { key: 'finance:view', label: 'Finans Görüntüle', group: 'Finans' },
    { key: 'finance:create_expense', label: 'Gider Ekle', group: 'Finans' },
    { key: 'finance:create_income', label: 'Gelir Ekle', group: 'Finans' },
    { key: 'finance:manage_budget', label: 'Bütçe Yönetimi', group: 'Finans' },
    { key: 'finance:view_dashboard', label: 'Finans Paneli', group: 'Finans' },
    // Escrow / Payment (3)
    { key: 'escrow:use', label: 'Escrow Kullan', group: 'Ödeme' },
    { key: 'escrow:dispute', label: 'İhtilaf Aç', group: 'Ödeme' },
    { key: 'escrow:release', label: 'Escrow Serbest Bırak', group: 'Ödeme' },
    // Profile / Carrier (3)
    { key: 'profile:edit', label: 'Profil Düzenle', group: 'Profil' },
    { key: 'profile:verify_docs', label: 'Belge Doğrulama', group: 'Profil' },
    { key: 'profile:view_wallet', label: 'Cüzdan Görüntüle', group: 'Profil' },
    // Marketplace (3) — YENI
    { key: 'marketplace:view', label: 'Marketplace Görüntüle', group: 'Marketplace' },
    { key: 'marketplace:create_listing', label: 'İlan Oluştur', group: 'Marketplace' },
    { key: 'marketplace:buy', label: 'Satın Alma', group: 'Marketplace' },
    // Roadside Services (4)
    { key: 'roadside:view_fuel', label: 'Yakıt İstasyonları', group: 'Yol Üstü' },
    { key: 'roadside:view_restaurants', label: 'Restoranlar', group: 'Yol Üstü' },
    { key: 'roadside:make_reservation', label: 'Rezervasyon Yap', group: 'Yol Üstü' },
    { key: 'roadside:write_review', label: 'Yorum Yap', group: 'Yol Üstü' },
    // Admin / Super Admin (7)
    { key: 'admin:view_panel', label: 'Admin Paneli', group: 'Yönetim' },
    { key: 'admin:manage_users', label: 'Kullanıcı Yönetimi', group: 'Yönetim' },
    { key: 'admin:moderate_listings', label: 'İlan Denetimi', group: 'Yönetim' },
    { key: 'admin:resolve_disputes', label: 'İhtilaf Çözümü', group: 'Yönetim' },
    { key: 'admin:manage_promotions', label: 'Duyuru Yönetimi', group: 'Yönetim' },
    { key: 'admin:manage_kvkk', label: 'KVKK Yönetimi', group: 'Yönetim' },
    { key: 'admin:integrations', label: 'Entegrasyon Yönetimi', group: 'Yönetim' },
    // Analytics
    { key: 'analytics:view', label: 'Analiz Görüntüle', group: 'Analiz' },
    // Communication (2)
    { key: 'chat:use', label: 'Mesajlaşma', group: 'İletişim' },
    { key: 'notifications:view', label: 'Bildirimler', group: 'İletişim' },
    // AI / Voice (2)
    { key: 'ai:use_dialog', label: 'AI Asistan', group: 'Yapay Zeka' },
    { key: 'ai:use_voice_commands', label: 'Sesli Komut', group: 'Yapay Zeka' },
    // Drive Mode
    { key: 'drive_mode:use', label: 'Sürüş Modu', group: 'Sürüş' },
  ];

  const permissions: Record<string, any> = {};
  for (const def of permissionDefs) {
    const existing = await permRepo.findOne({ where: { key: def.key } });
    if (existing) {
      permissions[def.key] = existing;
    } else {
      permissions[def.key] = await permRepo.save(permRepo.create(def));
    }
  }

  const ALL = permissionDefs.map((d) => d.key);

  // Role-permission mappings — mobile ROLE_PERMISSIONS ile senkron
  const rolePermMap: Record<string, string[]> = {
    super_admin: ALL,
    admin: ALL,
    isletme: ['load:create', 'load:edit', 'load:view', 'load:track', 'load:bid', 'bid:accept', 'bid:reject', 'bid:view', 'gib:view_invoices', 'gib:create_invoice', 'finance:view', 'finance:view_dashboard', 'finance:create_expense', 'escrow:use', 'escrow:dispute', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:write_review', 'profile:edit', 'profile:view_wallet', 'chat:use', 'analytics:view', 'admin:integrations', 'marketplace:view'],
    yuk_veren: ['load:create', 'load:edit', 'load:delete', 'load:view', 'load:track', 'load:bid', 'bid:accept', 'bid:reject', 'bid:view', 'gib:view_invoices', 'gib:create_invoice', 'finance:view', 'finance:view_dashboard', 'escrow:use', 'profile:edit', 'profile:view_wallet', 'roadside:view_fuel', 'roadside:view_restaurants', 'chat:use', 'analytics:view'],
    tasiyici: ['load:view', 'load:bid', 'load:accept', 'load:track', 'bid:create', 'bid:view', 'gib:view_invoices', 'gib:create_invoice', 'finance:view', 'finance:create_expense', 'escrow:use', 'escrow:dispute', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation', 'roadside:write_review', 'profile:edit', 'profile:verify_docs', 'profile:view_wallet', 'analytics:view', 'chat:use', 'notifications:view', 'drive_mode:use'],
    sofor: ['load:view', 'load:bid', 'load:accept', 'load:track', 'bid:view', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation', 'profile:edit', 'chat:use', 'drive_mode:use', 'notifications:view'],
    filo_yoneticisi: ['load:create', 'load:edit', 'load:view', 'load:track', 'load:bid', 'bid:create', 'bid:accept', 'bid:reject', 'bid:view', 'gib:view_invoices', 'finance:view_dashboard', 'finance:view', 'finance:create_expense', 'escrow:use', 'escrow:dispute', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:make_reservation', 'profile:edit', 'profile:view_wallet', 'chat:use', 'analytics:view', 'notifications:view', 'admin:integrations'],
    muhasebe: ['gib:view_invoices', 'gib:create_invoice', 'gib:send_gib', 'finance:view', 'finance:view_dashboard', 'finance:create_expense', 'finance:create_income', 'finance:manage_budget', 'escrow:dispute', 'profile:edit', 'profile:view_wallet', 'notifications:view'],
    genel: ['load:view', 'load:bid', 'finance:view', 'profile:edit', 'marketplace:view', 'marketplace:buy', 'roadside:view_fuel', 'roadside:view_restaurants', 'roadside:write_review', 'chat:use', 'notifications:view'],
    // Eksik roller icin mapping eklendi
    operasyon: ['load:view', 'load:track', 'load:bid', 'load:accept', 'bid:view', 'finance:view', 'profile:edit', 'roadside:view_fuel', 'roadside:view_restaurants', 'chat:use', 'notifications:view', 'analytics:view'],
    destek: ['load:view', 'bid:view', 'finance:view', 'profile:edit', 'chat:use', 'notifications:view', 'admin:view_panel'],
    platform_operatoru: ['load:view', 'finance:view', 'profile:edit', 'marketplace:view', 'roadside:view_fuel', 'roadside:view_restaurants', 'chat:use', 'notifications:view', 'analytics:view', 'admin:view_panel', 'admin:moderate_listings'],
    marketplace_satici: ['load:view', 'finance:view', 'profile:edit', 'marketplace:view', 'marketplace:create_listing', 'chat:use', 'notifications:view'],
    marketplace_alici: ['load:view', 'finance:view', 'profile:edit', 'marketplace:view', 'marketplace:buy', 'chat:use', 'notifications:view'],
    dispute_moderator: ['load:view', 'escrow:dispute', 'escrow:release', 'admin:resolve_disputes', 'profile:edit', 'chat:use', 'notifications:view', 'finance:view'],
    guest: ['load:view', 'roadside:view_fuel', 'roadside:view_restaurants'],
  };

  for (const [role, permKeys] of Object.entries(rolePermMap)) {
    for (const key of permKeys) {
      const perm = permissions[key];
      if (!perm) continue;
      const exists = await rolePermRepo.findOne({ where: { role, permissionId: perm.id } });
      if (!exists) {
        await rolePermRepo.save(rolePermRepo.create({ role, permissionId: perm.id }));
      }
    }
  }

  console.log(`Seeded ${Object.keys(permissions).length} permissions and ${Object.values(rolePermMap).flat().length} role-permission mappings.`);

  console.log('==================================================');

  await app.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed hatası:', err);
  process.exit(1);
});
