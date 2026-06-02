'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function PartOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const fetchData = () => {
    setLoading(true);
    const endpoint = tab === 'received' ? '/part-market/offers/received' : '/part-market/offers/my';
    api.get(endpoint).then(r => setOffers(Array.isArray(r.data?.data || r.data) ? (r.data?.data || r.data) : [])).catch(() => setOffers([])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [tab]);

  const handleAccept = async (id: string) => { if (!confirm('Teklifi kabul et?')) return; try { await api.put(`/part-market/offers/${id}/accept`); fetchData(); } catch { alert('İşlem başarısız'); } };
  const handleReject = async (id: string) => { if (!confirm('Teklifi reddet?')) return; try { await api.put(`/part-market/offers/${id}/reject`); fetchData(); } catch { alert('İşlem başarısız'); } };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><TrendingUp size={24} className="text-kaptan-primary" /> Teklifler</h1>
        <Link href="/part-market" className="text-sm text-kaptan-primary hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Pazara Dön</Link>
      </div>

      <div className="flex gap-2">
        {(['received','sent'] as const).map(t => <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab===t?'bg-kaptan-primary text-white':'bg-kaptan-card text-kaptan-muted'}`}>{t==='received'?'📥 Gelen':'📤 Verdiğim'}</button>)}
      </div>

      {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-kaptan-card animate-pulse rounded-lg" />)}</div>
      : offers.length === 0 ? <p className="text-center text-kaptan-muted py-12">Henüz teklif bulunmuyor</p>
      : <div className="space-y-3">
        {offers.map((o: any) => (
          <div key={o.id} className="kaptan-card p-4 flex items-center justify-between">
            <div>
              <p className="text-kaptan-text font-bold">{Number(o.amount).toLocaleString('tr-TR')} ₺</p>
              <p className="text-kaptan-muted text-xs">{o.listingTitle || o.partTitle || 'İlan'} • {o.buyerName || o.sellerName || ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs ${o.status==='accepted'?'bg-kaptan-success/20 text-kaptan-success':o.status==='rejected'?'bg-kaptan-danger/20 text-kaptan-danger':'bg-kaptan-warning/20 text-kaptan-warning'}`}>{o.status==='pending'?'Bekliyor':o.status==='accepted'?'Kabul':o.status==='rejected'?'Red':o.status}</span>
              {tab==='received' && o.status==='pending' && <div className="flex gap-1"><button onClick={()=>handleAccept(o.id)} className="p-1.5 rounded bg-kaptan-success/20 text-kaptan-success hover:bg-kaptan-success/40"><CheckCircle size={18} /></button><button onClick={()=>handleReject(o.id)} className="p-1.5 rounded bg-kaptan-danger/20 text-kaptan-danger hover:bg-kaptan-danger/40"><XCircle size={18} /></button></div>}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
