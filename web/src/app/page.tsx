'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Kategori listesi — mevcut modüller (href ile sayfalara bağlı)
const CATEGORIES = [
  { section: 'Operasyon', items: [
    { id: 'yuk-ekle', label: 'Yük Ekle', icon: '📦', href: '/loads' },
    { id: 'yuk-al', label: 'Yük Al / Taşı', icon: '🚛', href: '/bids' },
    { id: 'geri-donus', label: 'Geri Dönüş Yükü', icon: '🔄', href: '/return-loads' },
    { id: 'evrak-yonetimi', label: 'Evrak Yönetimi', icon: '📋', href: '/documents' },
    { id: 'kalite-skoru', label: 'Taşıyıcı Kalite Skoru', icon: '🏆', href: '/carrier-quality' },
    { id: 'oto-backhaul', label: 'Otomatik Backhaul', icon: '🎯', href: '/reloads' },
    { id: 'canli-takip', label: 'Canlı Takip', icon: '📍', href: '/tracking' },
    { id: 'epod', label: 'ePOD Teslimat', icon: '📋', href: '/pod' },
  ]},
  { section: 'Finans', items: [
    { id: 'guvenli-odeme', label: 'Güvenli Ödeme (Escrow)', icon: '🛡️', href: '/escrow' },
    { id: 'gib', label: 'GİB E-Belgeler', icon: '📄', href: '/gib' },
    { id: 'gelir-gider', label: 'Gelir - Gider', icon: '💰', href: '/finance' },
    { id: 'cuzdan', label: 'Cüzdan', icon: '💳', href: '/wallet' },
  ]},
  { section: 'Tesisler', items: [
    { id: 'yakit', label: 'Yakıt İstasyonları', icon: '⛽', href: '/fuel-stations' },
    { id: 'lokanta', label: 'Yol Üstü Lezzetler', icon: '🍽️', href: '/restaurants' },
    { id: 'depo', label: 'Depo & Antrepo', icon: '🏭', href: '/warehouse' },
  ]},
  { section: 'Pazaryeri', items: [
    { id: 'arac-pazari', label: 'Araç Alış / Satış', icon: '🚗', href: '/marketplace' },
    { id: 'ikinci-el', label: 'İkinci El Parça', icon: '🔧', href: '/part-market' },
    { id: 'arac-filosu', label: 'Araç Filosu', icon: '🚛', href: '/vehicles' },
  ]},
  { section: 'Sistem', items: [
    { id: 'fiyatlandirma', label: 'Akıllı Fiyatlandırma', icon: '📊', href: '/rates' },
    { id: 'ai-eslestirme', label: 'AI Eşleştirme', icon: '🧠', href: '/matching' },
    { id: 'analitik', label: 'Analiz & Rapor', icon: '📊', href: '/analytics' },
    { id: 'entegrasyon', label: 'Entegrasyonlar', icon: '🔗', href: '/integrations' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬', href: '/whatsapp' },
    { id: 'bildirim', label: 'Bildirimler', icon: '🔔', href: '/notifications' },
    { id: 'ayarlar', label: 'Sistem Ayarları', icon: '⚙️', href: '/settings' },
    { id: 'denetim', label: 'Denetim Kayıtları', icon: '📋', href: '/audit' },
  ]},
];

const FAQ_OPTIONS = [
  { value: 'all', label: 'Tüm Sorular' },
  { value: 'delivery', label: 'Teslimat & Kargo' },
  { value: 'payment', label: 'Fatura & Ödeme' },
  { value: 'tips', label: 'Platform İpuçları' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'Filtre Seç...' },
  { value: 'most', label: 'En Çok Taşınan' },
  { value: 'active', label: 'Aktif Gönderiler' },
];

// Demo kart verileri
const DEMO_CARDS = [
  { id: 'TRK-28594', img: 'https://picsum.photos/seed/load1/400/200', title: 'Tekstil Ürünleri — İstanbul → Ankara' },
  { id: 'TRK-28595', img: 'https://picsum.photos/seed/load2/400/200', title: 'Demir Çelik — Kocaeli → İzmir' },
  { id: 'TRK-28596', img: 'https://picsum.photos/seed/load3/400/200', title: 'Gıda Dağıtımı — Mersin → Sivas' },
  { id: 'TRK-28597', img: 'https://picsum.photos/seed/load4/400/200', title: 'Beyaz Eşya — İstanbul → Bursa' },
  { id: 'TRK-28598', img: 'https://picsum.photos/seed/load5/400/200', title: 'Elektronik — Ankara → Antalya' },
  { id: 'TRK-28599', img: 'https://picsum.photos/seed/load6/400/200', title: 'İnşaat Malz. — İzmir → Muğla' },
  { id: 'TRK-28600', img: 'https://picsum.photos/seed/load7/400/200', title: 'Mobilya — Kayseri → İstanbul' },
  { id: 'TRK-28601', img: 'https://picsum.photos/seed/load8/400/200', title: 'Kimyasal Madde — Adana → Gaziantep' },
];

export default function PortalPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeCategory, setActiveCategory] = useState('');
  const [dynamicTitle, setDynamicTitle] = useState('🏠 Ana Panel');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState('');

  // Tema yükleme
  useEffect(() => {
    const saved = localStorage.getItem('portal_theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  // Tema değişimi
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal_theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Toast göster
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Menü tıklama
  const handleMenuClick = (label: string) => {
    console.log(`[Menu] ${label}`);
    setDynamicTitle(`📌 ${label}`);
    if (label === 'Modüller') router.push('/admin');
    else if (label === 'Giriş Yap') router.push('/login');
    else showToast(`${label} sayfası hazırlanıyor...`);
  };

  // Kategori tıklama — auth kontrolü, yoksa login sayfasına yönlendir
  const handleCategoryClick = async (cat: any) => {
    console.log(`[Category] ${cat.label}`);
    setActiveCategory(cat.id);
    setDynamicTitle(`${cat.icon} ${cat.label}`);
    if (cat.href) {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        // Kullanici giris yapmamissa login sayfasina yonlendir
        showToast('Bu bölüme erişmek için giriş yapmalısınız.');
        router.push('/login');
        return;
      }
      router.push(cat.href);
    }
  };

  // Dropdown
  const handleFaqChange = (e: any) => {
    const opt = FAQ_OPTIONS.find(o => o.value === e.target.value);
    console.log(`[FAQ] ${opt?.label}`);
    showToast(`📌 "${opt?.label}" seçildi — ilgili sorular getiriliyor...`);
  };

  // Arama
  const handleSearch = (e: any) => {
    console.log(`[Search] ${e.target.value}`);
  };

  // Filtre
  const handleFilter = (e: any) => {
    console.log(`[Filter] ${e.target.value}`);
    showToast(`🔍 Filtre uygulandı: ${e.target.options[e.target.selectedIndex].text}`);
  };

  // Sayfalama
  const handlePage = (page: number) => {
    console.log(`[Page] ${page}`);
    setCurrentPage(page);
  };

  // Kart butonu
  const handleCardAction = (cardId: string, action: string) => {
    alert(`🚛 ${cardId} — "${action}" işlemi başlatılıyor.`);
    console.log(`[Card] ${cardId} → ${action}`);
  };

  // Giriş yap
  const handleLogin = () => router.push('/login');

  // Her sayfada 8 kart
  const totalPages = Math.ceil(DEMO_CARDS.length / 8);
  const startIdx = (currentPage - 1) * 8;
  const visibleCards = DEMO_CARDS.slice(startIdx, startIdx + 8);

  return (
    <div className={`app-container ${theme === 'light' ? 'light' : ''}`}>
      {/* ═══ ÜST FRAME ═══ */}
      <header className="top-frame">
        <div className="logo-area" onClick={() => { setDynamicTitle('🏠 Ana Panel'); setActiveCategory(''); }}>
          <img src="/logo.png" alt="KAPTAN" className="logo-img" />
          <div className="logo-text">
            <h1>KAPTAN LOJİSTİK</h1>
            <span>Akıllı Portal</span>
          </div>
        </div>

        <nav>
          <ul className="nav-menu">
            {['Biz Kimiz', 'Sitemiz', 'Modüller', 'Hizmetler', 'İletişim', 'Blog'].map(item => (
              <li key={item} onClick={() => handleMenuClick(item)}>{item}</li>
            ))}
            <li onClick={handleLogin} style={{ color: 'var(--primary)', fontWeight: 700 }}>Giriş Yap</li>
          </ul>
        </nav>

        <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Tema değiştir">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* ═══ ARA FRAME ═══ */}
      <div className="mid-frame">
        <div className="faq-section">
          <span className="faq-title">📌 Sık Sorulan Sorular</span>
          <select className="faq-dropdown" onChange={handleFaqChange} defaultValue="">
            <option value="" disabled>Sık Kullanılanlar</option>
            {FAQ_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Yük, plaka, şehir veya firma ara..." onChange={handleSearch} />
        </div>
      </div>

      {/* ═══ ANA İÇERİK ═══ */}
      <div className="main-content">
        {/* Sol Kategori Sidebar */}
        <aside className="categories-sidebar">
          {CATEGORIES.map(section => (
            <div key={section.section}>
              <h3>{section.section}</h3>
              {section.items.map(cat => (
                <div
                  key={cat.id}
                  className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* Sağ İçerik Alanı */}
        <div className="right-area">
          {/* Kontrol Bar */}
          <div className="control-bar">
            <span className="dynamic-title">{dynamicTitle}</span>
            <div className="control-right">
              <select className="filter-dropdown" onChange={handleFilter} defaultValue="all">
                {FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="page-info">{startIdx + 1} - {Math.min(startIdx + 8, DEMO_CARDS.length)} of {DEMO_CARDS.length} sipariş</span>
              <button className="page-btn" onClick={() => handlePage(1)} disabled={currentPage === 1}>«</button>
              <button className="page-btn" onClick={() => handlePage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${currentPage === p ? 'active-page' : ''}`} onClick={() => handlePage(p)}>{p}</button>
              ))}
              <button className="page-btn" onClick={() => handlePage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>›</button>
              <button className="page-btn" onClick={() => handlePage(totalPages)} disabled={currentPage === totalPages}>»</button>
            </div>
          </div>

          {/* Kart Grid */}
          <div className="templates-grid">
            {visibleCards.map(card => (
              <div key={card.id} className="template-card" data-id={card.id}>
                <img src={card.img} alt={card.title} loading="lazy" />
                <div className="card-body">
                  <span className="card-id-tag">🚛 Yük No: {card.id}</span>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>{card.title}</p>
                  <div className="card-actions">
                    <button className="card-btn primary-btn" onClick={() => handleCardAction(card.id, 'Hemen Al')}>Hemen Al</button>
                    <button className="card-btn secondary-btn" onClick={() => handleCardAction(card.id, 'Detaylar')}>Detaylar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="app-footer">
        KAPTAN Lojistik Platformu © 2026 — Türkiye'nin Dijital Karayolu Yük Taşımacılığı Platformu
      </footer>

      {/* ═══ TOAST ═══ */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
