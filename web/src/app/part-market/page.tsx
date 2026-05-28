'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Wrench, Package, DollarSign, AlertTriangle, Search, Eye, Trash2, CheckCircle, XCircle, MessageSquare, Star, Plus, Save } from 'lucide-react';

const PART_CATEGORIES = ['motor', 'yuruyen', 'lastik', 'elektrik', 'kaporta', 'sogutma', 'dorse', 'aksesuar'];

export default function PartMarketPage() {
  const [tab, setTab] = useState<'listings' | 'offers' | 'disputes' | 'transactions' | 'reviews'>('listings');
  const [listings, setListings] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', category: 'motor', brand: '', model: '', price: '', condition: 'İkinci El', description: '', location: '', contactPhone: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lRes, oRes, dRes, tRes, rRes] = await Promise.all([
        api.get('/part-market').catch(() => ({ data: { data: [] } })),
        api.get('/part-market/offers').catch(() => ({ data: { data: [] } })),
        api.get('/part-market/disputes').catch(() => ({ data: { data: [] } })),
        api.get('/part-market/transactions').catch(() => ({ data: { data: [] } })),
        api.get('/part-market/reviews').catch(() => ({ data: { data: [] } })),
      ]);
      setListings(Array.isArray(lRes.data?.data?.data || lRes.data?.data) ? (lRes.data?.data?.data || lRes.data?.data) : []);
      setOffers(Array.isArray(oRes.data?.data?.data || oRes.data?.data) ? (oRes.data?.data?.data || oRes.data?.data) : []);
      setDisputes(Array.isArray(dRes.data?.data?.data || dRes.data?.data) ? (dRes.data?.data?.data || dRes.data?.data) : []);
      setTransactions(Array.isArray(tRes.data?.data?.data || tRes.data?.data) ? (tRes.data?.data?.data || tRes.data?.data) : []);
      setReviews(Array.isArray(rRes.data?.data?.data || rRes.data?.data) ? (rRes.data?.data?.data || rRes.data?.data) : []);
    } catch { setListings([]); setOffers([]); setDisputes([]); setTransactions([]); setReviews([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/part-market/${type}/${id}`); fetchData(); } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
  };

  const handleDisputeResolve = async (id: string, resolution: string) => {
    if (!confirm(`İhtilafı "${resolution}" olarak çözmek istediğinize emin misiniz?`)) return;
    try { await api.post(`/part-market/disputes/${id}/resolve`, { resolution }); fetchData(); } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
  };

  const tabs = [
    { key: 'listings' as const, label: 'İlanlar', count: listings.length, icon: Package, color: 'text-kaptan-primary' },
    { key: 'offers' as const, label: 'Teklifler', count: offers.length, icon: DollarSign, color: 'text-kaptan-warning' },
    { key: 'disputes' as const, label: 'İhtilaflar', count: disputes.length, icon: AlertTriangle, color: 'text-kaptan-danger' },
    { key: 'transactions' as const, label: 'İşlemler', count: transactions.length, icon: CheckCircle, color: 'text-kaptan-success' },
    { key: 'reviews' as const, label: 'Yorumlar', count: reviews.length, icon: Star, color: 'text-yellow-400' },
  ];

  const renderTabContent = () => {
    if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-kaptan-dark rounded-lg animate-pulse" />)}</div>;

    switch (tab) {
      case 'listings':
        return listings.length === 0 ? <p className="text-kaptan-muted text-center py-6">İlan bulunmuyor</p> : (
          <div className="space-y-2">
            {listings.filter((l: any) => !search || l.title?.toLowerCase().includes(search.toLowerCase())).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between bg-kaptan-dark rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Wrench size={16} className="text-kaptan-primary" />
                  <div>
                    <span className="text-sm text-kaptan-text font-medium">{l.title}</span>
                    <span className="text-xs text-kaptan-muted ml-2">{l.category} • {l.brand} • {l.condition}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-kaptan-text font-medium">{Number(l.price || 0).toLocaleString('tr-TR')} ₺</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${l.status === 'active' ? 'bg-green-500/10 text-green-400' : l.status === 'sold' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{l.status}</span>
                  <button onClick={() => handleDelete('listings', l.id)} className="p-1 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'offers':
        return offers.length === 0 ? <p className="text-kaptan-muted text-center py-6">Teklif bulunmuyor</p> : (
          <div className="space-y-2">
            {offers.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between bg-kaptan-dark rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <DollarSign size={16} className="text-kaptan-warning" />
                  <div>
                    <span className="text-sm text-kaptan-text">{o.listingTitle || 'İlan'}</span>
                    <span className="text-xs text-kaptan-muted ml-2">{o.buyerName || 'Alıcı'} → {Number(o.price || 0).toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'accepted' ? 'bg-green-500/10 text-green-400' : o.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{o.status}</span>
              </div>
            ))}
          </div>
        );

      case 'disputes':
        return disputes.length === 0 ? <p className="text-kaptan-muted text-center py-6">İhtilaf bulunmuyor</p> : (
          <div className="space-y-2">
            {disputes.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between bg-kaptan-dark rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} className="text-kaptan-danger" />
                  <div>
                    <span className="text-sm text-kaptan-text">{d.reason || 'İhtilaf'}</span>
                    <span className="text-xs text-kaptan-muted ml-2">{Number(d.amount || 0).toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {d.status === 'open' && (
                    <>
                      <button onClick={() => handleDisputeResolve(d.id, 'release')} className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded hover:bg-green-500/20">Release</button>
                      <button onClick={() => handleDisputeResolve(d.id, 'refund')} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">Refund</button>
                    </>
                  )}
                  {d.status !== 'open' && <span className="text-xs text-kaptan-success">Çözüldü</span>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'transactions':
        return transactions.length === 0 ? <p className="text-kaptan-muted text-center py-6">İşlem bulunmuyor</p> : (
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between bg-kaptan-dark rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-kaptan-success" />
                  <div>
                    <span className="text-sm text-kaptan-text">{t.listingTitle || 'İşlem'}</span>
                    <span className="text-xs text-kaptan-muted ml-2">{t.buyerName} → {t.sellerName}</span>
                  </div>
                </div>
                <span className="text-kaptan-text font-medium">{Number(t.amount || 0).toLocaleString('tr-TR')} ₺</span>
              </div>
            ))}
          </div>
        );

      case 'reviews':
        return reviews.length === 0 ? <p className="text-kaptan-muted text-center py-6">Yorum bulunmuyor</p> : (
          <div className="space-y-2">
            {reviews.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-kaptan-dark rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Star size={16} className="text-yellow-400" />
                  <div>
                    <span className="text-sm text-kaptan-text">{r.reviewerName}</span>
                    <span className="text-yellow-400 ml-1">{'★'.repeat(r.rating || 0)}</span>
                    <p className="text-xs text-kaptan-muted">{r.text?.slice(0, 80)}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete('reviews', r.id)} className="p-1 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Wrench size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">Yedek Parça Pazarı</h2></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-1 bg-kaptan-primary text-white px-3 py-2 rounded-lg text-sm hover:bg-kaptan-primary/90"><Plus size={14} /> İlan Ekle</button>
          <button onClick={fetchData} className="text-sm text-kaptan-primary hover:underline self-center">Yenile</button>
        </div>
      </div>

      {/* Kategori özeti */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PART_CATEGORIES.map(cat => (
          <span key={cat} className="text-xs px-2 py-1 rounded-full bg-kaptan-card border border-kaptan-border text-kaptan-muted">{cat}</span>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted hover:text-kaptan-text'}`}>
            <t.icon size={14} className={tab === t.key ? '' : t.color} /> {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-kaptan-dark'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {renderTabContent()}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Yeni Parça İlanı</h3>
            <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await api.post('/part-market', createForm); setShowCreateForm(false); setCreateForm({ title: '', category: 'motor', brand: '', model: '', price: '', condition: 'İkinci El', description: '', location: '', contactPhone: '' }); fetchData(); } catch(err: any) { alert(err.response?.data?.message || 'Hata'); } setSaving(false); }} className="space-y-3">
              <div><label className="block text-xs text-kaptan-muted mb-1">Başlık *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" required value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-kaptan-muted mb-1">Kategori</label><select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})}>{PART_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="block text-xs text-kaptan-muted mb-1">Marka</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={createForm.brand} onChange={e => setCreateForm({...createForm, brand: e.target.value})} /></div>
                <div><label className="block text-xs text-kaptan-muted mb-1">Model/Parça No</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={createForm.model} onChange={e => setCreateForm({...createForm, model: e.target.value})} /></div>
                <div><label className="block text-xs text-kaptan-muted mb-1">Fiyat (₺) *</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" required value={createForm.price} onChange={e => setCreateForm({...createForm, price: e.target.value})} /></div>
                <div><label className="block text-xs text-kaptan-muted mb-1">Durum</label><select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={createForm.condition} onChange={e => setCreateForm({...createForm, condition: e.target.value})}><option>İkinci El</option><option>Sıfır</option><option>Yenilenmiş</option></select></div>
                <div><label className="block text-xs text-kaptan-muted mb-1">Konum</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={createForm.location} onChange={e => setCreateForm({...createForm, location: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs text-kaptan-muted mb-1">Açıklama</label><textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" rows={2} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted text-sm">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"><Save size={14} />{saving ? '...' : 'Yayınla'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
