'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Shield, Truck, Banknote } from 'lucide-react';

function PartTransactionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get('id');
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!listingId) { setLoading(false); return; }
    api.get(`/part-market/listings/${listingId}`).then(r => setListing(r.data?.data || r.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, [listingId]);

  const handleBuy = async () => {
    if (!listingId || !listing) return;
    setBuying(true);
    try { await api.post('/part-market/transactions', { listingId }); alert('Satın alma işlemi başlatıldı! Escrow koruması aktif.'); router.push('/wallet'); }
    catch { alert('İşlem başarısız'); }
    setBuying(false);
  };

  if (loading) return <div className="p-6"><div className="h-48 bg-kaptan-card animate-pulse rounded" /></div>;
  if (!listingId || !listing) return <div className="p-6 text-center text-kaptan-muted">İlan bulunamadı</div>;

  const total = (listing.price || 0) + (listing.shippingPrice || 0);

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <button onClick={()=>router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text"><ArrowLeft size={18} /> Geri</button>
      <h1 className="text-2xl font-bold text-kaptan-text">Satın Alma Özeti</h1>

      <div className="kaptan-card p-6 space-y-3">
        <h3 className="font-bold text-kaptan-text">{listing.title}</h3>
        <div className="space-y-2 text-sm border-t border-kaptan-border pt-3">
          <Row label="Ürün Fiyatı" value={listing.price || 0} />
          {listing.shippingPrice > 0 && <Row label="Kargo" value={listing.shippingPrice} />}
          <div className="border-t border-kaptan-border pt-2 mt-2"><Row label="Toplam" value={total} bold /></div>
        </div>
      </div>

      <div className="kaptan-card p-4 border-l-4 border-kaptan-info bg-kaptan-info/5">
        <div className="flex items-center gap-2 text-kaptan-info font-semibold mb-1"><Shield size={18} /> Escrow Koruması</div>
        <p className="text-kaptan-muted text-xs">Ödemeniz teslimat onaylanana kadar escrow'da güvende tutulur. Satıcı ürünü göndermezse tam iade alırsınız.</p>
      </div>

      <button onClick={handleBuy} disabled={buying} className="w-full py-3 bg-kaptan-success text-white rounded-xl font-semibold text-lg disabled:opacity-50">
        {buying ? 'İşleniyor...' : `${total.toLocaleString('tr-TR')} ₺ Öde`}
      </button>
    </div>
  );
}

export default function PartTransactionPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-48 skeleton rounded" /></div>}>
      <PartTransactionContent />
    </Suspense>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return <div className="flex justify-between"><span className="text-kaptan-muted">{label}</span><span className={`${bold?'text-kaptan-text font-bold text-lg':'text-kaptan-text'}`}>{value.toLocaleString('tr-TR')} ₺</span></div>;
}
