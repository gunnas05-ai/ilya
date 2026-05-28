'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, QrCode, Clock, Shield, Plus, RefreshCw, Download, CheckCircle, XCircle, Copy } from 'lucide-react';

export default function QrPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ shipmentId: '', type: 'delivery', ttl: '15' });
  const [genResult, setGenResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/qr'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post('/qr/generate', genForm);
      setGenResult(res.data?.data);
      fetchData();
    } catch (err: any) { alert('QR oluşturma hatası: ' + (err.response?.data?.message || 'Bilinmeyen hata')); }
    setGenerating(false);
  };

  const handleValidate = async (id: string) => {
    setValidating(id);
    try {
      await api.post('/qr/validate', { qrId: id });
      fetchData();
    } catch (err: any) { alert('Doğrulama hatası: ' + (err.response?.data?.message || 'Bilinmeyen hata')); }
    setValidating(null);
  };

  const filtered = items.filter((q: any) => !search || q.shipmentId?.toLowerCase().includes(search.toLowerCase()) || q.type?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: items.length,
    verified: items.filter(q => q.verified).length,
    active: items.filter(q => !q.verified && !q.expired).length,
    expired: items.filter(q => q.expired).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <QrCode size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">QR Kod Yönetimi</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline"><RefreshCw size={14} /> Yenile</button>
          <button onClick={() => { setShowGenerate(true); setGenResult(null); }}
            className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
            <Plus size={18} /> QR Oluştur
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam', value: stats.total, icon: QrCode, color: 'text-kaptan-primary' },
          { label: 'Doğrulanmış', value: stats.verified, icon: CheckCircle, color: 'text-kaptan-success' },
          { label: 'Aktif', value: stats.active, icon: Clock, color: 'text-kaptan-warning' },
          { label: 'Süresi Dolmuş', value: stats.expired, icon: XCircle, color: 'text-kaptan-danger' },
        ].map(s => (
          <div key={s.label} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-kaptan-muted">{s.label}</span>
              <s.icon size={20} className={s.color} />
            </div>
            <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Sevkiyat ID, QR tipi ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* QR Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-kaptan-card rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50">
              <tr className="border-b border-kaptan-border text-kaptan-muted">
                <th className="text-left p-3">QR ID</th>
                <th className="text-left p-3">Sevkiyat</th>
                <th className="text-left p-3">Tip</th>
                <th className="text-left p-3">Oluşturulma</th>
                <th className="text-left p-3">TTL</th>
                <th className="text-left p-3">Durum</th>
                <th className="text-left p-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q: any) => (
                <tr key={q.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                  <td className="p-3 font-mono text-xs text-kaptan-text">{q.id?.slice(0, 12)}...</td>
                  <td className="p-3 font-mono text-xs text-kaptan-muted">{q.shipmentId?.slice(0, 12) || '-'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/10 text-kaptan-primary">{q.type || 'delivery'}</span></td>
                  <td className="p-3 text-xs text-kaptan-muted">{q.createdAt ? new Date(q.createdAt).toLocaleString('tr-TR') : '-'}</td>
                  <td className="p-3 text-xs text-kaptan-muted">{q.ttl || '15 dk'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      q.verified ? 'bg-green-500/20 text-green-400' : q.expired ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>{q.verified ? 'Doğrulandı' : q.expired ? 'Süresi Doldu' : 'Aktif'}</span>
                  </td>
                  <td className="p-3">
                    {!q.verified && !q.expired && (
                      <button onClick={() => handleValidate(q.id)} disabled={validating === q.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-kaptan-success/20 text-kaptan-success rounded hover:bg-kaptan-success/30 disabled:opacity-50">
                        <Shield size={12} /> {validating === q.id ? '...' : 'Doğrula'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-kaptan-muted">
                  <QrCode size={40} className="mx-auto mb-2 opacity-20" />Henüz QR kod bulunmuyor
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">QR Kod Oluştur</h3>
            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Sevkiyat ID *</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm"
                  required value={genForm.shipmentId} onChange={e => setGenForm({...genForm, shipmentId: e.target.value})}
                  placeholder="örn: SHP-2025-001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">QR Tipi</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm"
                    value={genForm.type} onChange={e => setGenForm({...genForm, type: e.target.value})}>
                    <option value="delivery">Teslimat</option>
                    <option value="pickup">Yükleme</option>
                    <option value="checkpoint">Ara Kontrol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Geçerlilik (dk)</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm"
                    value={genForm.ttl} onChange={e => setGenForm({...genForm, ttl: e.target.value})}>
                    <option value="5">5 dk</option><option value="15">15 dk</option><option value="30">30 dk</option><option value="60">60 dk</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => setShowGenerate(false)}
                  className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">
                  <QrCode size={16} /> {generating ? 'Oluşturuluyor...' : 'QR Oluştur'}
                </button>
              </div>
            </form>

            {genResult && (
              <div className="mt-4 p-4 bg-kaptan-dark rounded-xl text-center">
                <div className="w-40 h-40 mx-auto bg-white rounded-xl flex items-center justify-center mb-3">
                  <QrCode size={100} className="text-gray-900" />
                </div>
                <p className="text-sm text-kaptan-text font-mono">{genResult.id?.slice(0, 20)}...</p>
                <p className="text-xs text-kaptan-success mt-1">QR kod başarıyla oluşturuldu</p>
                <div className="flex gap-2 justify-center mt-3">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-kaptan-primary/20 text-kaptan-primary rounded-lg"><Download size={12} /> İndir</button>
                  <button onClick={() => { navigator.clipboard.writeText(genResult.id || ''); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-kaptan-border text-kaptan-muted rounded-lg"><Copy size={12} /> Kopyala</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
