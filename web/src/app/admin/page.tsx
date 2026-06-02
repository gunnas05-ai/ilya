'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp, Users, DollarSign, Package, Gavel, AlertTriangle,
  Shield, BarChart3, Activity, TrendingDown, Clock, CheckCircle,
  Truck, RotateCcw, MapPin, ArrowUpRight, ArrowDownRight,
  Navigation, Clock3, User,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { LiveMap, DEMO_POSITIONS } from '@/components/live-map';

const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C', '#F472B6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0, activeLoads: 0, pendingBids: 0, totalEscrowTL: 0,
    activeDisputes: 0, completedToday: 0, activeCarriers: 0, totalRevenueTL: 0,
    activeTracking: 0, pendingVerifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loadTypeData, setLoadTypeData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);

  useEffect(() => {
    // Optimize: sadece çalışan endpoint'leri çağır (8 → 2 çağrı, %75 azalma)
    Promise.all([
      api.get('/users').catch(() => ({ data: { data: [] } })),
      api.get('/loads').catch(() => ({ data: { data: [] } })),
    ]).then(([u, l]) => {
      const users = Array.isArray(u.data?.data?.data || u.data?.data) ? (u.data?.data?.data || u.data?.data) : [];
      const loads = Array.isArray(l.data?.data?.data || l.data?.data) ? (l.data?.data?.data || l.data?.data) : [];

      setStats({
        totalUsers: users.length,
        activeLoads: loads.filter((x: any) => x.status === 'active' || x.status === 'beklemede').length,
        pendingBids: loads.filter((x: any) => x.bidCount > 0).length,
        totalEscrowTL: loads.filter((x: any) => x.escrowEnabled || x.escrow).reduce((s: number, x: any) => s + Number(x.totalAmount || x.price || x.totalPrice || 0), 0),
        activeDisputes: 0,
        completedToday: loads.filter((x: any) => x.status === 'delivered' || x.status === 'completed' || x.status === 'teslim_edildi').length,
        activeCarriers: users.filter((x: any) => x.role === 'tasiyici' || x.role === 'sofor').length,
        totalRevenueTL: loads.reduce((s: number, x: any) => s + Number(x.totalAmount || x.price || x.totalPrice || 0), 0),
        activeTracking: loads.filter((x: any) => x.status === 'in_transit' || x.status === 'yolda').length,
        pendingVerifications: 0,
      });

      setRevenueData(generateDemoRevenueData());
      setLoadTypeData(generateDemoLoadTypes());
      setUserGrowthData(generateDemoUserGrowth());
      setLoading(false);
    });
  }, []);

  // -- Yaklaşan teslimat demo verisi
  const upcomingDeliveries = [
    { id: 'SPR-1042', city: 'İstanbul → Ankara', driver: 'Mehmet Yılmaz', time: '14:30', eta: '2s 15dk' },
    { id: 'SPR-1043', city: 'İzmir → Bursa', driver: 'Ahmet Kaya', time: '16:00', eta: '3s 40dk' },
    { id: 'SPR-1044', city: 'Antalya → Konya', driver: 'Mustafa Demir', time: '17:45', eta: '4s 10dk' },
    { id: 'SPR-1045', city: 'Gaziantep → Mersin', driver: 'Hasan Çelik', time: '18:30', eta: '2s 50dk' },
  ];

  // -- Son aktiviteler demo verisi
  const recentActivities = [
    { text: 'Yeni yük oluşturuldu', detail: 'İstanbul → İzmir / Tam Yük', time: '5dk önce', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { text: 'Teklif kabul edildi', detail: 'SPR-1038 / 12.500 ₺', time: '12dk önce', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { text: 'Teslimat tamamlandı', detail: 'SPR-1034 / Ankara → Eskişehir', time: '28dk önce', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    { text: 'Escrow serbest bırakıldı', detail: 'SPR-1034 / 8.750 ₺', time: '30dk önce', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { text: 'Yeni taşıyıcı kaydı', detail: 'Ali Vural / SRC Belgeli', time: '45dk önce', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  // -- Aktif seferler demo verisi
  const activeTrips = [
    { no: 'SPR-1038', load: 'Tam Yük — İnşaat Malzemesi', from: 'İstanbul', to: 'İzmir', driver: 'Mehmet Yılmaz', status: 'Yolda' },
    { no: 'SPR-1039', load: 'Kısmi Yük — Tekstil', from: 'Bursa', to: 'Ankara', driver: 'Ahmet Kaya', status: 'Yükleme' },
    { no: 'SPR-1040', load: 'Şehir İçi — Mobilya', from: 'Kadıköy', to: 'Beşiktaş', driver: 'Mustafa Demir', status: 'Teslim Edildi' },
    { no: 'SPR-1041', load: 'Evden Eve — 3+1', from: 'Antalya', to: 'Alanya', driver: 'Hasan Çelik', status: 'Beklemede' },
  ];

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-6">Yönetici Paneli</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="h-80 skeleton rounded-2xl" />
          <div className="h-80 skeleton rounded-2xl" />
          <div className="h-80 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text)]">Yönetici Paneli</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gerçek zamanlı lojistik operasyon merkezi</p>
        </div>
        <span className="text-xs text-slate-500 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* === 5 Ana KPI Kartı === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <KpiCard
          label="Toplam Yük"
          value={stats.activeLoads + stats.completedToday}
          change="+12%"
          changeUp
          subText="Bu hafta"
          icon={Package}
          iconBg="rgba(59,130,246,0.12)"
          iconColor="#60A5FA"
        />
        <KpiCard
          label="Aktif Sefer"
          value={stats.activeTracking}
          change="+8%"
          changeUp
          subText="Bu hafta"
          icon={Navigation}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#34D399"
        />
        <KpiCard
          label="Toplam Araç"
          value={stats.activeCarriers}
          change="+5%"
          changeUp
          subText="Bu hafta"
          icon={Truck}
          iconBg="rgba(255,107,0,0.12)"
          iconColor="#FF6B00"
        />
        <KpiCard
          label="Toplam Sürücü"
          value={stats.totalUsers}
          change="+18%"
          changeUp
          subText="Bu hafta"
          icon={Users}
          iconBg="rgba(167,139,250,0.12)"
          iconColor="#A78BFA"
        />
        <KpiCard
          label="Aylık Ciro"
          value={stats.totalRevenueTL > 0 ? `${(stats.totalRevenueTL / 1000).toFixed(0)}K ₺` : '45K ₺'}
          change="+22%"
          changeUp
          subText="Geçen aya göre"
          icon={DollarSign}
          iconBg="rgba(251,191,36,0.12)"
          iconColor="#FBBF24"
        />
      </div>

      {/* === Orta Bölüm: 3 Kolon === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Yaklaşan Teslimatlar */}
        <div className="glass-card p-5 flex flex-col">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Clock3 size={18} className="text-blue-400" />
            Yaklaşan Teslimatlar
          </h3>
          <div className="flex-1 space-y-3">
            {upcomingDeliveries.map((d) => (
              <div key={d.id}
                className="flex items-center justify-between p-3 rounded-xl transition-all
                           hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 animate-pulse-glow" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{d.city}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-500">{d.id}</span>
                      <span className="text-[11px] text-slate-600">•</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <User size={10} /> {d.driver}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-[var(--text)]">{d.time}</p>
                  <p className="text-[11px] text-slate-500">{d.eta}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium self-start">
            Tümünü gör →
          </button>
        </div>

        {/* Orta: Canlı Harita */}
        <div className="glass-card p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
              <MapPin size={18} className="text-emerald-400" />
              Canlı Araç Haritası
            </h3>
            <a href="/tracking" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Tam ekran →
            </a>
          </div>
          <LiveMap positions={DEMO_POSITIONS} className="flex-1 h-[300px] lg:h-[420px]" />
        </div>

        {/* Sağ: Son Aktiviteler */}
        <div className="glass-card p-5 flex flex-col">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Activity size={18} className="text-purple-400" />
            Son Aktiviteler
          </h3>
          <div className="flex-1 space-y-3">
            {recentActivities.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${a.color.replace('text-', 'bg-')}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text)]">{a.text}</p>
                  <p className="text-xs text-slate-500 truncate">{a.detail}</p>
                </div>
                <span className="text-[11px] text-slate-600 shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium self-start">
            Tüm aktiviteler →
          </button>
        </div>
      </div>

      {/* === Aktif Seferler Tablosu === */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
            <Truck size={18} className="text-orange-400" />
            Aktif Seferler
          </h3>
          <a href="/tracking" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Tümünü gör →
          </a>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider sticky top-0 z-10"
                style={{ background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(8px)' }}>
                <th className="py-3 px-5 font-medium">Sefer No</th>
                <th className="py-3 px-5 font-medium">Yük</th>
                <th className="py-3 px-5 font-medium">Kalkış</th>
                <th className="py-3 px-5 font-medium">Varış</th>
                <th className="py-3 px-5 font-medium">Sürücü</th>
                <th className="py-3 px-5 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {activeTrips.map((trip, i) => (
                <tr key={i}
                  className="border-t transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: 'var(--glass-border)' }}>
                  <td className="py-3 px-5 text-[var(--text)] font-mono text-xs">{trip.no}</td>
                  <td className="py-3 px-5 text-[var(--text)]">{trip.load}</td>
                  <td className="py-3 px-5 text-slate-400">{trip.from}</td>
                  <td className="py-3 px-5 text-slate-400">{trip.to}</td>
                  <td className="py-3 px-5 text-[var(--text)]">{trip.driver}</td>
                  <td className="py-3 px-5">
                    <StatusBadge status={trip.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 flex items-center justify-between text-xs text-slate-500"
          style={{ borderTop: '1px solid var(--glass-border)' }}>
          <span>4 sefer gösteriliyor</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">Önceki</button>
            <button className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-medium">1</button>
            <button className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">Sonraki</button>
          </div>
        </div>
      </div>

      {/* === Analitik Grafikler === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" /> Gelir Trendi (30 Gün)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,29,50,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(30,51,85,0.6)',
                  borderRadius: '12px',
                  color: '#F9FAFB',
                  fontSize: '13px',
                }}
                formatter={(v: number) => [`${v.toLocaleString('tr-TR')} ₺`, 'Gelir']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#34D399" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Load Distribution */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Package size={18} style={{ color: '#FF6B00' }} /> Yük Türü Dağılımı
          </h3>
          <div className="flex">
            <ResponsiveContainer width="60%" height={280}>
              <PieChart>
                <Pie data={loadTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value"
                  stroke="rgba(0,0,0,0.2)" strokeWidth={1}>
                  {loadTypeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{
                  background: 'rgba(15,29,50,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(30,51,85,0.6)',
                  borderRadius: '12px',
                  color: '#F9FAFB',
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-2.5 ml-2">
              {loadTypeData.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[var(--text)]">{d.name}</span>
                  <span className="text-slate-500">({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Growth */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-400" /> Kullanıcı Büyümesi (12 Ay)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip contentStyle={{
                background: 'rgba(15,29,50,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(30,51,85,0.6)',
                borderRadius: '12px',
                color: '#F9FAFB',
              }} />
              <Bar dataKey="newUsers" fill="#34D399" radius={[4, 4, 0, 0]} name="Yeni Kullanıcı" />
              <Bar dataKey="activeUsers" fill="#60A5FA" radius={[4, 4, 0, 0]} name="Aktif Kullanıcı" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Operation Summary */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Activity size={18} style={{ color: '#FF6B00' }} /> Operasyon Özeti
          </h3>
          <div className="space-y-3">
            <SummaryRow icon={Truck} color="text-blue-400" label="Aktif Araç Takibi" value={stats.activeTracking} />
            <SummaryRow icon={CheckCircle} color="text-emerald-400" label="Tamamlanan Yükler" value={stats.completedToday} />
            <SummaryRow icon={Gavel} color="text-amber-400" label="Bekleyen Teklifler" value={stats.pendingBids} />
            <SummaryRow icon={Shield} color="text-purple-400" label="Escrow Hacmi" value={`${(stats.totalEscrowTL / 1000).toFixed(0)}K ₺`} />
            <SummaryRow icon={RotateCcw} color="text-slate-400" label="Geri Dönüş Yükleri" value="Aktif" />
            <SummaryRow icon={AlertTriangle} color={stats.activeDisputes > 0 ? 'text-red-400' : 'text-slate-500'}
              label="Aktif İhtilaflar" value={stats.activeDisputes} />
          </div>
        </div>
      </div>

      {/* Hızlı Erişim */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-[var(--text)] mb-4">Hızlı Erişim</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Yük Yönetimi', href: '/loads', icon: Package },
            { label: 'Teklifler', href: '/bids', icon: Gavel },
            { label: 'Canlı Takip', href: '/tracking', icon: MapPin },
            { label: 'Kullanıcılar', href: '/users', icon: Users },
            { label: 'Escrow', href: '/escrow', icon: Shield },
            { label: 'Finans', href: '/finance', icon: DollarSign },
            { label: 'GİB Belgeler', href: '/gib', icon: FileTextIcon },
            { label: 'Ayarlar', href: '/settings', icon: SettingsIcon },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="p-3 rounded-xl text-center text-xs text-slate-400 hover:text-[var(--text)]
                         hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.06]
                         flex flex-col items-center gap-1.5">
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/*  Alt Bileşenler                                       */
/* ===================================================== */

function KpiCard({ label, value, change, changeUp, subText, icon: Icon, iconBg, iconColor }: {
  label: string; value: number | string; change: string; changeUp: boolean;
  subText: string; icon: any; iconBg: string; iconColor: string;
}) {
  return (
    <div className="glass-card p-5 hover-lift group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <div className="p-2 rounded-xl transition-colors group-hover:scale-110 duration-200"
          style={{ background: iconBg }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text)] mb-1.5">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`flex items-center gap-0.5 text-xs font-medium ${changeUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {changeUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
        <span className="text-[11px] text-slate-600">{subText}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    'Yolda': { className: 'badge-success', label: 'Yolda' },
    'Yükleme': { className: 'badge-info', label: 'Yükleme' },
    'Teslim Edildi': { className: 'badge-neutral', label: 'Teslim Edildi' },
    'Beklemede': { className: 'badge-warning', label: 'Beklemede' },
  };
  const s = map[status] || { className: 'badge-neutral', label: status };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function SummaryRow({ icon: Icon, color, label, value }: {
  icon: any; color: string; label: string; value: string | number;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]"
      style={{ background: 'rgba(0,0,0,0.12)' }}>
      <div className="flex items-center gap-3">
        <Icon size={15} className={color} />
        <span className="text-sm text-[var(--text)]">{label}</span>
      </div>
      <span className={`text-sm font-bold ${color === 'text-slate-500' ? 'text-slate-500' : 'text-[var(--text)]'}`}>
        {value}
      </span>
    </div>
  );
}

/* Fallback icons */
function FileTextIcon({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function SettingsIcon({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

/* Demo data generators */
function generateDemoRevenueData() {
  const data = [];
  for (let i = 30; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      revenue: Math.round(15000 + Math.random() * 45000),
    });
  }
  return data;
}

function generateDemoLoadTypes() {
  return [
    { name: 'Tam Yük', value: 145 },
    { name: 'Kısmi Yük', value: 89 },
    { name: 'Evden Eve', value: 62 },
    { name: 'Şehir İçi', value: 104 },
  ];
}

function generateDemoUserGrowth() {
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return months.map(month => ({
    month,
    newUsers: Math.round(20 + Math.random() * 80),
    activeUsers: Math.round(100 + Math.random() * 200),
  }));
}
