'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, Percent, FileText, Settings, LogOut, Shield, Banknote, UserPlus, Palette, Wrench, Package, Gavel, MapPin, Truck, Utensils, Fuel, ShoppingCart, Bell, Radio, Warehouse, Ship, Plug, QrCode, TrendingUp, RotateCcw, Send, FileBadge, Camera, ClipboardCheck, Globe, Sun, Moon, MessageSquare, Wallet, Activity, UserCheck, Brain, BarChart3, Trophy, ClipboardList,
} from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

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
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-64 bg-kaptan-card border-r border-kaptan-border flex flex-col h-screen overflow-y-auto">
      <div className="p-4 border-b border-kaptan-border sticky top-0 bg-kaptan-card z-10">
        <h1 className="text-xl font-bold text-kaptan-primary tracking-wider">KAPTAN</h1>
        {(() => {
          try {
            const raw = localStorage.getItem('admin_user');
            if (raw) {
              const user = JSON.parse(raw);
              return (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-kaptan-text font-medium truncate">{user.fullName || user.email}</p>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-kaptan-primary/20 text-kaptan-primary">
                    {user.role === 'super_admin' ? 'Süper Admin' : user.role === 'admin' ? 'Admin' : user.role || 'Kullanıcı'}
                  </span>
                </div>
              );
            }
          } catch {}
          return <p className="text-xs text-kaptan-muted mt-1">Admin Paneli</p>;
        })()}
      </div>
      <nav className="flex-1 p-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <h3 className="px-3 text-xs font-semibold text-kaptan-muted uppercase tracking-wider mb-1">{section.label}</h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-kaptan-primary/15 text-kaptan-primary'
                        : 'text-kaptan-muted hover:bg-kaptan-border/30 hover:text-kaptan-text'
                    }`}
                  >
                    <item.icon size={16} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-kaptan-border sticky bottom-0 bg-kaptan-card space-y-1">
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text text-sm w-full px-3 py-2 transition-colors rounded-lg"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
        </button>
        <button
          onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_refresh'); localStorage.removeItem('admin_user'); window.location.href = '/login'; }}
          className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-danger text-sm w-full px-3 py-2 transition-colors rounded-lg"
        >
          <LogOut size={16} /> Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
