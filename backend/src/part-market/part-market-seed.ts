import { DataSource } from 'typeorm';
import { PartCategory, PartCommissionConfig } from './entities/part-entities';

const CATEGORIES = [
  { name: 'Motor & Aktarma', slug: 'motor', icon: '🚛', children: ['Komple Motor','Motor Bloğu','Silindir Kapağı','Turboşarj','Enjektör & Pompa','Şanzıman','Debriyaj & Volan','Diferansiyel','Şaft & Aks','Motor Elektroniği'] },
  { name: 'Yürüyen Aksam', slug: 'yuruyen', icon: '🔧', children: ['Makas & Amortisör','Fren Sistemi','Direksiyon Kutusu','Dingil & Porya','Jant & Bijon','Süspansiyon Körüğü'] },
  { name: 'Lastik', slug: 'lastik', icon: '🛞', children: ['Çekici Lastiği','Treyler Lastiği','İş Makinası Lastiği','Jant Takımı'] },
  { name: 'Elektrik & Elektronik', slug: 'elektrik', icon: '⚡', children: ['Marş Motoru','Alternatör','Akü','Far & Stop','Kablo Tesisatı','Gösterge Paneli','Araç Kamerası'] },
  { name: 'Kaporta & Kabin', slug: 'kaporta', icon: '🛡️', children: ['Kapı & Kaput','Çamurluk','Tampon & Izgara','Ayna','Kabin İçi','Rüzgarlık'] },
  { name: 'Soğutma & Isıtma', slug: 'sogutma', icon: '❄️', children: ['Radyatör','Intercooler','Su Pompası','Kalorifer & Klima','Fan & Vantilatör'] },
  { name: 'Dorse & Treyler', slug: 'dorse', icon: '🔩', children: ['Tenteli Dorse','Mega Dorse','Frigo Dorse','Damper Dorse','Dorse Aksamı'] },
  { name: 'Aksesuar & Ekipman', slug: 'aksesuar', icon: '🛠️', children: ['Takograf','Branda & Kemer','Yangın Tüpü','Takım Çantası','Araç Buzdolabı'] },
];

async function seed() {
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USER || 'kaptan', password: process.env.DB_PASS || 'kaptan_dev_2026',
    database: process.env.DB_NAME || 'kaptan', entities: [PartCategory, PartCommissionConfig], synchronize: true,
  });
  await ds.initialize();
  console.log('📦 Part Market seed başlıyor...\n');

  const catRepo = ds.getRepository(PartCategory);
  const existing = await catRepo.count();
  if (existing > 0) { console.log(`⏭️ Kategoriler zaten var (${existing} adet)`); await ds.destroy(); return; }

  for (let i = 0; i < CATEGORIES.length; i++) {
    const parent = await catRepo.save({ name: CATEGORIES[i].name, slug: CATEGORIES[i].slug, icon: CATEGORIES[i].icon, sortOrder: i + 1, isActive: true });
    for (let j = 0; j < CATEGORIES[i].children.length; j++) {
      const childSlug = `${CATEGORIES[i].slug}-${CATEGORIES[i].children[j].toLowerCase().replace(/[ &]/g,'-').replace(/[ğ]/g,'g').replace(/[ü]/g,'u').replace(/[ş]/g,'s').replace(/[ö]/g,'o').replace(/[ç]/g,'c').replace(/[ı]/g,'i')}`;
      await catRepo.save({ name: CATEGORIES[i].children[j], slug: childSlug, parentId: parent.id, sortOrder: j + 1, isActive: true });
    }
  }
  console.log(`✅ ${CATEGORIES.length} ana kategori + ${CATEGORIES.reduce((s,c)=>s+c.children.length,0)} alt kategori oluşturuldu`);

  const commRepo = ds.getRepository(PartCommissionConfig);
  const rates = [{ cat: 'motor', rate: 5, min: 50 },{ cat: 'yuruyen', rate: 5, min: 25 },{ cat: 'lastik', rate: 5, min: 25 },{ cat: 'elektrik', rate: 5, min: 25 },{ cat: 'kaporta', rate: 7, min: 50 },{ cat: 'sogutma', rate: 5, min: 25 },{ cat: 'dorse', rate: 7, min: 100 },{ cat: 'aksesuar', rate: 5, min: 10 }];
  for (const r of rates) {
    const cat = await catRepo.findOne({ where: { slug: r.cat } });
    if (cat) await commRepo.save({ categoryId: cat.id, rate: r.rate, minCommission: r.min, isActive: true });
  }
  console.log(`✅ 8 komisyon orani oluşturuldu`);
  console.log('\n🎉 Part Market seed tamamlandı!');
  await ds.destroy();
}
seed().catch((err) => { console.error('Seed hatası:', err.message); process.exit(1); });
