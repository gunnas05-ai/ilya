'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, Truck, Clock, Activity, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell } from 'recharts';

const COLORS = ['#FF6B00', '#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [loadsRes, bidsRes, usersRes, escrowRes] = await Promise.all([
          api.get('/loads').catch(() => ({ data: { data: [] } })),
          api.get('/bids').catch(() => ({ data: { data: [] } })),
          api.get('/users').catch(() => ({ data: { data: [] } })),
          api.get('/escrow').catch(() => ({ data: { data: {} } })),
        ]);
        const loads = Array.isArray(loadsRes.data?.data?.data || loadsRes.data?.data) ? (loadsRes.data?.data?.data || loadsRes.data?.data) : [];
        const bids = Array.isArray(bidsRes.data?.data?.data || bidsRes.data?.data) ? (bidsRes.data?.data?.data || bidsRes.data?.data) : [];
        const users = Array.isArray(usersRes.data?.data?.data || usersRes.data?.data) ? (usersRes.data?.data?.data || usersRes.data?.data) : [];

        const activeLoads = loads.filter((l: any) => l.status === 'beklemede' || l.status === 'yolda').length;
        const completedLoads = loads.filter((l: any) => l.status === 'teslim_edildi' || l.status === 'completed').length;
        const cancelledBids = bids.filter((b: any) => b.status === 'rejected' || b.status === 'expired').length;
        const acceptedBids = bids.filter((b: any) => b.status === 'accepted').length;
        const pendingBids = bids.filter((b: any) => b.status === 'pending').length;

        setStats({
          totalLoads: loads.length,
          activeLoads,
          totalBids: bids.length,
          acceptedBids,
          totalUsers: users.length,
          totalRevenue: bids.reduce((s: number, b: any) => s + Number(b.platformCommission || 0), 0),
          completedLoads,
        });

        // Bar chart: load/bid/user counts
        setChartData([
          { name: 'Yükler', total: loads.length, active: activeLoads, completed: completedLoads },
          { name: 'Teklifler', total: bids.length, kabul: acceptedBids, bekleyen: pendingBids },
          { name: 'Kullanıcılar', total: users.length },
        ]);

        // Pie chart: load status distribution
        const statusCounts: Record<string, number> = {};
        loads.forEach((l: any) => {
          const s = l.status || 'bilinmiyor';
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        setPieData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-kaptan-text mb-6">Analitik Dashboard</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-28 bg-kaptan-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><Package className="text-kaptan-primary" size={24} /><span className="text-kaptan-muted text-sm">Toplam Yük</span></div>
              <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.totalLoads}</p>
              <p className="text-xs text-kaptan-muted mt-1">{stats.activeLoads} aktif</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><Activity className="text-kaptan-success" size={24} /><span className="text-kaptan-muted text-sm">Tamamlanan</span></div>
              <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.completedLoads}</p>
              <p className="text-xs text-kaptan-muted mt-1">{stats.totalLoads > 0 ? Math.round(stats.completedLoads / stats.totalLoads * 100) : 0}% tamamlanma</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><DollarSign className="text-kaptan-warning" size={24} /><span className="text-kaptan-muted text-sm">Toplam Teklif</span></div>
              <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.totalBids}</p>
              <p className="text-xs text-kaptan-muted mt-1">{stats.acceptedBids} kabul edildi</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><Users className="text-kaptan-primary" size={24} /><span className="text-kaptan-muted text-sm">Kullanıcılar</span></div>
              <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.totalUsers}</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><TrendingUp className="text-kaptan-success" size={24} /><span className="text-kaptan-muted text-sm">Platform Geliri</span></div>
              <p className="text-2xl font-bold text-kaptan-success mt-2">{Number(stats.totalRevenue || 0).toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><Clock className="text-kaptan-warning" size={24} /><span className="text-kaptan-muted text-sm">Bekleyen Teklif</span></div>
              <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.totalBids - stats.acceptedBids}</p>
            </div>
          </div>

          {/* Gerçek grafikler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-3 flex items-center gap-2"><BarChart3 size={18} /> Platform Özeti</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-3 flex items-center gap-2"><PieChart size={18} /> Yük Durumu Dağılımı</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RePie>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                  </RePie>
                </ResponsiveContainer>
              ) : (
                <p className="text-kaptan-muted text-sm text-center py-10">Henüz veri yok</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-3">Operasyonel Metrikler</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-kaptan-muted text-sm">Aktif Yük Oranı</span>
                  <span className="text-kaptan-text font-medium">{stats.totalLoads > 0 ? Math.round(stats.activeLoads / stats.totalLoads * 100) : 0}%</span>
                </div>
                <div className="w-full bg-kaptan-dark rounded-full h-2">
                  <div className="bg-kaptan-primary h-2 rounded-full" style={{ width: `${stats.totalLoads > 0 ? Math.round(stats.activeLoads / stats.totalLoads * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-kaptan-muted text-sm">Teklif Kabul Oranı</span>
                  <span className="text-kaptan-text font-medium">{stats.totalBids > 0 ? Math.round(stats.acceptedBids / stats.totalBids * 100) : 0}%</span>
                </div>
                <div className="w-full bg-kaptan-dark rounded-full h-2">
                  <div className="bg-kaptan-success h-2 rounded-full" style={{ width: `${stats.totalBids > 0 ? Math.round(stats.acceptedBids / stats.totalBids * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-kaptan-muted text-sm">Tamamlama Oranı</span>
                  <span className="text-kaptan-text font-medium">{stats.totalLoads > 0 ? Math.round(stats.completedLoads / stats.totalLoads * 100) : 0}%</span>
                </div>
                <div className="w-full bg-kaptan-dark rounded-full h-2">
                  <div className="bg-kaptan-primary h-2 rounded-full" style={{ width: `${stats.totalLoads > 0 ? Math.round(stats.completedLoads / stats.totalLoads * 100) : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-3">Finansal Özet</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-kaptan-muted text-sm">Platform Komisyonu</span><span className="text-kaptan-success font-medium">{Number(stats.totalRevenue || 0).toLocaleString('tr-TR')} ₺</span></div>
                <div className="flex justify-between"><span className="text-kaptan-muted text-sm">Toplam Teklif Hacmi</span><span className="text-kaptan-text font-medium">- ₺</span></div>
                <div className="flex justify-between"><span className="text-kaptan-muted text-sm">Escrow Hacmi</span><span className="text-kaptan-text font-medium">- ₺</span></div>
                <div className="flex justify-between"><span className="text-kaptan-muted text-sm">Ortalama Teklif</span><span className="text-kaptan-text font-medium">- ₺</span></div>
                <div className="flex justify-between"><span className="text-kaptan-muted text-sm">Toplam Kullanıcı</span><span className="text-kaptan-text font-medium">{stats.totalUsers}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
