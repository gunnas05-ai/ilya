'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, Bell, Send } from 'lucide-react';

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', targetRole: 'all', targetUserId: '' });

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/notifications'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/notifications/send', form); setShowForm(false); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/notifications/${id}`); fetchData(); } catch {}
  };

  const filtered = items.filter((n: any) => !search || n.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Bildirimler</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
          <Send size={18} /> Bildirim Gönder
        </button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Bildirim ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Başlık</th><th className="text-left p-3">Hedef</th><th className="text-left p-3">Tarih</th><th className="text-left p-3">Durum</th><th className="text-left p-3">İşlem</th></tr></thead>
            <tbody>
              {filtered.map((n: any) => (
                <tr key={n.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                  <td className="p-3"><p className="font-medium text-kaptan-text">{n.title}</p><p className="text-xs text-kaptan-muted truncate max-w-[200px]">{n.body}</p></td>
                  <td className="p-3 text-xs text-kaptan-muted">{n.targetRole || 'Tümü'}</td>
                  <td className="p-3 text-xs text-kaptan-muted">{n.createdAt ? new Date(n.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${n.sent ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{n.sent ? 'Gönderildi' : 'Bekliyor'}</span></td>
                  <td className="p-3"><button onClick={() => handleDelete(n.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={16} /></button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-kaptan-muted">Bildirim bulunmuyor</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Bildirim Gönder</h3>
            <form onSubmit={handleSend} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">Başlık *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Mesaj *</label><textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={3} required value={form.body} onChange={e => setForm({...form, body: e.target.value})} /></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Hedef Rol</label>
                <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.targetRole} onChange={e => setForm({...form, targetRole: e.target.value})}>
                  <option value="all">Tüm Kullanıcılar</option><option value="tasiyici">Taşıyıcılar</option><option value="yuk_veren">Yük Verenler</option><option value="sofor">Şoförler</option>
                </select></div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">{saving ? 'Gönderiliyor...' : 'Gönder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
