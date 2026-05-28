'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp, Users, DollarSign, Package, Gavel, AlertTriangle,
  Shield, BarChart3, Activity, TrendingDown, Clock, CheckCircle,
  Truck, RotateCcw, Fuel, Utensils,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const COLORS = ['#2DD4BF', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];

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
    Promise.all([
      api.get('/users').catch(() => ({ data: { data: [] } })),
      api.get('/loads').catch(() => ({ data: { data: [] } })),
      api.get('/bids').catch(() => ({ data: { data: [] } })),
      api.get('/escrow/disputes').catch(() => ({ data: { data: [] } })),
      api.get('/tracking').catch(() => ({ data: { data: [] } })),
      api.get('/carrier-profiles').catch(() => ({ data: { data: [] } })),
      api.get('/analytics/revenue?days=30').catch(() => ({ data: { data: [] } })),
      api.get('/analytics/load-types').catch(() => ({ data: { data: [] } })),
    ]).then(([u, l, b, d, t, c, rev, lt]) => {
      const users = Array.isArray(u.data?.data?.data || u.data?.data) ? (u.data?.data?.data || u.data?.data) : [];
      const loads = Array.isArray(l.data?.data?.data || l.data?.data) ? (l.data?.data?.data || l.data?.data) : [];
      const bids = Array.isArray(b.data?.data?.data || b.data?.data) ? (b.data?.data?.data || b.data?.data) : [];
      const disputes = Array.isArray(d.data?.data?.data || d.data?.data) ? (d.data?.data?.data || d.data?.data) : [];
      const tracking = Array.isArray(t.data?.data?.data || t.data?.data) ? (t.data?.data?.data || t.data?.data) : [];
      const carriers = Array.isArray(c.data?.data?.data || c.data?.data) ? (c.data?.data?.data || c.data?.data) : [];
      const revData = Array.isArray(rev.data?.data?.data || rev.data?.data) ? (rev.data?.data?.data || rev.data?.data) : [];
      const ltData = Array.isArray(lt.data?.data?.data || lt.data?.data) ? (lt.data?.data?.data || lt.data?.data) : [];

      const totalEscrow = loads.filter((x: any) => x.escrowEnabled).reduce((s: number, x: any) => s + Number(x.totalAmount || x.price || 0), 0);
      const totalRevenue = bids.filter((x: any) => x.status === 'accepted').reduce((s: number, x: any) => s + Number(x.platformCommission || 0), 0);

      setStats({
        totalUsers: users.length,
        activeLoads: loads.filter((x: any) => x.status === 'active').length,
        pendingBids: bids.filter((x: any) => x.status === 'pending').length,
        totalEscrowTL: totalEscrow,
        activeDisputes: disputes.filter((x: any) => x.status === 'open' || x.status === 'under_review').length,
        completedToday: loads.filter((x: any) => x.status === 'delivered' || x.status === 'completed').length,
        activeCarriers: carriers.length,
        totalRevenueTL: totalRevenue,
        activeTracking: tracking.filter((x: any) => x.status === 'in_transit').length,
        pendingVerifications: carriers.filter((x: any) => x.profileStatus === 'PENDING_REVIEW').length,
      });

      // Revenue trend (use API data or generate demo)
      setRevenueData(revData.length > 0 ? revData : generateDemoRevenueData());
      setLoadTypeData(ltData.length > 0 ? ltData : generateDemoLoadTypes());
      setUserGrowthData(generateDemoUserGrowth());
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-kaptan-text mb-6">Yönetici Paneli</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-28 bg-kaptan-card rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Toplam Kullanıcı', value: stats.totalUsers.toLocaleString('tr-TR'), icon: Users, color: 'text-kaptan-primary', bg: 'bg-kaptan-primary/10' },
    { label: 'Aktif Yükler', value: stats.activeLoads.toLocaleString('tr-TR'), icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Bekleyen Teklifler', value: stats.pendingBids.toLocaleString('tr-TR'), icon: Gavel, color: 'text-kaptan-warning', bg: 'bg-yellow-500/10' },
    { label: 'Escrow Hacmi', value: `${(stats.totalEscrowTL / 1000).toFixed(0)}K ₺`, icon: Shield, color: 'text-kaptan-success', bg: 'bg-green-500/10' },
    { label: 'Aktif İhtilaflar', value: stats.activeDisputes, icon: AlertTriangle, color: stats.activeDisputes > 0 ? 'text-kaptan-danger' : 'text-kaptan-muted', bg: stats.activeDisputes > 0 ? 'bg-red-500/10' : 'bg-gray-500/10' },
    { label: 'Platform Geliri', value: `${(stats.totalRevenueTL / 1000).toFixed(1)}K ₺`, icon: DollarSign, color: 'text-kaptan-success', bg: 'bg-green-500/10' },
    { label: 'Aktif Takip', value: stats.activeTracking, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Doğrulama Bekleyen', value: stats.pendingVerifications, icon: Clock, color: stats.pendingVerifications > 0 ? 'text-kaptan-warning' : 'text-kaptan-muted', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-kaptan-text">Yönetici Paneli</h2>
        <span className="text-xs text-kaptan-muted">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 hover:border-kaptan-primary/30 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-sm text-kaptan-muted">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 ${card.color === 'text-kaptan-muted' ? 'text-kaptan-text' : card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-kaptan-success" /> Gelir Trendi (30 Gün)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2DD4BF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2DD4BF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: '#141722', border: '1px solid #2A2F3A', borderRadius: '8px', color: '#F9FAFB' }}
                formatter={(v: number) => [`${v.toLocaleString('tr-TR')} ₺`, 'Gelir']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2DD4BF" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Load Distribution */}
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2">
            <Package size={18} className="text-kaptan-primary" /> Yük Türü Dağılımı
          </h3>
          <div className="flex">
            <ResponsiveContainer width="60%" height={280}>
              <PieChart>
                <Pie data={loadTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {loadTypeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#141722', border: '1px solid #2A2F3A', borderRadius: '8px', color: '#F9FAFB' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-2 ml-2">
              {loadTypeData.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-kaptan-text">{d.name}</span>
                  <span className="text-kaptan-muted">({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-400" /> Kullanıcı Büyümesi (12 Ay)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} />
              <Tooltip contentStyle={{ background: '#141722', border: '1px solid #2A2F3A', borderRadius: '8px', color: '#F9FAFB' }} />
              <Bar dataKey="newUsers" fill="#2DD4BF" radius={[4, 4, 0, 0]} name="Yeni Kullanıcı" />
              <Bar dataKey="activeUsers" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Aktif Kullanıcı" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed / Quick Info */}
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2">
            <Activity size={18} className="text-kaptan-primary" /> Operasyon Özeti
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
              <div className="flex items-center gap-3">
                <Truck size={16} className="text-kaptan-primary" />
                <span className="text-sm text-kaptan-text">Aktif Araç Takibi</span>
              </div>
              <span className="text-kaptan-primary font-bold">{stats.activeTracking}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle size={16} className="text-kaptan-success" />
                <span className="text-sm text-kaptan-text">Tamamlanan Yükler</span>
              </div>
              <span className="text-kaptan-success font-bold">{stats.completedToday}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
              <div className="flex items-center gap-3">
                <Gavel size={16} className="text-kaptan-warning" />
                <span className="text-sm text-kaptan-text">Bekleyen Teklifler</span>
              </div>
              <span className="text-kaptan-warning font-bold">{stats.pendingBids}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
              <div className="flex items-center gap-3">
                <RotateCcw size={16} className="text-blue-400" />
                <span className="text-sm text-kaptan-text">Geri Dönüş Yükleri</span>
              </div>
              <span className="text-kaptan-muted">Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
        <h3 className="font-semibold text-kaptan-text mb-4">Hızlı Erişim</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Yük Yönetimi', href: '/loads', icon: Package },
            { label: 'Teklifler', href: '/bids', icon: Gavel },
            { label: 'Canlı Takip', href: '/tracking', icon: MapPinIcon },
            { label: 'Kullanıcılar', href: '/users', icon: Users },
            { label: 'Escrow', href: '/escrow', icon: Shield },
            { label: 'Finans', href: '/finance', icon: DollarSign },
            { label: 'GİB Belgeler', href: '/gib', icon: FileTextIcon },
            { label: 'Ayarlar', href: '/settings', icon: SettingsIcon },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="p-3 bg-kaptan-dark rounded-lg text-center text-xs text-kaptan-muted hover:text-kaptan-primary hover:bg-kaptan-primary/5 transition-colors border border-kaptan-border flex flex-col items-center gap-1.5">
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// Fallback icons to avoid import issues
function MapPinIcon({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function FileTextIcon({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function SettingsIcon({ size, className }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }

// Demo data generators
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
