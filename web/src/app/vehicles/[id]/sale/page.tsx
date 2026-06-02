'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Car, Banknote, Gavel, Calendar, Clock } from 'lucide-react';

export default function VehicleSalePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [saleType, setSaleType] = useState<'fixed' | 'auction'>('fixed');
  const [price, setPrice] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [auctionDays, setAuctionDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (saleType === 'fixed' && (!price || parseFloat(price) <= 0)) { alert('Geçerli bir fiyat giriniz'); return; }
    if (saleType === 'auction' && (!startingBid || parseFloat(startingBid) <= 0)) { alert('Başlangıç fiyatı giriniz'); return; }
    setSubmitting(true);
    try {
      const payload = saleType === 'fixed'
        ? { vehicleId: id, saleType: 'fixed', price: parseFloat(price) }
        : { vehicleId: id, saleType: 'auction', startingBid: parseFloat(startingBid), reservePrice: parseFloat(reservePrice) || undefined, buyNowPrice: parseFloat(buyNowPrice) || undefined, auctionDays: parseInt(auctionDays) };
      await api.post('/listings', payload);
      alert(saleType === 'fixed' ? 'Araç satışa çıkarıldı!' : 'Açık artırma başlatıldı!');
      router.push('/vehicles');
    } catch (e: any) { alert(e.response?.data?.message || 'İşlem başarısız'); }
    setSubmitting(false);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text mb-6"><ArrowLeft size={18} /> Geri</button>

      <h1 className="text-2xl font-bold text-kaptan-text mb-6 flex items-center gap-2"><Car size={24} className="text-kaptan-primary" /> Araç Satış Yapılandırması</h1>

      <div className="kaptan-card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setSaleType('fixed')} className={`py-3 rounded-xl font-semibold text-sm border transition ${saleType==='fixed'?'bg-kaptan-primary text-white border-kaptan-primary':'bg-kaptan-card text-kaptan-muted border-kaptan-border'}`}><Banknote size={16} className="inline mr-1" /> Sabit Fiyat</button>
          <button onClick={() => setSaleType('auction')} className={`py-3 rounded-xl font-semibold text-sm border transition ${saleType==='auction'?'bg-kaptan-primary text-white border-kaptan-primary':'bg-kaptan-card text-kaptan-muted border-kaptan-border'}`}><Gavel size={16} className="inline mr-1" /> Açık Artırma</button>
        </div>

        {saleType === 'fixed' ? (
          <div><label className="text-kaptan-muted text-sm">Satış Fiyatı (₺)</label><input type="number" value={price} onChange={e=>setPrice(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text" placeholder="0" /></div>
        ) : (
          <div className="space-y-4">
            <div><label className="text-kaptan-muted text-sm">Başlangıç Fiyatı (₺)</label><input type="number" value={startingBid} onChange={e=>setStartingBid(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text" placeholder="0" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-kaptan-muted text-sm">Rezerv Fiyat (ops.)</label><input type="number" value={reservePrice} onChange={e=>setReservePrice(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text" /></div>
              <div><label className="text-kaptan-muted text-sm">Hemen Al (ops.)</label><input type="number" value={buyNowPrice} onChange={e=>setBuyNowPrice(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text" /></div>
            </div>
            <div><label className="text-kaptan-muted text-sm">Süre (gün)</label><select value={auctionDays} onChange={e=>setAuctionDays(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text">{['1','3','5','7'].map(d=><option key={d} value={d}>{d} gün</option>)}</select></div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-kaptan-success text-white rounded-xl font-semibold text-lg disabled:opacity-50">
          {submitting ? 'İşleniyor...' : saleType === 'fixed' ? 'Satışa Çıkar' : 'İhaleyi Başlat'}
        </button>
      </div>
    </div>
  );
}
