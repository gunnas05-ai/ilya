'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, Truck, Clock, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});

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
        setStats({
          totalLoads: loads.length,
          activeLoads: loads.filter((l: any) => l.status === 'active').length,
          totalBids: bids.length,
          acceptedBids: bids.filter((b: any) => b.status === 'accepted').length,
          totalUsers: users.length,
          escrowVolume: 0,
          totalRevenue: bids.reduce((s: number, b: any) => s + Number(b.platformCommission || 0), 0),
          completedLoads: loads.filter((l: any) => l.status === 'completed').length,
        });
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
