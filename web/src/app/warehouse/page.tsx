'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Warehouse, MapPin } from 'lucide-react';

export default function WarehousePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', district: '', address: '', capacity: '', dockCount: '', phone: '' });

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/warehouse'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/warehouse/${editing.id}`, form);
      else await api.post('/warehouse', form);
      setShowForm(false); setEditing(null); setForm({ name: '', city: '', district: '', address: '', capacity: '', dockCount: '', phone: '' }); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/warehouse/${id}`); fetchData(); } catch {}
  };

  const filtered = items.filter((w: any) => !search || w.name?.toLowerCase().includes(search.toLowerCase()) || w.city?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Depo Yönetimi</h2>
        <button onClick={() => { setForm({ name: '', city: '', district: '', address: '', capacity: '', dockCount: '', phone: '' }); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Depo Ekle</button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Depo ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((w: any) => (
            <div key={w.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2"><Warehouse size={16} className="text-kaptan-primary" /><h3 className="font-semibold text-kaptan-text">{w.name}</h3></div>
                  <div className="flex items-center gap-1 text-xs text-kaptan-muted mt-1"><MapPin size={12} />{w.city}{w.district ? ` / ${w.district}` : ''}</div>
                  <div className="flex gap-3 mt-2 text-xs text-kaptan-muted"><span>Kapasite: {w.capacity || '-'}</span><span>Dock: {w.dockCount || '-'}</span></div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setForm({ name: w.name || '', city: w.city || '', district: w.district || '', address: w.address || '', capacity: w.capacity?.toString() || '', dockCount: w.dockCount?.toString() || '', phone: w.phone || '' }); setEditing(w); setShowForm(true); }}
                    className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(w.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-kaptan-muted">Depo bulunmuyor</div>}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'Depo Düzenle' : 'Yeni Depo'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">Depo Adı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">İl *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">İlçe</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.district} onChange={e => setForm({...form, district: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Adres</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Kapasite</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Dock Sayısı</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.dockCount} onChange={e => setForm({...form, dockCount: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Telefon</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
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
