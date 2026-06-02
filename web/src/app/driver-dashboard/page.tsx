'use client';

import { useEffect, useState, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { api } from '@/lib/api';
import { useUsersQuery } from '@/lib/queries';
import { Truck, Timer, Banknote, TrendingUp, Star, AlertTriangle, Gauge, RotateCcw } from 'lucide-react';

function DriverDashboardContent() {
  const { data: users = [] } = useUsersQuery();
  const drivers = useMemo(() => users.filter(u => u.role === 'sofor' || u.role === 'tasiyici'), [users]);
  const [revenue, setRevenue] = useState<any>(null);
  const [activeLoads, setActiveLoads] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/revenue?days=30').catch(() => ({ data: null })),
      api.get('/tracking').catch(() => ({ data: [] })),
    ]).then(([revRes, trackRes]) => {
      setRevenue(revRes.data?.data || revRes.data);
      setActiveLoads(Array.isArray(trackRes.data?.data || trackRes.data) ? (trackRes.data?.data || trackRes.data).length : 0);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Aktif Sürücü', value: drivers.length, icon: Truck, color: 'text-kaptan-info' },
    { label: 'Aktif Yük', value: activeLoads, icon: Timer, color: 'text-kaptan-success' },
    { label: 'Aylık Ciro', value: `${((revenue?.totalRevenue || 0) / 1000).toFixed(0)}k ₺`, icon: Banknote, color: 'text-kaptan-primary' },
    { label: 'Tamamlanan', value: revenue?.completedLoads || 0, icon: CheckCircle, color: 'text-kaptan-success' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><Truck size={28} className="text-kaptan-primary" /> Sürücü Paneli</h1>

      {loading ? <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-kaptan-card animate-pulse rounded-xl" />)}</div>
      : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => <div key={s.label} className="kaptan-card p-4 text-center"><s.icon size={24} className={`mx-auto mb-2 ${s.color}`} /><p className="text-2xl font-bold text-kaptan-text">{s.value}</p><p className="text-xs text-kaptan-muted">{s.label}</p></div>)}
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4">Sürücüler ({drivers.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {drivers.slice(0, 20).map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
                <div>
                  <p className="text-kaptan-text font-semibold text-sm">{d.fullName}</p>
                  <p className="text-kaptan-muted text-xs">{d.email} {d.phone ? `• ${d.phone}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {d.plateNumber && <span className="px-2 py-0.5 bg-kaptan-primary/20 text-kaptan-primary rounded text-xs">{d.plateNumber}</span>}
                  <span className={`w-2 h-2 rounded-full ${d.isActive ? 'bg-kaptan-success' : 'bg-kaptan-danger'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Gauge size={18} /> AETR Özeti</h3>
            <div className="space-y-3 text-sm">
              <div><p className="text-kaptan-muted">Günlük Limit</p><div className="w-full h-3 bg-kaptan-dark rounded-full mt-1"><div className="h-3 bg-kaptan-primary rounded-full" style={{width:'45%'}} /></div><p className="text-xs text-kaptan-muted mt-1">9 saat / 4.5 saat kullanıldı</p></div>
            </div>
          </div>
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Star size={18} /> Performans</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-success text-xl font-bold">%92</p><p className="text-xs text-kaptan-muted">Zamanında</p></div>
              <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-warning text-xl font-bold">%4</p><p className="text-xs text-kaptan-muted">İptal</p></div>
              <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-text text-xl font-bold">4.6</p><p className="text-xs text-kaptan-muted">Puan</p></div>
              <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-info text-xl font-bold">15dk</p><p className="text-xs text-kaptan-muted">Ort. Yanıt</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverDashboardPage() {
  const [queryClient] = useState(() => getQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <DriverDashboardContent />
    </QueryClientProvider>
  );
}

function CheckCircle(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
