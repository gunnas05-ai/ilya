'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, Percent, FileText, Settings, Shield, Banknote, UserPlus, Palette, Wrench, Package, Gavel, MapPin, Truck, Utensils, Fuel, ShoppingCart, Bell, Radio, Warehouse, Ship, Plug, QrCode, TrendingUp, RotateCcw, Send, FileBadge, Camera, ClipboardCheck, Globe, MessageSquare, Wallet, Activity, UserCheck, Brain, BarChart3, Trophy, ClipboardList, Menu, X,
} from 'lucide-react';
const navSections = [
  {
    label: 'Ana',
    items: [
      { href: '/admin', label: 'Panel', icon: LayoutDashboard },
      { href: '/matching', label: 'AI Eşleştirme', icon: Brain },
      { href: '/analytics', label: 'Analitik', icon: TrendingUp },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { href: '/loads', label: 'Yük Yönetimi', icon: Package },
      { href: '/bids', label: 'Teklifler', icon: Gavel },
      { href: '/tracking', label: 'Canlı Takip', icon: MapPin },
      { href: '/return-loads', label: 'Geri Dönüş Yükleri', icon: RotateCcw },
      { href: '/reloads', label: 'Oto. Backhaul', icon: RotateCcw },
      { href: '/documents', label: 'Evrak Yönetimi', icon: ClipboardList },
      { href: '/pod', label: 'ePOD Kanıtları', icon: Camera },
      { href: '/carrier-quality', label: 'Kalite Skoru', icon: Trophy },
      { href: '/carrier-profiles', label: 'Taşıyıcı Profiller', icon: UserCheck },
    ],
  },
  {
    label: 'Finans & Ödeme',
    items: [
      { href: '/finance', label: 'Gelir/Gider', icon: Banknote },
      { href: '/rates', label: 'Fiyat İstihbaratı', icon: BarChart3 },
      { href: '/wallet', label: 'Cüzdan', icon: Wallet },
      { href: '/odeme', label: 'Ödemeler', icon: CreditCard },
      { href: '/payment/cards', label: 'Kayıtlı Kartlar', icon: CreditCard },
      { href: '/escrow', label: 'Escrow & Cüzdan', icon: Shield },
      { href: '/gib', label: 'GİB e-Belge', icon: FileText },
      { href: '/billing', label: 'Abonelik', icon: CreditCard },
      { href: '/revenue', label: 'Gelir Yönetimi', icon: TrendingUp },
    ],
  },
  {
    label: 'Tesisler',
    items: [
      { href: '/fuel-stations', label: 'Akaryakıt', icon: Fuel },
      { href: '/restaurants', label: 'Lokantalar', icon: Utensils },
      { href: '/warehouse', label: 'Depolar', icon: Warehouse },
    ],
  },
  {
    label: 'Pazaryeri',
    items: [
      { href: '/marketplace', label: 'Araç Pazarı', icon: ShoppingCart },
      { href: '/part-market', label: 'Yedek Parça', icon: Wrench },
      { href: '/vehicles', label: 'Araç Filosu', icon: Truck },
    ],
  },
  {
    label: 'Entegrasyon',
    items: [
      { href: '/integrations', label: 'API & Webhook', icon: Plug },
      { href: '/carrier-api', label: 'Taşıyıcı API', icon: Truck },
      { href: '/shipper-api', label: 'Gönderici API', icon: Send },
      { href: '/rate-api', label: 'Fiyat API', icon: TrendingUp },
      { href: '/erp', label: 'ERP Entegrasyon', icon: Globe },
      { href: '/customs', label: 'Gümrük', icon: Ship },
      { href: '/uetds', label: 'U-ETDS', icon: FileBadge },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/users', label: 'Kullanıcılar', icon: Users },
      { href: '/admins', label: 'Adminler', icon: UserPlus },
      { href: '/whatsapp', label: 'WhatsApp', icon: Send },
      { href: '/chat', label: 'Sohbetler', icon: MessageSquare },
      { href: '/announcements', label: 'Duyurular', icon: Bell },
      { href: '/notifications', label: 'Bildirimler', icon: Radio },
      { href: '/qr', label: 'QR Kodlar', icon: QrCode },
      { href: '/audit', label: 'Denetim', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/monitoring', label: 'Sistem İzleme', icon: Activity },
      { href: '/settings', label: 'Ayarlar', icon: Settings },
      { href: '/white-label', label: 'Beyaz Etiket', icon: Palette },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-kaptan-card border border-kaptan-border text-kaptan-text"
        aria-label="Menü"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={closeMobile} />
      )}

      <aside
        className={`
          w-[280px] flex flex-col h-screen overflow-y-auto custom-scrollbar
          fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%)',
          borderRight: '1px solid var(--glass-border)',
        }}
      >
        <div
          className="p-5 sticky top-0 z-10"
          style={{
            background: 'linear-gradient(180deg, var(--sidebar-bg-start) 0%, var(--sidebar-bg-end) 100%)',
            borderBottom: '1px solid var(--glass-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <Link href="/admin" className="flex items-center gap-3 mb-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0
                            shadow-[0_0_15px_rgba(255,122,0,0.25)]">
              <img
                src="/kaptan-logo.png"
                alt="KAPTAN Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider group-hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)' }}>KAPTAN</h1>
              <div className="h-[2px] w-16 mt-0.5 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--primary), transparent)',
                  boxShadow: '0 0 8px rgba(255,122,0,0.4)',
                }} />
            </div>
          </Link>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--primary)' }}>Lojistik Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <h3 className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {section.label}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-l-[3px] ${
                        isActive
                          ? 'bg-[rgba(255,122,0,0.12)] text-[#FF7A00] shadow-[0_0_12px_rgba(255,122,0,0.12)] border-l-[#FF7A00]'
                          : 'text-slate-400 hover:bg-white/[0.04] hover:text-[var(--text)] border-l-transparent'
                      }`}
                    >
                      <item.icon size={18} className={isActive ? 'text-[#FF7A00]' : ''} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
