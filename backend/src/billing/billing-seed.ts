/**
 * Billing Seed Script — Abonelik Planlari, Kontor Paketleri, Komisyon Config'leri
 *
 * Calistirma: npx ts-node src/billing/billing-seed.ts
 */
import { DataSource } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreditPackage } from './entities/credit-package.entity';
import { CommissionConfig } from './entities/commission-config.entity';

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USER || 'kaptan',
    password: process.env.DB_PASS || 'kaptan_dev_2026',
    database: process.env.DB_NAME || 'kaptan',
    entities: [SubscriptionPlan, CreditPackage, CommissionConfig],
    synchronize: true,
  });

  await ds.initialize();
  console.log('📦 Billing seed başlıyor...\n');

  // ── Abonelik Planları ──
  const planRepo = ds.getRepository(SubscriptionPlan);
  const existingPlans = await planRepo.count();
  if (existingPlans === 0) {
    await planRepo.save([
      {
        name: 'STARTER',
        displayName: 'Başlangıç',
        monthlyPrice: 199,
        yearlyPrice: 1910.40,
        maxLoads: 10,
        maxUsers: 2,
        features: { webhook: false, api: false, sla: false, premium_support: false, white_label: false },
        description: 'Yeni başlayanlar için temel paket',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'PROFESSIONAL',
        displayName: 'Profesyonel',
        monthlyPrice: 499,
        yearlyPrice: 4790.40,
        maxLoads: 100,
        maxUsers: 5,
        features: { webhook: true, api: false, sla: false, premium_support: false, white_label: false },
        description: 'Büyüyen işletmeler için gelişmiş paket',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'ENTERPRISE',
        displayName: 'Kurumsal',
        monthlyPrice: 1999,
        yearlyPrice: 19190.40,
        maxLoads: -1,
        maxUsers: 50,
        features: { webhook: true, api: true, sla: true, premium_support: true, white_label: true },
        description: 'Büyük filolar ve kurumsal müşteriler için tam kapsamlı paket',
        isActive: true,
        sortOrder: 3,
      },
    ]);
    console.log('✅ 3 Abonelik Planı oluşturuldu');
  } else {
    console.log(`⏭️  Abonelik Planları zaten var (${existingPlans} adet)`);
  }

  // ── Kontör Paketleri ──
  const creditRepo = ds.getRepository(CreditPackage);
  const existingCredits = await creditRepo.count();
  if (existingCredits === 0) {
    await creditRepo.save([
      { name: '50 Kontör', credits: 50, price: 99, bonusCredits: 0, isActive: true, sortOrder: 1 },
      { name: '150 Kontör', credits: 150, price: 249, bonusCredits: 10, isActive: true, sortOrder: 2 },
      { name: '500 Kontör', credits: 500, price: 599, bonusCredits: 50, isActive: true, sortOrder: 3 },
    ]);
    console.log('✅ 3 Kontör Paketi oluşturuldu');
  } else {
    console.log(`⏭️  Kontör Paketleri zaten var (${existingCredits} adet)`);
  }

  // ── Komisyon Config'leri ──
  const commRepo = ds.getRepository(CommissionConfig);
  const existingComm = await commRepo.count();
  if (existingComm === 0) {
    await commRepo.save([
      { name: 'platform_match', displayName: 'Platform Eşleşme', rate: 2.0, description: 'Platform üzerinden bulunan taşıyıcı komisyonu', isActive: true },
      { name: 'own_carrier', displayName: 'Kendi Taşıyıcısı', rate: 0.5, description: 'Kendi anlaşmalı taşıyıcısı ile çalışan gönderici', isActive: true },
      { name: 'escrow_acceleration', displayName: 'Escrow Hızlandırma', rate: 1.0, description: 'QuickPay / erken ödeme ek komisyonu', isActive: true },
      { name: 'insurance', displayName: 'Sigorta', rate: 15.0, description: 'Sigorta priminden platform payı', isActive: true },
      { name: 'fuel_card', displayName: 'Akaryakıt Kartı', rate: 0.5, description: 'Kaptan Kart işlem komisyonu', isActive: true },
      { name: 'early_payment', displayName: 'Erken Ödeme (Faktoring)', rate: 1.0, description: 'Teslimatta anında ödeme faktoring komisyonu', isActive: true },
    ]);
    console.log('✅ 6 Komisyon Config\'i oluşturuldu');
  } else {
    console.log(`⏭️  Komisyon Config'leri zaten var (${existingComm} adet)`);
  }

  console.log('\n🎉 Billing seed tamamlandı!');
  await ds.destroy();
}

seed().catch((err) => {
  console.error('Seed hatası:', err.message);
  process.exit(1);
});
