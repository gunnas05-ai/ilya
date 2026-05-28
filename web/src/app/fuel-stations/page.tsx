'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, MapPin, Fuel, AlertTriangle, Clock, CheckCircle, List, Map } from 'lucide-react';

const FuelStationMap = dynamic(() => import('./map'), { ssr: false, loading: () => <div className="h-[500px] bg-kaptan-card rounded-xl animate-pulse flex items-center justify-center text-kaptan-muted">Harita yükleniyor...</div> });

const BRANDS = ['Shell', 'BP', 'Petrol Ofisi', 'Opet', 'Total', 'Aytemiz', 'GO', 'Lukoil', 'Alpet', 'Diger'];
const FUEL_TYPES = ['motorin', 'kursunsuz', 'LPG', 'AdBlue', 'elektrik_sarj'];
const SERVICES = ['arac_yikama', 'lokanta', 'kafe', 'market', 'motel', 'otopark', 'dus_wc', 'elektrikli_sarj', 'servis_tamir', 'lastikci', 'banka_ATM', 'ucretsiz_wifi', 'cay_kahve'];

function getPriceStatus(lastUpdated: string | null) {
  if (!lastUpdated) return { label: 'Güncel Değil', color: 'text-kaptan-danger', bg: 'bg-red-500/10', faded: true };
  const hours = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return { label: 'Güncel', color: 'text-kaptan-success', bg: 'bg-green-500/10', faded: false };
  if (hours < 48) return { label: 'Güncel Değil', color: 'text-kaptan-warning', bg: 'bg-yellow-500/10', faded: false };
  return { label: 'Eski Fiyat', color: 'text-kaptan-muted', bg: 'bg-gray-500/10', faded: true };
}

