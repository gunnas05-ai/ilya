'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Megaphone } from 'lucide-react';

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal', isActive: true });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      const data = res.data?.data?.data || res.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/announcements/${editing.id}`, form);
      else await api.post('/announcements', form);
      setShowForm(false); setEditing(null); setForm({ title: '', body: '', priority: 'normal', isActive: true }); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/announcements/${id}`); fetchData(); } catch {}
  };

  const filtered = items.filter((i: any) => !search || i.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Duyuru Yönetimi</h2>
        <button onClick={() => { setForm({ title: '', body: '', priority: 'normal', isActive: true }); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Duyuru Ekle</button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Duyuru ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <div key={item.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 hover:border-kaptan-primary/30">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className={item.priority === 'high' ? 'text-kaptan-danger' : 'text-kaptan-primary'} />
                  <div>
                    <h3 className="font-medium text-kaptan-text">{item.title}</h3>
                    <p className="text-sm text-kaptan-muted mt-1 line-clamp-2">{item.body}</p>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${item.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>{item.priority}</span>
                  <button onClick={() => { setForm({ title: item.title, body: item.body, priority: item.priority, isActive: item.isActive }); setEditing(item); setShowForm(true); }}
                    className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-kaptan-muted">Henüz duyuru bulunmuyor</div>}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'Duyuru Düzenle' : 'Yeni Duyuru'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">Başlık *</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">İçerik *</label>
                <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={4} required
                  value={form.body} onChange={e => setForm({...form, body: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Öncelik</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="low">Düşük</option><option value="normal">Normal</option><option value="high">Yüksek</option>
                  </select></div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-kaptan-text">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})}
                      className="rounded border-kaptan-border bg-kaptan-dark" /> Aktif</label></div>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
