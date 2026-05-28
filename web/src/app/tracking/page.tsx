'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, MapPin, Navigation, Clock, Truck } from 'lucide-react';

export default function TrackingPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLoad, setSelectedLoad] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trackRes, posRes] = await Promise.all([
        api.get('/tracking').catch(() => ({ data: { data: [] } })),
        api.get('/tracking/positions').catch(() => ({ data: { data: [] } })),
      ]);
      setRecords(Array.isArray(trackRes.data?.data?.data || trackRes.data?.data) ? (trackRes.data?.data?.data || trackRes.data?.data) : []);
      setPositions(Array.isArray(posRes.data?.data?.data || posRes.data?.data) ? (posRes.data?.data?.data || posRes.data?.data) : []);
    } catch { setRecords([]); setPositions([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = records.filter((r: any) =>
    !search || r.loadTitle?.toLowerCase().includes(search.toLowerCase()) ||
    r.driverName?.toLowerCase().includes(search.toLowerCase()) ||
    r.plateNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Canlı Takip</h2>
        <button onClick={fetchData} className="text-sm text-kaptan-primary hover:underline">Yenile</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 mb-4">
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
              <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
                placeholder="Yük, sürücü veya plaka ara..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="bg-kaptan-dark border border-kaptan-border rounded-lg h-[400px] flex items-center justify-center relative overflow-hidden">
              <div className="text-center text-kaptan-muted">
                <MapPin size={48} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Harita görünümü — aktif araç pozisyonları</p>
                <p className="text-xs mt-1">OpenStreetMap entegrasyonu</p>
              </div>
              {positions.slice(0, 10).map((pos: any, i: number) => (
                <div key={i} className="absolute w-3 h-3 bg-kaptan-primary rounded-full animate-pulse shadow-lg shadow-kaptan-primary/50"
                  style={{ left: `${20 + Math.random() * 60}%`, top: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
              <Truck className="mx-auto mb-1 text-kaptan-primary" size={20} />
              <p className="text-xl font-bold text-kaptan-text">{records.length}</p>
              <p className="text-xs text-kaptan-muted">Aktif Takip</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
              <Navigation className="mx-auto mb-1 text-kaptan-success" size={20} />
              <p className="text-xl font-bold text-kaptan-text">{positions.length}</p>
              <p className="text-xs text-kaptan-muted">Anlık Pozisyon</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
              <Clock className="mx-auto mb-1 text-kaptan-warning" size={20} />
              <p className="text-xl font-bold text-kaptan-text">
                {records.filter((r: any) => r.status === 'delayed').length}
              </p>
              <p className="text-xs text-kaptan-muted">Gecikmeli</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
              <MapPin className="mx-auto mb-1 text-kaptan-primary" size={20} />
              <p className="text-xl font-bold text-kaptan-text">
                {records.filter((r: any) => r.status === 'delivered').length}
              </p>
              <p className="text-xs text-kaptan-muted">Teslim Edildi</p>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
            <h3 className="font-semibold text-kaptan-text mb-3">Aktif Araçlar</h3>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-kaptan-dark rounded-lg animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-kaptan-muted text-sm">Aktif takip kaydı yok</p>
            ) : (
              <div className="space-y-2">
                {filtered.slice(0, 10).map((rec: any) => (
                  <button key={rec.id} onClick={() => setSelectedLoad(rec)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLoad?.id === rec.id ? 'border-kaptan-primary bg-kaptan-primary/5' : 'border-kaptan-border hover:border-kaptan-primary/30'
                    }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-kaptan-text">{rec.loadTitle || 'Yük #' + rec.id?.slice(0, 6)}</p>
                        <p className="text-xs text-kaptan-muted">{rec.plateNumber || '-'} • {rec.driverName || '-'}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        rec.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                        rec.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {rec.status === 'in_transit' ? 'Yolda' : rec.status === 'delivered' ? 'Teslim' : 'Bekliyor'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-kaptan-muted">
                      <MapPin size={10} />
                      <span>{rec.originCity || '?'} → {rec.destCity || '?'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