export default function FuelStationsPage() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedStation, setSelectedStation] = useState<any>(null);

  const [form, setForm] = useState({
    name: '', brand: '', city: '', district: '', address: '', phone: '', lat: '', lng: '', is247: true,
    fuelPrices: { motorin: '', kursunsuz: '', LPG: '', AdBlue: '', elektrik_sarj: '' },
    services: [] as string[],
  });

  const fetchStations = async () => {
    setLoading(true);
    try { const res = await api.get('/fuel-stations'); setStations(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); } catch { setStations([]); }
    setLoading(false);
  };
  useEffect(() => { fetchStations(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, latitude: parseFloat(form.lat), longitude: parseFloat(form.lng) };
    try {
      if (editing) await api.put(`/fuel-stations/${editing.id}`, payload);
      else await api.post('/fuel-stations', payload);
      setShowForm(false); setEditing(null); resetForm(); fetchStations();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu istasyonu silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/fuel-stations/${id}`); fetchStations(); } catch (err: any) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  const toggleService = (s: string) => setForm(prev => ({ ...prev, services: prev.services.includes(s) ? prev.services.filter(x => x !== s) : [...prev.services, s] }));
  const resetForm = () => setForm({ name: '', brand: '', city: '', district: '', address: '', phone: '', lat: '', lng: '', is247: true, fuelPrices: { motorin: '', kursunsuz: '', LPG: '', AdBlue: '', elektrik_sarj: '' }, services: [] });

  const filtered = stations.filter((s: any) => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.brand?.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase()));
  const staleCount = stations.filter(s => getPriceStatus(s.priceUpdatedAt || s.updatedAt).label !== 'Güncel').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Akaryakıt İstasyonları</h2>
        <div className="flex items-center gap-3">
          {staleCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-kaptan-warning"><AlertTriangle size={14} />{staleCount} fiyat güncel değil</span>
          )}
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> İstasyon Ekle</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
          <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
            placeholder="İstasyon, marka, şehir ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex rounded-lg border border-kaptan-border overflow-hidden">
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-2.5 ${viewMode === 'list' ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card text-kaptan-muted hover:text-kaptan-text'}`}>
            <List size={18} /></button>
          <button onClick={() => setViewMode('map')}
            className={`px-3 py-2.5 ${viewMode === 'map' ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card text-kaptan-muted hover:text-kaptan-text'}`}>
            <Map size={18} /></button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 mb-6">
          <div className="h-[500px] rounded-lg overflow-hidden">
            <FuelStationMap stations={filtered} onSelect={(s: any) => setSelectedStation(s)} />
          </div>
          {selectedStation && (
            <div className="mt-3 p-3 bg-kaptan-dark rounded-lg flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-kaptan-text">{selectedStation.name}</span>
                <span className="text-xs text-kaptan-muted ml-2">{selectedStation.brand} • {selectedStation.city}</span>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-xs text-kaptan-muted hover:text-kaptan-text">Kapat</button>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-kaptan-card rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((s: any) => {
                const priceStatus = getPriceStatus(s.priceUpdatedAt || s.updatedAt);
                return (
                  <div key={s.id} className={`bg-kaptan-card border border-kaptan-border rounded-xl p-4 transition-all hover:border-kaptan-primary/30 ${priceStatus.faded ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-kaptan-text">{s.name}</h3>
                          <span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/20 text-kaptan-primary">{s.brand}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-kaptan-muted mt-1"><MapPin size={12} /> {s.city}{s.district ? ` / ${s.district}` : ''}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`flex items-center gap-1 text-xs ${priceStatus.color}`}>
                            {priceStatus.label === 'Güncel' ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {priceStatus.label}
                          </span>
                          {s.is247 && <span className="text-xs bg-kaptan-primary/10 text-kaptan-primary px-1.5 py-0.5 rounded">7/24</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setForm({ name: s.name || '', brand: s.brand || '', city: s.city || '', district: s.district || '', address: s.address || '', phone: s.phone || '', lat: s.latitude?.toString() || '', lng: s.longitude?.toString() || '', is247: s.is247 ?? true, fuelPrices: s.fuelPrices || { motorin: '', kursunsuz: '', LPG: '', AdBlue: '', elektrik_sarj: '' }, services: s.services || [] }); setEditing(s); setShowForm(true); }}
                          className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {s.fuelPrices && Object.entries(s.fuelPrices).filter(([_, v]) => v).map(([k, v]: any) => (
                        <span key={k} className="text-xs bg-kaptan-dark px-2 py-1 rounded text-kaptan-text">
                          <Fuel size={10} className="inline mr-1" />{k.replace(/_/g, ' ')}: <span className="font-medium">{Number(v).toFixed(2)} ₺</span>
                        </span>
                      ))}
                      {(!s.fuelPrices || Object.values(s.fuelPrices).every(v => !v)) && <span className="text-xs text-kaptan-muted">Fiyat girilmemiş</span>}
                    </div>
                    {s.services?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {s.services.slice(0, 5).map((sv: string) => (
                          <span key={sv} className="text-xs px-1.5 py-0.5 rounded bg-kaptan-border/30 text-kaptan-muted">{sv.replace(/_/g, ' ')}</span>
                        ))}
                        {s.services.length > 5 && <span className="text-xs text-kaptan-muted">+{s.services.length - 5}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-kaptan-muted">Henüz istasyon bulunmuyor</div>}
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'İstasyon Düzenle' : 'Yeni İstasyon'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">İstasyon Adı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Marka *</label><select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}><option value="">Seçiniz</option>{BRANDS.map(b => <option key={b}>{b}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">İl *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">İlçe</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.district} onChange={e => setForm({...form, district: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Adres *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Telefon</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Enlem</label><input type="number" step="any" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Boylam</label><input type="number" step="any" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} /></div>
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-2">Yakıt Fiyatları (₺/Lt)</label>
                <div className="grid grid-cols-3 gap-2">
                  {FUEL_TYPES.map(ft => (
                    <div key={ft}>
                      <label className="text-xs text-kaptan-muted">{ft.replace(/_/g, ' ')}{ft === 'motorin' ? ' *' : ''}</label>
                      <input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-2 py-1.5 text-kaptan-text text-sm"
                        value={(form.fuelPrices as any)[ft]} onChange={e => setForm({...form, fuelPrices: {...form.fuelPrices, [ft]: e.target.value}})} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-2">Hizmetler</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.map(sv => (
                    <button key={sv} type="button" onClick={() => toggleService(sv)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${form.services.includes(sv) ? 'bg-kaptan-primary/20 border-kaptan-primary text-kaptan-primary' : 'border-kaptan-border text-kaptan-muted hover:border-kaptan-primary/50'}`}>
                      {sv.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={form.is247} onChange={e => setForm({...form, is247: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> 7/24 Açık</label>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
