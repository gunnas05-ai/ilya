'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, RotateCcw, Package, TrendingUp, Clock, CheckCircle, XCircle, MapPin, Truck, DollarSign } from 'lucide-react';

export default function ReloadsPage() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'active' ? '/reloads/active' : '/reloads/history';
      const res = await api.get(endpoint);
      setBundles(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setBundles([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const filtered = bundles.filter(b => !search || b.headhaulTitle?.toLowerCase().includes(search.toLowerCase()) || b.carrierName?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: bundles.length,
    active: bundles.filter(b => b.status === 'suggested').length,
    accepted: bundles.filter(b => b.status === 'accepted' || b.status === 'partial').length,
    totalEarnings: bundles.filter(b => b.status === 'accepted').reduce((s, b) => s + (Number(b.totalEarnings) || 0), 0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RotateCcw size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">Otomatik Backhaul (Reload)</h2>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline"><RotateCcw size={14} /> Yenile</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Paket', value: stats.total, icon: Package, color: 'text-kaptan-primary' },
          { label: 'Aktif Öneriler', value: stats.active, icon: Clock, color: 'text-kaptan-warning' },
          { label: 'Kabul Edilen', value: stats.accepted, icon: CheckCircle, color: 'text-kaptan-success' },
          { label: 'Toplam Kazanç', value: `${(stats.totalEarnings/1000).toFixed(0)}K ₺`, icon: DollarSign, color: 'text-kaptan-success' },
        ].map(s => (
          <div key={s.label} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
            <div className="flex items-center justify-between"><span className="text-sm text-kaptan-muted">{s.label}</span><s.icon size={20} className={s.color} /></div>
            <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ k: 'active', l: 'Aktif Öneriler' }, { k: 'history', l: 'Geçmiş' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.k ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted'}`}>
            {t.l} ({t.k === 'active' ? bundles.filter(b => b.status === 'suggested').length : bundles.length})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Sefer veya taşıyıcı ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Bundles List */}
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-4">
          {filtered.map(b => (
            <div key={b.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-5 hover:border-kaptan-primary/30 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${b.status === 'accepted' ? 'bg-green-500/20 text-green-400' : b.status === 'suggested' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {b.status === 'accepted' ? 'Kabul Edildi' : b.status === 'suggested' ? 'Önerildi' : b.status === 'declined' ? 'Reddedildi' : b.status === 'expired' ? 'Süresi Doldu' : b.status}
                    </span>
                    <span className="text-xs text-kaptan-muted">{b.createdAt ? new Date(b.createdAt).toLocaleString('tr-TR') : '-'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-kaptan-primary">{Number(b.totalEarnings || 0).toLocaleString('tr-TR')} ₺</p>
                  <p className="text-xs text-kaptan-success">{Number(b.emptyKmSaved || 0)} km kurtarıldı</p>
                </div>
              </div>

              {/* Headhaul */}
              <div className="flex items-center gap-2 mb-2 p-2 bg-kaptan-dark rounded-lg">
                <Truck size={14} className="text-kaptan-primary" />
                <span className="text-sm text-kaptan-text font-medium">{b.headhaulTitle}</span>
                <MapPin size={12} className="text-kaptan-muted" />
                <span className="text-xs text-kaptan-muted">{b.headhaulFromCity} → {b.headhaulToCity}</span>
                <span className="text-xs text-kaptan-muted ml-auto">{b.carrierName}</span>
              </div>

              {/* Backhaul Loads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(b.backhaulLoads || []).map((l: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-kaptan-dark/50 rounded-lg border border-kaptan-border/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-kaptan-primary">#{i+1}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-kaptan-text truncate">{l.title}</p>
                        <p className="text-xs text-kaptan-muted">{l.fromCity} → {l.toCity} | {l.distance} km</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-kaptan-text">{Number(l.price).toLocaleString('tr-TR')} ₺</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-kaptan-success">%{l.matchScore}</span>
                        {l.escrowEnabled && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Escrow</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Boş km karşılaştırması */}
              {b.emptyKmPercentage !== undefined && (
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="text-kaptan-danger">❌ Önce: %{b.emptyKmPercentage} boş dönüş</span>
                  <span className="text-kaptan-success">✅ Sonra: %{b.optimizedEmptyKmPercentage} boş dönüş</span>
                  <span className="text-kaptan-primary font-bold ml-auto">{Number(b.emptyKmSaved)} km TASARRUF</span>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-kaptan-muted"><RotateCcw size={40} className="mx-auto mb-2 opacity-20" />Henüz reload paketi bulunmuyor</div>}
        </div>
      )}
    </div>
  );
}
