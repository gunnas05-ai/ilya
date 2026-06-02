'use client';

import Link from 'next/link';
import { Package, Truck, UserPlus, MapPin, Brain, HelpCircle } from 'lucide-react';

const quickActions = [
  { icon: Package, label: 'Yeni Yük', href: '/loads' },
  { icon: Truck, label: 'Araç Ekle', href: '/vehicles' },
  { icon: UserPlus, label: 'Sürücü Ekle', href: '/users' },
  { icon: MapPin, label: 'Sefer Oluştur', href: '/loads' },
  { icon: Brain, label: 'AI Rapor', href: '/matching' },
  { icon: HelpCircle, label: 'Destek', href: '/settings' },
];

export function QuickActionBar() {
  return (
    <aside
      className="hidden lg:flex w-[56px] flex-col items-center gap-1.5 py-4 shrink-0"
      style={{
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderLeft: '1px solid var(--glass-border)',
      }}
    >
      {quickActions.map(action => (
        <Link
          key={action.label}
          href={action.href}
          title={action.label}
          className="w-11 h-11 flex items-center justify-center rounded-xl
                     text-slate-500 hover:text-white hover:bg-white/[0.06]
                     hover:scale-110 transition-all duration-200
                     group relative"
        >
          <action.icon size={20} />
          {/* Tooltip */}
          <span className="absolute right-full mr-2.5 px-2.5 py-1.5 text-[11px]
                           bg-slate-800 text-[var(--text)] rounded-lg font-medium
                           opacity-0 group-hover:opacity-100 transition-opacity duration-150
                           whitespace-nowrap pointer-events-none shadow-lg"
                style={{ border: '1px solid var(--glass-border)' }}>
            {action.label}
          </span>
        </Link>
      ))}
    </aside>
  );
}
