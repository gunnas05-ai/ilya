'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Truck } from 'lucide-react';

const CATEGORIES = ['Çekici', 'Dorse', 'Kamyon', 'Kamyonet', 'Panelvan', 'Lowbed', 'Tanker', 'Frigorifik'];

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', category: '', brand: '', model: '', year: '', price: '',
    description: '', condition: 'İkinci El', location: '', contactPhone: '',
    mileage: '', fuelType: '', color: '',
  });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/marketplace');
      const data = res.data?.data?.data || res.data?.data || [];
      setListings(Array.isArray(data) ? data : []);
    } catch { setListings([]); }
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.put(`/marketplace/${editing.id}`, form); }
      else { await api.post('/marketplace', form); }
      setShowForm(false); setEditing(null); resetForm(); fetchListings();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/marketplace/${id}`); fetchListings(); }
    catch (err: any) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  const resetForm = () => setForm({ title: '', category: '', brand: '', model: '', year: '', price: '', description: '', condition: 'İkinci El', location: '', contactPhone: '', mileage: '', fuelType: '', color: '' });

  const filtered = listings.filter((l: any) =>
    !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.category?.toLowerCase().includes(search.toLowerCase()) || l.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Araç & Ekipman Pazaryeri</h2>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
          <Plus size={18} /> İlan Ekle
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-kaptan-text">{listings.length}</p>
          <p className="text-xs text-kaptan-muted">Toplam İlan</p>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-kaptan-success">{listings.filter(l => l.status === 'active').length}</p>
          <p className="text-xs text-kaptan-muted">Aktif İlan</p>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-kaptan-warning">{listings.filter(l => l.status === 'pending').length}</p>
          <p className="text-xs text-kaptan-muted">Onay Bekleyen</p>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-kaptan-text">
            {listings.reduce((s: number, l: any) => s + Number(l.price || 0), 0).toLocaleString('tr-TR')} ₺
          </p>
          <p className="text-xs text-kaptan-muted">Toplam Değer</p>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="İlan başlığı, kategori, marka ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-kaptan-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((l: any) => (
            <div key={l.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 hover:border-kaptan-primary/30 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-kaptan-primary" />
                    <h3 className="font-semibold text-kaptan-text">{l.title}</h3>
                  </div>
                  <p className="text-xs text-kaptan-muted mt-1">{l.category} • {l.brand} {l.model} • {l.year}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setForm({ title: l.title || '', category: l.category || '', brand: l.brand || '', model: l.model || '', year: l.year?.toString() || '', price: l.price?.toString() || '', description: l.description || '', condition: l.condition || 'İkinci El', location: l.location || '', contactPhone: l.contactPhone || '', mileage: l.mileage?.toString() || '', fuelType: l.fuelType || '', color: l.color || '' }); setEditing(l); setShowForm(true); }}
                    className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(l.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-lg font-bold text-kaptan-primary">{Number(l.price || 0).toLocaleString('tr-TR')} ₺</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  l.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  l.status === 'sold' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{l.status === 'active' ? 'Aktif' : l.status === 'sold' ? 'Satıldı' : 'Bekliyor'}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-kaptan-muted">Henüz ilan bulunmuyor</div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'İlan Düzenle' : 'Yeni İlan'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">İlan Başlığı *</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Kategori *</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">Seçiniz</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Marka</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Model</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Yıl</label>
                  <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Fiyat (₺) *</label>
                  <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Durum</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                    <option>İkinci El</option><option>Sıfır</option><option>Hasarlı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">KM</label>
                  <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.mileage} onChange={e => setForm({...form, mileage: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Yakıt</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                    <option value="">Seçiniz</option>
                    <option>Dizel</option><option>Benzin</option><option>LPG</option><option>Elektrik</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Konum</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">İrtibat Tel</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Açıklama</label>
                <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={2}
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
