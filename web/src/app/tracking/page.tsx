'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Search, MapPin, Navigation, Clock, Truck } from 'lucide-react';

// Leaflet only loads in browser
function LiveMap({ positions }: { positions: any[] }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(mod => {
      if (cancelled) return;
      setL(mod.default || mod);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    // Fix Leaflet default icon paths in bundler
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });
    // Initialize map centered on Turkey
    const map = L.map(containerRef.current).setView([39.0, 35.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [L]);

  useEffect(() => {
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Add position markers
    const validPositions = positions.filter((p: any) => p.latitude && p.longitude);
    if (validPositions.length === 0) return;

    validPositions.forEach((pos: any) => {
      const marker = L.marker([pos.latitude, pos.longitude])
        .addTo(map)
        .bindPopup(`<b>${pos.plateNumber || 'Araç'}</b><br/>${pos.driverName || ''}<br/>Hız: ${pos.speed || 0} km/s`);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    const group = L.featureGroup(markersRef.current);
    if (markersRef.current.length > 0) {
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [positions, L]);

  return (
    <div
      ref={containerRef}
      className="bg-kaptan-dark border border-kaptan-border rounded-lg h-[400px]"
      style={{ zIndex: 1 }}
    >
      {!L && (
        <div className="h-full flex items-center justify-center text-kaptan-muted">
          <MapPin size={48} className="mx-auto mb-2 opacity-30" />
        </div>
      )}
    </div>
  );
}

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
          <div className="glass-card p-4 mb-4">
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
              <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
                placeholder="Yük, sürücü veya plaka ara..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <LiveMap positions={positions} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-3 text-center">
              <Truck className="mx-auto mb-1 text-kaptan-primary" size={20} />
              <p className="text-xl font-bold text-kaptan-text">{records.length}</p>
              <p className="text-xs text-kaptan-muted">Aktif Takip</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Navigation className="mx-auto mb-1 text-kaptan-success" size={20} />
              <p className="text-xl font-bold text-kaptan-text">{positions.length}</p>
              <p className="text-xs text-kaptan-muted">Anlık Pozisyon</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Clock className="mx-auto mb-1 text-kaptan-warning" size={20} />
              <p className="text-xl font-bold text-kaptan-text">
                {records.filter((r: any) => r.status === 'delayed').length}
              </p>
              <p className="text-xs text-kaptan-muted">Gecikmeli</p>
            </div>
            <div className="glass-card p-3 text-center">
              <MapPin className="mx-auto mb-1 text-kaptan-primary" size={20} />
              <p className="text-xl font-bold text-kaptan-text">
                {records.filter((r: any) => r.status === 'delivered').length}
              </p>
              <p className="text-xs text-kaptan-muted">Teslim Edildi</p>
            </div>
          </div>
        </div>

        <div>
          <div className="glass-card p-4">
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
