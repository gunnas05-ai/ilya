'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, FileBadge, CheckCircle, XCircle, Plus, RefreshCw, Truck, User, Calendar, MapPin, Weight } from 'lucide-react';

export default function UetdsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plateNumber: '', driverName: '', driverTC: '', origin: '', destination: '',
    date: '', cargoType: '', weight: '', transactionType: 'YURTICI_YUK',
  });

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/uetds'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/uetds', form); setShowForm(false); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const filtered = items.filter((u: any) => !search || u.plateNumber?.toLowerCase().includes(search.toLowerCase()) || u.driverName?.toLowerCase().includes(search.toLowerCase()) || u.transactionType?.toLowerCase().includes(search.toLowerCase()));

  const stats = { total: items.length, success: items.filter(u => u.success !== false).length, failed: items.filter(u => u.success === false).length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><FileBadge size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">U-ETDS Beyanları</h2></div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline"><RefreshCw size={14} /> Yenile</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Yeni Beyan</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><FileBadge size={20} className="mx-auto mb-1 text-kaptan-primary" /><p className="text-xl font-bold text-kaptan-text">{stats.total}</p><p className="text-xs text-kaptan-muted">Toplam Beyan</p></div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><CheckCircle size={20} className="mx-auto mb-1 text-kaptan-success" /><p className="text-xl font-bold text-kaptan-success">{stats.success}</p><p className="text-xs text-kaptan-muted">Başarılı</p></div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><XCircle size={20} className="mx-auto mb-1 text-kaptan-danger" /><p className="text-xl font-bold text-kaptan-danger">{stats.failed}</p><p className="text-xs text-kaptan-muted">Başarısız</p></div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Plaka, sürücü, işlem türü ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50"><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Plaka</th><th className="text-left p-3">Sürücü</th><th className="text-left p-3">Rota</th><th className="text-left p-3">Yük</th><th className="text-left p-3">Tarih</th><th className="text-left p-3">İşlem</th><th className="text-left p-3">Durum</th></tr></thead>
            <tbody>
              {filtered.map((u: any) => (
                <tr key={u.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                  <td className="p-3 font-medium text-kaptan-text"><Truck size={12} className="inline mr-1" />{u.plateNumber}</td>
                  <td className="p-3 text-sm text-kaptan-text"><User size={12} className="inline mr-1" />{u.driverName || '-'}</td>
                  <td className="p-3 text-xs text-kaptan-muted"><MapPin size={10} className="inline mr-1" />{u.origin || '?'} → {u.destination || '?'}</td>
                  <td className="p-3 text-xs text-kaptan-muted">{u.cargoType || '-'} {u.weight && <span className="text-kaptan-text">({u.weight} ton)</span>}</td>
                  <td className="p-3 text-xs text-kaptan-muted">{u.date || (u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-')}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/10 text-kaptan-primary">{u.transactionType || '-'}</span></td>
                  <td className="p-3">{u.success !== false ? <CheckCircle size={16} className="text-kaptan-success" /> : <XCircle size={16} className="text-kaptan-danger" />}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-kaptan-muted"><FileBadge size={36} className="mx-auto mb-2 opacity-30" />Henüz U-ETDS beyanı bulunmuyor</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Yeni U-ETDS Beyanı</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Plaka *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">İşlem Türü</label><select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.transactionType} onChange={e => setForm({...form, transactionType: e.target.value})}><option>YURTICI_YUK</option><option>YURTICI_BOS</option><option>YURTDISI_CIKIS</option><option>YURTDISI_GIRIS</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Sürücü Adı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Sürücü TCKN</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.driverTC} onChange={e => setForm({...form, driverTC: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Çıkış Noktası *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Varış Noktası *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Tarih *</label><input type="date" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Yük Cinsi</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.cargoType} onChange={e => setForm({...form, cargoType: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Ağırlık (ton)</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">{saving ? 'Gönderiliyor...' : 'Beyanı Gönder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
