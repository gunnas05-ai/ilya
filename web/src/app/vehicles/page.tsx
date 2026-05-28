'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Truck, Gauge, Fuel } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    plateNumber: '', vehicleType: '', trailerType: '', brand: '', model: '',
    year: '', capacity: '', fuelType: '', isActive: true, driverName: '',
  });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicles');
      const data = res.data?.data?.data || res.data?.data || [];
      setVehicles(Array.isArray(data) ? data : []);
    } catch { setVehicles([]); }
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.put(`/vehicles/${editing.id}`, form); }
      else { await api.post('/vehicles', form); }
      setShowForm(false); setEditing(null); resetForm(); fetchVehicles();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/vehicles/${id}`); fetchVehicles(); }
    catch (err: any) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  const resetForm = () => setForm({ plateNumber: '', vehicleType: '', trailerType: '', brand: '', model: '', year: '', capacity: '', fuelType: '', isActive: true, driverName: '' });

  const filtered = vehicles.filter((v: any) =>
    !search || v.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleType?.toLowerCase().includes(search.toLowerCase()) ||
    v.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Araç Yönetimi</h2>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
          <Plus size={18} /> Araç Ekle
        </button>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Plaka, tip, marka ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-kaptan-card rounded-xl animate-pulse" />)
        ) : (
          <>
            {filtered.map((v: any) => (
              <div key={v.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 hover:border-kaptan-primary/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Truck size={18} className={v.isActive ? 'text-kaptan-success' : 'text-kaptan-muted'} />
                    <div>
                      <h3 className="font-semibold text-kaptan-text">{v.plateNumber}</h3>
                      <p className="text-xs text-kaptan-muted">{v.brand} {v.model} • {v.year}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setForm({ plateNumber: v.plateNumber || '', vehicleType: v.vehicleType || '', trailerType: v.trailerType || '', brand: v.brand || '', model: v.model || '', year: v.year?.toString() || '', capacity: v.capacity?.toString() || '', fuelType: v.fuelType || '', isActive: v.isActive ?? true, driverName: v.driverName || '' }); setEditing(v); setShowForm(true); }}
                      className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-kaptan-muted">
                  <span className="flex items-center gap-1"><Truck size={12} />{v.vehicleType || '-'}</span>
                  <span className="flex items-center gap-1"><Gauge size={12} />{v.capacity ? `${v.capacity} ton` : '-'}</span>
                  <span className="flex items-center gap-1"><Fuel size={12} />{v.fuelType || '-'}</span>
                </div>
                {v.driverName && <p className="text-xs text-kaptan-muted mt-2">Sürücü: {v.driverName}</p>}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-12 text-kaptan-muted">Henüz araç bulunmuyor</div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'Araç Düzenle' : 'Yeni Araç'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Plaka *</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Araç Tipi *</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.vehicleType} onChange={e => setForm({...form, vehicleType: e.target.value})}>
                    <option value="">Seçiniz</option>
                    <option>Çekici (TIR)</option><option>Kamyon</option><option>Kamyonet</option>
                    <option>Panelvan</option><option>Lowbed</option><option>Tanker</option><option>Frigorifik</option>
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
                  <label className="block text-sm text-kaptan-muted mb-1">Kapasite (ton)</label>
                  <input type="number" step="0.1" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Yakıt</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})}>
                    <option value="">Seçiniz</option><option>Dizel</option><option>Benzin</option><option>LPG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Dorse Tipi</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.trailerType} onChange={e => setForm({...form, trailerType: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Sürücü</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-kaptan-text">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})}
                  className="rounded border-kaptan-border bg-kaptan-dark" /> Aktif
              </label>
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
