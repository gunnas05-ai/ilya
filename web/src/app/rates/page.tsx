'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, DollarSign, MapPin, BarChart3, Activity, Search } from 'lucide-react';

export default function RatesPage() {
  const [routeRates, setRouteRates] = useState<any>(null);
  const [topRoutes, setTopRoutes] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ from: 'İstanbul', to: 'Ankara' });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/rates/top').catch(() => ({ data: { data: [] } })),
      api.get('/rates/trending').catch(() => ({ data: { data: [] } })),
      api.get(`/rates/route?from=İstanbul&to=Ankara`).catch(() => ({ data: null })),
    ]).then(([top, trend, route]) => {
      setTopRoutes(top.data?.data || []);
      setTrending(trend.data?.data || []);
      setRouteRates(route.data || null);
      setLoading(false);
    });
  }, []);

  const handleSearch = async () => {
    if (!search.from || !search.to) return;
    setSearching(true);
    try {
      const res = await api.get(`/rates/route?from=${search.from}&to=${search.to}`);
      setRouteRates(res.data || null);
    } catch {}
    setSearching(false);
  };

  const trendIcon = (t: string) => t === 'up' ? <TrendingUp size={16} className="text-kaptan-success" /> : t === 'down' ? <TrendingDown size={16} className="text-kaptan-danger" /> : <Minus size={16} className="text-kaptan-warning" />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 size={24} className="text-kaptan-primary" />
        <h2 className="text-2xl font-bold text-kaptan-text">Akıllı Fiyatlandırma (Rate Intelligence)</h2>
      </div>

      {/* Rota Arama */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <MapPin size={18} className="text-kaptan-primary" />
          <input className="bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text w-32" placeholder="Nereden" value={search.from} onChange={e => setSearch({...search, from: e.target.value})} />
          <span className="text-kaptan-muted">→</span>
          <input className="bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text w-32" placeholder="Nereye" value={search.to} onChange={e => setSearch({...search, to: e.target.value})} />
          <button onClick={handleSearch} disabled={searching} className="flex items-center gap-1 bg-kaptan-primary text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
            <Search size={14} /> {searching ? '...' : 'Analiz Et'}
          </button>
        </div>

        {routeRates && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-kaptan-dark rounded-lg p-3 text-center">
              <p className="text-xs text-kaptan-muted">7 Günlük Ort.</p>
              <p className="text-xl font-bold text-kaptan-text">{routeRates.avg7d?.toLocaleString('tr-TR') || '-'} ₺</p>
            </div>
            <div className="bg-kaptan-dark rounded-lg p-3 text-center">
              <p className="text-xs text-kaptan-muted">15 Günlük Ort.</p>
              <p className="text-xl font-bold text-kaptan-text">{routeRates.avg15d?.toLocaleString('tr-TR') || '-'} ₺</p>
            </div>
            <div className="bg-kaptan-dark rounded-lg p-3 text-center">
              <p className="text-xs text-kaptan-muted">30 Günlük Ort.</p>
              <p className="text-xl font-bold text-kaptan-text">{routeRates.avg30d?.toLocaleString('tr-TR') || '-'} ₺</p>
            </div>
            <div className="bg-kaptan-dark rounded-lg p-3 text-center">
              <p className="text-xs text-kaptan-muted">Trend</p>
              <p className={`text-xl font-bold flex items-center justify-center gap-1 ${routeRates.trend === 'up' ? 'text-kaptan-success' : routeRates.trend === 'down' ? 'text-kaptan-danger' : 'text-kaptan-warning'}`}>
                {trendIcon(routeRates.trend)} %{routeRates.trendPct || 0}
              </p>
            </div>
            {routeRates.recommendedRange && (
              <div className="col-span-2 md:col-span-4 bg-kaptan-primary/10 border border-kaptan-primary/30 rounded-lg p-3 text-center">
                <p className="text-xs text-kaptan-muted mb-1">💡 Önerilen Fiyat Aralığı</p>
                <p className="text-lg font-bold text-kaptan-primary">
                  {routeRates.recommendedRange.min?.toLocaleString('tr-TR')} ₺ — {routeRates.recommendedRange.max?.toLocaleString('tr-TR')} ₺
                  <span className="text-sm text-kaptan-muted ml-2">(Önerilen: {routeRates.recommendedRange.suggested?.toLocaleString('tr-TR')} ₺)</span>
                </p>
                <p className="text-xs text-kaptan-muted mt-1">
                  Arz/Talep: {routeRates.supplyDemandRatio} | Örneklem: {routeRates.sampleCount} işlem
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Aktif Rotalar */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2"><Activity size={18} className="text-kaptan-primary" /> En Aktif Rotalar (30 gün)</h3>
          {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-kaptan-dark rounded-lg animate-pulse" />)}</div> : (
            <div className="space-y-2">
              {topRoutes.map((r, i) => (
                <button key={i} onClick={() => { setSearch({ from: r.fromCity, to: r.toCity }); handleSearch(); }}
                  className="w-full flex justify-between p-3 bg-kaptan-dark rounded-lg hover:bg-kaptan-primary/10 text-left text-sm transition-colors">
                  <span className="text-kaptan-text">{r.fromCity} → {r.toCity}</span>
                  <span className="text-kaptan-primary font-bold">{r.avgPrice?.toLocaleString('tr-TR')} ₺ <span className="text-kaptan-muted text-xs ml-2">({r.count}x)</span></span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trend Rotalar */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-kaptan-primary" /> Fiyatı En Çok Değişen Rotalar</h3>
          {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-kaptan-dark rounded-lg animate-pulse" />)}</div> : (
            <div className="space-y-2">
              {trending.map((r, i) => (
                <div key={i} className="flex justify-between p-3 bg-kaptan-dark rounded-lg text-sm">
                  <span className="text-kaptan-text">{r.fromCity} → {r.toCity}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-kaptan-text font-bold">{r.recentAvg?.toLocaleString('tr-TR')} ₺</span>
                    <span className={`flex items-center gap-1 text-xs font-bold ${r.change > 0 ? 'text-kaptan-success' : r.change < 0 ? 'text-kaptan-danger' : 'text-kaptan-muted'}`}>
                      {r.change > 0 ? <TrendingUp size={12} /> : r.change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {r.change > 0 ? '+' : ''}{r.change}%
                    </span>
                  </div>
                </div>
              ))}
              {trending.length === 0 && <p className="text-center text-kaptan-muted py-4">Henüz yeterli veri yok</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
