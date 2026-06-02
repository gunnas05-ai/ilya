'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, FileText, Trash2 } from 'lucide-react';

export default function CustomsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ declarationNo: '', goodsDescription: '', customsOffice: '', exporterName: '', importerName: '', hsCode: '', value: '', status: 'draft' });

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/customs'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/customs/declaration', form); setShowForm(false); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const filtered = items.filter((c: any) => !search || c.declarationNo?.toLowerCase().includes(search.toLowerCase()) || c.goodsDescription?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Gümrük Beyannameleri</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Beyanname Ekle</button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Beyanname no, açıklama ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}</div> : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Beyanname No</th><th className="text-left p-3">Eşya</th><th className="text-left p-3">GTİP</th><th className="text-left p-3">Gümrük</th><th className="text-left p-3">Değer</th><th className="text-left p-3">Durum</th></tr></thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                  <td className="p-3 font-mono text-xs text-kaptan-text">{c.declarationNo}</td>
                  <td className="p-3 text-kaptan-text">{c.goodsDescription}</td>
                  <td className="p-3 font-mono text-xs text-kaptan-muted">{c.hsCode}</td>
                  <td className="p-3 text-kaptan-muted">{c.customsOffice}</td>
                  <td className="p-3 text-kaptan-text">{Number(c.value || 0).toLocaleString('tr-TR')} {c.currency || 'TRY'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${c.status === 'approved' ? 'bg-green-500/20 text-green-400' : c.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{c.status}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-kaptan-muted">Beyanname bulunmuyor</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Yeni Beyanname</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Beyanname No *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.declarationNo} onChange={e => setForm({...form, declarationNo: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">GTİP Kodu</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.hsCode} onChange={e => setForm({...form, hsCode: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Eşya Tanımı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.goodsDescription} onChange={e => setForm({...form, goodsDescription: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">İhracatçı</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.exporterName} onChange={e => setForm({...form, exporterName: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">İthalatçı</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.importerName} onChange={e => setForm({...form, importerName: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Gümrük Ofisi</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.customsOffice} onChange={e => setForm({...form, customsOffice: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Değer</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.value} onChange={e => setForm({...form, value: e.target.value})} /></div>
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
