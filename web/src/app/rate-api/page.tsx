'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, TrendingUp, DollarSign } from 'lucide-react';

export default function RateApiPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', ratePerKm: '', ratePerTon: '', minPrice: '', origin: '', destination: '' });

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/rate-api'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/rate-api', form); setShowForm(false); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const filtered = items.filter((r: any) => !search || r.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Fiyatlandırma API</h2>
        <button onClick={() => { setForm({ name: '', ratePerKm: '', ratePerTon: '', minPrice: '', origin: '', destination: '' }); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Tarife Ekle</button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Tarife ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <div key={r.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-kaptan-primary" />
                  <div>
                    <h3 className="font-medium text-kaptan-text">{r.name || 'Tarife'}</h3>
                    <p className="text-xs text-kaptan-muted">{r.origin || 'Tüm'} → {r.destination || 'Tüm'}</p>
                  </div>
                </div>
                <div className="text-right">
                  {r.ratePerKm && <p className="text-sm text-kaptan-text">{Number(r.ratePerKm).toFixed(2)} ₺/km</p>}
                  {r.ratePerTon && <p className="text-sm text-kaptan-text">{Number(r.ratePerTon).toFixed(2)} ₺/ton</p>}
                  {r.minPrice && <p className="text-xs text-kaptan-muted">Min: {Number(r.minPrice).toLocaleString('tr-TR')} ₺</p>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-kaptan-muted">Tarife bulunmuyor</div>}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Yeni Tarife</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">Tarife Adı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Km Başına (₺)</label><input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.ratePerKm} onChange={e => setForm({...form, ratePerKm: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Ton Başına (₺)</label><input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.ratePerTon} onChange={e => setForm({...form, ratePerTon: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Minimum Fiyat (₺)</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.minPrice} onChange={e => setForm({...form, minPrice: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Nereden</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Nereye</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
