'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, Settings, CheckCircle, XCircle } from 'lucide-react';

const ERP_TYPES = ['Logo', 'Netis', 'Mikro', 'SAP', 'Oracle', 'Workcube', 'Diger'];

export default function ErpPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', erpType: '', baseUrl: '', apiKey: '', isActive: true });

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/erp-integration'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/erp-integration/${editing.id}`, form);
      else await api.post('/erp-integration', form);
      setShowForm(false); setEditing(null); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/erp-integration/${id}`); fetchData(); } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">ERP Entegrasyonları</h2>
        <button onClick={() => { setForm({ name: '', erpType: '', baseUrl: '', apiKey: '', isActive: true }); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> ERP Bağlantısı Ekle</button>
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {items.map((e: any) => (
            <div key={e.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Settings size={20} className={e.isActive ? 'text-kaptan-primary' : 'text-kaptan-muted'} />
                  <div>
                    <h3 className="font-medium text-kaptan-text">{e.name}</h3>
                    <p className="text-xs text-kaptan-muted">{e.erpType} • {e.baseUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{e.isActive ? <CheckCircle size={16} className="text-kaptan-success" /> : <XCircle size={16} className="text-kaptan-danger" />}</span>
                  <button onClick={() => { setForm({ name: e.name, erpType: e.erpType, baseUrl: e.baseUrl, apiKey: '', isActive: e.isActive }); setEditing(e); setShowForm(true); }}
                    className="p-1 hover:bg-kaptan-primary/20 rounded text-kaptan-primary text-xs">Düzenle</button>
                  <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-center py-12 text-kaptan-muted">ERP bağlantısı bulunmuyor</div>}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'ERP Düzenle' : 'Yeni ERP Bağlantısı'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">Bağlantı Adı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">ERP Türü *</label>
                <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.erpType} onChange={e => setForm({...form, erpType: e.target.value})}>
                  <option value="">Seçiniz</option>{ERP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Base URL</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.baseUrl} onChange={e => setForm({...form, baseUrl: e.target.value})} /></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">API Key</label><input type="password" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})} /></div>
              <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Aktif</label>
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
