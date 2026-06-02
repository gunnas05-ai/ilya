'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, ChevronDown, LogOut, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

export function TopNavbar() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const user = (() => {
    try { const raw = localStorage.getItem('admin_user'); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  })();

  const doSearch = () => {
    if (!searchQuery.trim()) return;
    if (searchQuery.startsWith('#')) {
      router.push(`/loads?id=${encodeURIComponent(searchQuery.slice(1))}`);
    } else {
      router.push(`/users?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch();
  };

  return (
    <header className="h-[72px] flex items-center justify-between px-6 shrink-0 z-20"
      style={{
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      {/* Sol: Global Arama */}
      <div className="flex-1 max-w-lg">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-slate-500 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Yük #ID veya kullanıcı ara…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)]
                       placeholder:text-slate-500 outline-none transition-all
                       bg-white/[0.04] border border-white/[0.06]
                       shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]
                       focus:bg-white/[0.06] focus:border-[#FF7A00]/30 focus:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
          />
        </div>
      </div>

      {/* Sağ: Aksiyonlar + Profil */}
      <div className="flex items-center gap-1 ml-4">
        <button className="relative p-2.5 rounded-xl text-slate-400 hover:text-white
                           hover:bg-white/[0.06] transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full
                           ring-2 ring-[var(--bg)] animate-pulse" />
        </button>

        <button className="p-2.5 rounded-xl text-slate-400 hover:text-white
                           hover:bg-white/[0.06] transition-all">
          <Settings size={18} />
        </button>

        {/* Profil + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 ml-2 pl-3 pr-2 py-1.5
                       rounded-xl hover:bg-white/[0.06] transition-all">
            <button
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              className="w-8 h-8 rounded-full bg-[#FF7A00]/15 flex items-center justify-center
                         text-[#FF7A00] hover:bg-[#FF7A00]/25 transition-colors shrink-0"
              title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-[var(--text)] leading-tight max-w-[120px] truncate">
                {user?.fullName || 'Admin'}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                {user?.role === 'super_admin' ? 'Süper Admin' :
                 user?.role === 'admin' ? 'Admin' : 'Kullanıcı'}
              </p>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden animate-slide-up shadow-glass"
              style={{
                background: 'rgba(19, 32, 57, 0.98)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
              }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                <p className="text-sm font-medium text-[var(--text)]">{user?.fullName || 'Admin'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email || ''}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); router.push('/settings'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400
                             hover:text-[var(--text)] hover:bg-white/[0.04] transition-colors">
                  <Settings size={15} /> Ayarlar
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_refresh');
                    localStorage.removeItem('admin_user');
                    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400
                             hover:text-red-400 hover:bg-white/[0.04] transition-colors">
                  <LogOut size={15} /> Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
