'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import {
  Search, MapPin, ArrowLeftRight, Filter, Percent, Star, StarIcon,
  List, Map, Navigation, Truck, Clock, Shield, Zap, Gavel,
  Phone, ChevronDown, ChevronUp, Send, Heart, X, AlertTriangle,
  Package, Weight, Ruler, Calendar, DollarSign, CheckCircle, RotateCcw,
} from 'lucide-react';

// Dynamic import for Leaflet map (SSR-safe)
const ReturnLoadMap = dynamic(() => import('./map'), { ssr: false, loading: () => <div className="h-[400px] skeleton rounded-xl flex items-center justify-center text-kaptan-muted">Harita yükleniyor...</div> });

const RADIUS_OPTIONS = [25, 50, 100, 250, 500];
type ViewMode = 'list' | 'map';

const VEHICLE_TYPES = ['Çekici (TIR)', 'Kamyon', 'Kırkayak Kamyon', 'Kapalı Kasa Kamyon', 'Kamyonet', 'Panelvan'];
const LOAD_TYPES = ['Tam Yük', 'Kısmi Yük', 'Evden Eve', 'Şehir İçi'];

export default function ReturnLoadsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [error, setError] = useState<string | null>(null);

  // Delivery point (would come from completed shipment)
  const [deliveryLat, setDeliveryLat] = useState(39.9334);
  const [deliveryLng, setDeliveryLng] = useState(32.8597);
  const [deliveryCity, setDeliveryCity] = useState('Ankara');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locSearch, setLocSearch] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    vehicleType: '', loadType: '', minWeight: '', maxWeight: '',
    escrowOnly: false, urgentOnly: false, sortBy: 'match' as 'match' | 'price' | 'distance',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Bid/Offer system
  const [bidLoad, setBidLoad] = useState<any>(null);
  const [bidForm, setBidForm] = useState({ price: '', note: '', estimatedDays: '3', hasReturn: false, requestEscrow: false });
  const [submittingBid, setSubmittingBid] = useState(false);

  // Reservation
  const [reservingId, setReservingId] = useState<string | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Selected item for detail
  const [selected, setSelected] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/return-loads?radius=${radius}&lat=${deliveryLat}&lng=${deliveryLng}`);
      const data = res.data?.data?.data || res.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError('Veri yüklenirken bir hata oluştu.');
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [radius, deliveryLat, deliveryLng]);

  // Simulate location search
  const handleLocationSearch = async () => {
    if (!locSearch) return;
    try {
      const res = await api.get(`/nominatim/search?q=${encodeURIComponent(locSearch)}&format=json&limit=1`);
      const result = res.data?.[0];
      if (result) {
        setDeliveryLat(parseFloat(result.lat));
        setDeliveryLng(parseFloat(result.lon));
        setDeliveryCity(locSearch);
      }
      setShowLocationInput(false);
    } catch { /* fallback to default */ }
  };

  // Filter logic
  const filtered = useMemo(() => {
    return items.filter((r: any) => {
      if (search && !r.title?.toLowerCase().includes(search.toLowerCase()) &&
          !r.originCity?.toLowerCase().includes(search.toLowerCase()) &&
          !r.destCity?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filters.vehicleType && r.vehicleType !== filters.vehicleType) return false;
      if (filters.loadType && r.loadType !== filters.loadType) return false;
      if (filters.minWeight && parseFloat(r.weight) < parseFloat(filters.minWeight)) return false;
      if (filters.maxWeight && parseFloat(r.weight) > parseFloat(filters.maxWeight)) return false;
      if (filters.escrowOnly && !r.escrowEnabled) return false;
      if (filters.urgentOnly && r.urgency !== 'Yüksek') return false;
      return true;
    }).sort((a: any, b: any) => {
      if (filters.sortBy === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (filters.sortBy === 'distance') return (Number(a.distance) || 0) - (Number(b.distance) || 0);
      return (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0);
    });
  }, [items, search, filters]);

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    escrow: items.filter((r: any) => r.escrowEnabled).length,
    urgent: items.filter((r: any) => r.urgency === 'Yüksek').length,
    avgPrice: items.length ? Math.round(items.reduce((s: number, r: any) => s + Number(r.price || 0), 0) / items.length) : 0,
  }), [items]);

  // Reservation
  const handleReserve = async (loadId: string) => {
    setReservingId(loadId);
    try {
      await api.post(`/return-loads/${loadId}/reserve`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rezervasyon başarısız. Bu yük başka bir taşıyıcıya rezerve edilmiş olabilir.');
    }
    setReservingId(null);
  };

  // Bid submission
  const handleBid = async () => {
    if (!bidLoad) return;
    setSubmittingBid(true);
    try {
      await api.post(`/bids`, {
        loadId: bidLoad.id,
        price: parseFloat(bidForm.price),
        note: bidForm.note,
        estimatedDays: parseInt(bidForm.estimatedDays),
        hasReturn: bidForm.hasReturn,
        requestEscrow: bidForm.requestEscrow,
      });
      setBidLoad(null);
      setBidForm({ price: '', note: '', estimatedDays: '3', hasReturn: false, requestEscrow: false });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Teklif gönderilemedi');
    }
    setSubmittingBid(false);
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Sync to API
    api.post(`/return-loads/${id}/favorite`).catch(() => {});
  };

  // Delivery point coords for map
  const deliveryPoint = { lat: deliveryLat, lng: deliveryLng };

  // Simulate empty state with existing data when API is empty
  // (for demo - when backend hasn't seeded return loads yet)
  const demoItems = items.length === 0 && !loading && !error ? [
    { id: 'demo-1', title: '28 Ton Komur', loadType: 'Tam Yük', originCity: 'Ankara', destCity: 'İstanbul', originDistrict: 'Sincan', destDistrict: 'Tuzla', vehicleType: 'Çekici (TIR)', trailerType: 'Tenteli Dorse', weight: '28000', price: '18500', distance: 450, matchScore: 0.92, escrowEnabled: true, urgency: 'Normal', loadingDate: '2026-05-28', bidCount: 3, companyName: 'ABC Lojistik', contactPhone: '0532xxxxxxx' },
    { id: 'demo-2', title: 'Beyaz Esya Tasima', loadType: 'Evden Eve', originCity: 'Ankara', destCity: 'Eskisehir', originDistrict: 'Cankaya', destDistrict: 'Odunpazari', vehicleType: 'Kapalı Kasa Kamyon', trailerType: 'Kapalı Kasa', weight: '5000', price: '7500', distance: 230, matchScore: 0.85, escrowEnabled: true, urgency: 'Düşük', loadingDate: '2026-05-29', bidCount: 1, companyName: 'DEF Nakliyat', contactPhone: '0533xxxxxxx' },
    { id: 'demo-3', title: 'Kısmi Tekstil Urunu', loadType: 'Kısmi Yük', originCity: 'Kirikkale', destCity: 'Konya', originDistrict: 'Merkez', destDistrict: 'Selcuklu', vehicleType: 'Kamyon', trailerType: 'Tenteli Dorse', weight: '12000', price: '12000', distance: 320, matchScore: 0.78, escrowEnabled: false, urgency: 'Yüksek', loadingDate: '2026-05-27', bidCount: 5, companyName: 'GHI Tasimacilik', contactPhone: '0544xxxxxxx' },
  ] : [];

  const displayItems = items.length > 0 ? filtered : demoItems;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-kaptan-text">Geri Dönüş Yükleri</h2>
          <p className="text-sm text-kaptan-muted mt-1">Teslim noktanıza yakın geri dönüş yüklerini bulun, boş dönmeyin.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline">
          <RotateCcw size={14} /> Yenile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><Package size={14} className="text-kaptan-primary" /> Toplam Yük</div>
          <p className="text-xl font-bold text-kaptan-text">{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><Shield size={14} className="text-kaptan-success" /> Escrow Garantili</div>
          <p className="text-xl font-bold text-kaptan-success">{stats.escrow}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><Zap size={14} className="text-kaptan-warning" /> Acil Yükler</div>
          <p className="text-xl font-bold text-kaptan-warning">{stats.urgent}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><DollarSign size={14} className="text-kaptan-primary" /> Ortalama Fiyat</div>
          <p className="text-xl font-bold text-kaptan-text">{stats.avgPrice.toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      {/* Location + Radius bar */}
      <div className="glass-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-kaptan-primary" />
            <span className="text-sm text-kaptan-text">Teslim Noktası:</span>
            <span className="text-sm font-semibold text-kaptan-primary">{deliveryCity}</span>
            <button onClick={() => setShowLocationInput(!showLocationInput)}
              className="text-xs text-kaptan-muted hover:text-kaptan-text ml-1">(değiştir)</button>
          </div>
          {showLocationInput && (
            <div className="flex gap-2 w-full md:w-auto">
              <input className="bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-1.5 text-sm text-kaptan-text w-40"
                placeholder="Şehir ara..." value={locSearch} onChange={e => setLocSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLocationSearch()} />
              <button onClick={handleLocationSearch}
                className="bg-kaptan-primary text-white px-3 py-1.5 rounded-lg text-xs">Ara</button>
              <button onClick={() => setShowLocationInput(false)}
                className="text-kaptan-muted hover:text-kaptan-text px-2"><X size={14} /></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Filter size={14} className="text-kaptan-muted" />
          <span className="text-xs text-kaptan-muted">Arama Yarıçapı:</span>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map(r => (
              <button key={r} onClick={() => setRadius(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  radius === r ? 'bg-kaptan-primary text-white shadow-md shadow-kaptan-primary/20' : 'bg-kaptan-dark border border-kaptan-border text-kaptan-muted hover:text-kaptan-text hover:border-kaptan-primary/30'
                }`}>{r} KM</button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + Views */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
          <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted text-sm"
            placeholder="Yük başlığı, şehir ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors ${
              showFilters ? 'bg-kaptan-primary text-white border-kaptan-primary' : 'bg-kaptan-card border-kaptan-border text-kaptan-text hover:border-kaptan-primary/30'
            }`}>
            <Filter size={16} /> Filtrele
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div className="flex rounded-lg border border-kaptan-border overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2.5 ${viewMode === 'list' ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card text-kaptan-muted hover:text-kaptan-text'}`}>
              <List size={18} /></button>
            <button onClick={() => setViewMode('map')}
              className={`px-3 py-2.5 ${viewMode === 'map' ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card text-kaptan-muted hover:text-kaptan-text'}`}>
              <Map size={18} /></button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass-card p-4 mb-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-kaptan-muted mb-1 block">Yük Türü</label>
              <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
                value={filters.loadType} onChange={e => setFilters({...filters, loadType: e.target.value})}>
                <option value="">Tümü</option>
                {LOAD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-kaptan-muted mb-1 block">Araç Tipi</label>
              <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
                value={filters.vehicleType} onChange={e => setFilters({...filters, vehicleType: e.target.value})}>
                <option value="">Tümü</option>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-kaptan-muted mb-1 block">Min Ağırlık (kg)</label>
              <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
                value={filters.minWeight} onChange={e => setFilters({...filters, minWeight: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-kaptan-muted mb-1 block">Sıralama</label>
              <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
                value={filters.sortBy} onChange={e => setFilters({...filters, sortBy: e.target.value as any})}>
                <option value="match">Uyum Skoru</option>
                <option value="price">Fiyat</option>
                <option value="distance">Mesafe</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <label className="flex items-center gap-2 text-xs text-kaptan-text">
              <input type="checkbox" checked={filters.escrowOnly} onChange={e => setFilters({...filters, escrowOnly: e.target.checked})}
                className="rounded border-kaptan-border bg-kaptan-dark accent-kaptan-primary" /> Sadece Escrow Garantili
            </label>
            <label className="flex items-center gap-2 text-xs text-kaptan-text">
              <input type="checkbox" checked={filters.urgentOnly} onChange={e => setFilters({...filters, urgentOnly: e.target.checked})}
                className="rounded border-kaptan-border bg-kaptan-dark accent-kaptan-primary" /> Sadece Acil Yükler
            </label>
          </div>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="glass-card p-4 mb-4">
          <div className="h-[450px] rounded-lg overflow-hidden">
            <ReturnLoadMap
              deliveryPoint={deliveryPoint}
              loads={displayItems.slice(0, 50)}
              radius={radius}
              onSelect={(load: any) => setSelected(load)}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-kaptan-danger/10 border border-kaptan-danger/30 rounded-xl p-8 text-center mb-4">
          <AlertTriangle size={36} className="mx-auto mb-2 text-kaptan-danger opacity-50" />
          <p className="text-kaptan-danger font-medium">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm text-kaptan-primary hover:underline">Tekrar Dene</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 skeleton rounded-xl border border-kaptan-border">
              <div className="p-4 flex gap-4">
                <div className="w-2/3 space-y-2"><div className="h-4 bg-kaptan-border rounded w-3/4" /><div className="h-3 bg-kaptan-border rounded w-1/2" /><div className="h-3 bg-kaptan-border rounded w-1/3" /></div>
                <div className="w-1/3 space-y-2"><div className="h-4 bg-kaptan-border rounded w-full" /><div className="h-3 bg-kaptan-border rounded w-1/2" /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && (
        <div className="space-y-3">
          {displayItems.map((r: any) => {
            const isFav = favorites.has(r.id);
            const matchPct = r.matchScore ? Math.round(r.matchScore * 100) : null;
            const isUrgent = r.urgency === 'Yüksek';

            return (
              <div key={r.id}
                className={`bg-kaptan-card border rounded-xl p-4 transition-all hover:shadow-lg group ${
                  selected?.id === r.id ? 'border-kaptan-primary shadow-md shadow-kaptan-primary/10' :
                  isUrgent ? 'border-kaptan-warning/30' : 'border-kaptan-border hover:border-kaptan-primary/30'
                }`}>
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Left - Load Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-kaptan-text text-lg">{r.title}</h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/20 text-kaptan-primary">{r.loadType}</span>
                      {isUrgent && <span className="px-2 py-0.5 rounded text-xs bg-kaptan-warning/20 text-kaptan-warning flex items-center gap-1"><Zap size={10} /> Acil</span>}
                      {r.escrowEnabled && <span className="px-2 py-0.5 rounded text-xs bg-kaptan-success/20 text-kaptan-success flex items-center gap-1"><Shield size={10} /> Escrow</span>}
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <MapPin size={14} className="text-kaptan-success shrink-0" />
                      <span className="text-kaptan-text">{r.originCity}{r.originDistrict ? ` / ${r.originDistrict}` : ''}</span>
                      <ArrowLeftRight size={14} className="text-kaptan-muted shrink-0" />
                      <MapPin size={14} className="text-kaptan-danger shrink-0" />
                      <span className="text-kaptan-text">{r.destCity}{r.destDistrict ? ` / ${r.destDistrict}` : ''}</span>
                      {r.distance && <span className="text-xs text-kaptan-muted ml-2">({r.distance} km)</span>}
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-kaptan-muted">
                      <span className="flex items-center gap-1"><Truck size={12} /> {r.vehicleType || '-'}</span>
                      {r.trailerType && <span>• {r.trailerType}</span>}
                      <span className="flex items-center gap-1"><Weight size={12} /> {Number(r.weight).toLocaleString('tr-TR')} kg</span>
                      {r.volume && <span className="flex items-center gap-1"><Ruler size={12} /> {r.volume} m³</span>}
                      {r.loadingDate && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(r.loadingDate).toLocaleDateString('tr-TR')}</span>}
                      {r.bidCount > 0 && <span className="flex items-center gap-1"><Gavel size={12} /> {r.bidCount} teklif</span>}
                      <span className="text-kaptan-muted">{r.companyName}</span>
                    </div>

                    {/* Match score bar */}
                    {matchPct !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-kaptan-muted">Uyum:</span>
                        <div className="w-24 bg-kaptan-dark rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${matchPct >= 80 ? 'bg-kaptan-success' : matchPct >= 50 ? 'bg-kaptan-warning' : 'bg-kaptan-danger'}`}
                            style={{ width: `${matchPct}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${matchPct >= 80 ? 'text-kaptan-success' : matchPct >= 50 ? 'text-kaptan-warning' : 'text-kaptan-danger'}`}>
                          %{matchPct}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right - Price & Actions */}
                  <div className="flex flex-col items-end justify-between min-w-[160px]">
                    <div className="text-right">
                      <p className="text-xl font-bold text-kaptan-text">{Number(r.price || 0).toLocaleString('tr-TR')} ₺</p>
                      {r.pricePerKm && <p className="text-xs text-kaptan-muted">~{(Number(r.price) / (Number(r.distance) || 1)).toFixed(1)} ₺/km</p>}
                    </div>

                    <div className="flex flex-wrap gap-1.5 justify-end mt-2">
                      <button onClick={() => toggleFavorite(r.id)}
                        className={`p-2 rounded-lg transition-colors ${isFav ? 'bg-kaptan-warning/20 text-kaptan-warning' : 'bg-kaptan-dark border border-kaptan-border text-kaptan-muted hover:text-kaptan-warning hover:border-kaptan-warning/30'}`}
                        title="Favorilere Ekle">
                        <Heart size={15} fill={isFav ? '#F59E0B' : 'none'} />
                      </button>
                      <button onClick={() => setSelected(selected?.id === r.id ? null : r)}
                        className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                          selected?.id === r.id ? 'bg-kaptan-primary/10 border-kaptan-primary text-kaptan-primary' : 'border-kaptan-border text-kaptan-muted hover:text-kaptan-text hover:border-kaptan-primary/30'
                        }`}>Detay</button>
                      <button onClick={() => handleReserve(r.id)} disabled={reservingId === r.id}
                        className="px-3 py-2 rounded-lg text-xs bg-kaptan-dark border border-kaptan-border text-kaptan-text hover:border-kaptan-primary/50 hover:text-kaptan-primary disabled:opacity-50 transition-all">
                        {reservingId === r.id ? 'Rezerve...' : 'Rezerve Et'}
                      </button>
                      <button onClick={() => { setBidLoad(r); setBidForm(prev => ({...prev, price: r.price || ''})); }}
                        className="px-3 py-2 rounded-lg text-xs bg-kaptan-primary text-white hover:bg-kaptan-primary/90 transition-all flex items-center gap-1">
                        <Send size={12} /> Teklif Ver
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {selected?.id === r.id && (
                  <div className="mt-4 pt-4 border-t border-kaptan-border grid grid-cols-2 md:grid-cols-4 gap-3 text-sm animate-in slide-in-from-top-1">
                    <div><span className="text-kaptan-muted text-xs">Yük Veren:</span><p className="text-kaptan-text">{r.companyName || 'Belirtilmemiş'}</p></div>
                    <div><span className="text-kaptan-muted text-xs">İletişim:</span><p className="text-kaptan-text">{r.contactPhone || '-'}</p></div>
                    <div><span className="text-kaptan-muted text-xs">Yükleme Tarihi:</span><p className="text-kaptan-text">{r.loadingDate ? new Date(r.loadingDate).toLocaleDateString('tr-TR') : '-'}</p></div>
                    <div><span className="text-kaptan-muted text-xs">Escrow:</span><p className={r.escrowEnabled ? 'text-kaptan-success' : 'text-kaptan-muted'}>{r.escrowEnabled ? 'Aktif' : 'Pasif'}</p></div>
                    <div><span className="text-kaptan-muted text-xs">Teklif Sayısı:</span><p className="text-kaptan-text">{r.bidCount || 0}</p></div>
                    <div><span className="text-kaptan-muted text-xs">Dorse Tipi:</span><p className="text-kaptan-text">{r.trailerType || '-'}</p></div>
                    <div><span className="text-kaptan-muted text-xs">Hacim:</span><p className="text-kaptan-text">{r.volume ? `${r.volume} m³` : '-'}</p></div>
                    <div><span className="text-kaptan-muted text-xs">Paket Tipi:</span><p className="text-kaptan-text">{r.packageType || '-'}</p></div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty State */}
          {displayItems.length === 0 && !loading && !error && (
            <div className="glass-card p-16 text-center">
              <ArrowLeftRight size={56} className="mx-auto mb-4 text-kaptan-muted opacity-30" />
              <h3 className="text-lg font-semibold text-kaptan-text mb-2">Geri Dönüş Yükü Bulunamadı</h3>
              <p className="text-sm text-kaptan-muted max-w-md mx-auto">
                {radius} KM yarıçap içinde uygun geri dönüş yükü bulunamadı. Yarıçapı artırmayı veya teslim noktasını değiştirmeyi deneyin.
              </p>
              <button onClick={() => setRadius(250)}
                className="mt-4 px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm hover:bg-kaptan-primary/90">
                Yarıçapı 250 KM Yap
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bid/Offer Modal */}
      {bidLoad && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setBidLoad(null)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-kaptan-text">Teklif Ver</h3>
              <button onClick={() => setBidLoad(null)} className="p-1.5 hover:bg-kaptan-dark rounded-lg text-kaptan-muted hover:text-kaptan-text"><X size={18} /></button>
            </div>

            <div className="bg-kaptan-dark rounded-lg p-3 mb-4">
              <p className="font-medium text-kaptan-text">{bidLoad.title}</p>
              <p className="text-xs text-kaptan-muted mt-1">{bidLoad.originCity} → {bidLoad.destCity} • {bidLoad.vehicleType}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-kaptan-muted mb-1 block">Teklif Fiyatı (₺) *</label>
                <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text"
                  value={bidForm.price} onChange={e => setBidForm({...bidForm, price: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-kaptan-muted mb-1 block">Tahmini Süre (gün)</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
                    value={bidForm.estimatedDays} onChange={e => setBidForm({...bidForm, estimatedDays: e.target.value})}>
                    {[1, 2, 3, 5, 7, 10, 14].map(d => <option key={d} value={d}>{d} gün</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-kaptan-muted mb-1 block">Yükü Alabileceği Saat</label>
                  <input type="time" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text" />
                </div>
              </div>

              <div>
                <label className="text-xs text-kaptan-muted mb-1 block">Not (Opsiyonel)</label>
                <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text" rows={2}
                  value={bidForm.note} onChange={e => setBidForm({...bidForm, note: e.target.value})}
                  placeholder="Teklifinizle ilgili ek bilgiler..." />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-kaptan-text">
                  <input type="checkbox" checked={bidForm.hasReturn} onChange={e => setBidForm({...bidForm, hasReturn: e.target.checked})}
                    className="rounded border-kaptan-border bg-kaptan-dark accent-kaptan-primary" /> Boş Dönüş Uygun
                </label>
                <label className="flex items-center gap-2 text-xs text-kaptan-text">
                  <input type="checkbox" checked={bidForm.requestEscrow} onChange={e => setBidForm({...bidForm, requestEscrow: e.target.checked})}
                    className="rounded border-kaptan-border bg-kaptan-dark accent-kaptan-primary" />
                  <Shield size={12} className="text-kaptan-success" /> Escrow Ödeme İste
                </label>
              </div>

              {/* Fee breakdown */}
              <div className="bg-kaptan-dark rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-kaptan-muted">Teklif Tutarı</span><span className="text-kaptan-text">{Number(bidForm.price || 0).toLocaleString('tr-TR')} ₺</span></div>
                <div className="flex justify-between"><span className="text-kaptan-muted">Platform Komisyonu (%5)</span><span className="text-kaptan-text">{Number(parseFloat(bidForm.price || '0') * 0.05).toLocaleString('tr-TR')} ₺</span></div>
                {bidForm.requestEscrow && <div className="flex justify-between"><span className="text-kaptan-muted">Escrow Hizmet Bedeli (%2)</span><span className="text-kaptan-text">{Number(parseFloat(bidForm.price || '0') * 0.02).toLocaleString('tr-TR')} ₺</span></div>}
                <div className="flex justify-between pt-1 border-t border-kaptan-border font-bold">
                  <span className="text-kaptan-text">Net Kazanç</span>
                  <span className="text-kaptan-success">
                    {Number(parseFloat(bidForm.price || '0') * (bidForm.requestEscrow ? 0.93 : 0.95)).toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setBidLoad(null)}
                className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted hover:text-kaptan-text">İptal</button>
              <button onClick={handleBid} disabled={submittingBid || !bidForm.price}
                className="flex items-center gap-2 px-6 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">
                <Send size={14} /> {submittingBid ? 'Gönderiliyor...' : 'Teklifi Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
