'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

const STATUS_MAP: Record<string, string> = {
  pending: 'Bekliyor', countered: 'Karşı Teklif', accepted: 'Kabul Edildi',
  rejected: 'Reddedildi', expired: 'Süresi Doldu', escrow_locked: 'Escrow Blokede', payment_released: 'Ödendi',
};

export default function BidsPage() {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const [page, setPage] = useState(1);
  const PAGE = 20;
  const fetchBids = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bids');
      const data = res.data?.data?.data || res.data?.data || [];
      setBids(Array.isArray(data) ? data : []);
    } catch { setBids([]); }
    setLoading(false);
  };

  useEffect(() => { fetchBids(); }, []);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    if (!confirm(`Teklifi ${action === 'accept' ? 'kabul' : 'reddetmek'} istediğinize emin misiniz?`)) return;
    try {
      await api.put(`/bids/${id}/${action}`);
      fetchBids();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
  };

  const filtered = bids.filter((b: any) =>
    !search || b.loadTitle?.toLowerCase().includes(search.toLowerCase()) ||
    b.carrierName?.toLowerCase().includes(search.toLowerCase()) ||
    b.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Teklif Yönetimi</h2>
        <button onClick={fetchBids} className="text-sm text-kaptan-primary hover:underline">Yenile</button>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Yük, taşıyıcı veya durum ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, page * PAGE).map((bid: any) => (
                <div key={bid.id} className="glass-card p-4 hover:border-kaptan-primary/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-kaptan-text">{bid.loadTitle || 'Yük Teklifi'}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          bid.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          bid.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          bid.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>{STATUS_MAP[bid.status] || bid.status}</span>
                      </div>
                      <p className="text-sm text-kaptan-muted mt-1">
                        Taşıyıcı: <span className="text-kaptan-text">{bid.carrierName || 'Belirtilmemiş'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-kaptan-text">{Number(bid.price || 0).toLocaleString('tr-TR')} ₺</p>
                      {bid.platformCommission && <p className="text-xs text-kaptan-muted">Komisyon: {Number(bid.platformCommission).toLocaleString('tr-TR')} ₺</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setSelected(bid)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-muted hover:text-kaptan-text">
                      <Eye size={14} /> Detay
                    </button>
                    {bid.status === 'pending' && (
                      <>
                        <button onClick={() => handleAction(bid.id, 'accept')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-kaptan-success/20 text-kaptan-success rounded-lg hover:bg-kaptan-success/30">
                          <CheckCircle size={14} /> Kabul Et
                        </button>
                        <button onClick={() => handleAction(bid.id, 'reject')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-kaptan-danger/20 text-kaptan-danger rounded-lg hover:bg-kaptan-danger/30">
                          <XCircle size={14} /> Reddet
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-kaptan-muted">Henüz teklif bulunmuyor</div>
              )}
              {filtered.length > page * PAGE && (
                <button onClick={() => setPage(p => p + 1)} className="w-full py-2 glass-card text-kaptan-primary text-sm font-semibold hover:bg-kaptan-primary/10">
                  Daha Fazla Göster ({filtered.length - page * PAGE} kaldı)
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="glass-card p-4">
            <h3 className="font-semibold text-kaptan-text mb-3">Özet</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Toplam Teklif</span><span className="text-kaptan-text font-medium">{bids.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Bekleyen</span><span className="text-yellow-400 font-medium">{bids.filter(b => b.status === 'pending').length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Kabul Edilen</span><span className="text-green-400 font-medium">{bids.filter(b => b.status === 'accepted').length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Reddedilen</span><span className="text-red-400 font-medium">{bids.filter(b => b.status === 'rejected').length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Toplam Hacim</span><span className="text-kaptan-text font-medium">
                {bids.reduce((s: number, b: any) => s + Number(b.price || 0), 0).toLocaleString('tr-TR')} ₺
              </span></div>
            </div>
          </div>

          {selected && (
            <div className="glass-card p-4 mt-4">
              <h3 className="font-semibold text-kaptan-text mb-3">Teklif Detayı</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-kaptan-muted">Yük:</span> <span className="text-kaptan-text">{selected.loadTitle}</span></div>
                <div><span className="text-kaptan-muted">Taşıyıcı:</span> <span className="text-kaptan-text">{selected.carrierName}</span></div>
                <div><span className="text-kaptan-muted">Fiyat:</span> <span className="text-kaptan-text">{Number(selected.price || 0).toLocaleString('tr-TR')} ₺</span></div>
                <div><span className="text-kaptan-muted">Komisyon:</span> <span className="text-kaptan-muted">{Number(selected.platformCommission || 0).toLocaleString('tr-TR')} ₺</span></div>
                <div><span className="text-kaptan-muted">Net Kazanç:</span> <span className="text-kaptan-success">{(Number(selected.price || 0) - Number(selected.platformCommission || 0)).toLocaleString('tr-TR')} ₺</span></div>
                <div><span className="text-kaptan-muted">Durum:</span> <span className="text-kaptan-primary">{STATUS_MAP[selected.status] || selected.status}</span></div>
                {selected.note && <div><span className="text-kaptan-muted">Not:</span> <span className="text-kaptan-text">{selected.note}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
