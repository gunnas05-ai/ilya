'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Wrench, Tag, MapPin, Package, Truck, Shield, Phone, MessageSquare } from 'lucide-react';

const CONDITION_LABELS: Record<string, string> = { new: 'Sıfır', like_new: 'Az Kullanılmış', used: 'Kullanılmış', refurbished: 'Yenilenmiş', for_parts: 'Parça Amaçlı' };

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [msgSent, setMsgSent] = useState(false);

  useEffect(() => {
    api.get(`/part-market/listings/${id}`).then(r => setListing(r.data?.data || r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleSendMsg = async () => {
    if (!msgText.trim()) return;
    try {
      await api.post(`/part-market/listings/${id}/message`, { message: msgText.trim() });
      setMsgSent(true); setMsgText('');
    } catch { alert('Mesaj gönderilemedi'); }
  };

  if (loading) return <div className="p-6"><div className="h-64 bg-kaptan-card animate-pulse rounded" /></div>;
  if (!listing) return <div className="p-6 text-center text-kaptan-muted">İlan bulunamadı</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text"><ArrowLeft size={18} /> Geri</button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="kaptan-card p-6">
            <h1 className="text-xl font-bold text-kaptan-text">{listing.title}</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/20 text-kaptan-primary">{CONDITION_LABELS[listing.condition] || listing.condition}</span>
              {listing.brand && <span className="px-2 py-0.5 rounded text-xs bg-kaptan-card border border-kaptan-border text-kaptan-muted">{listing.brand}</span>}
              {listing.model && <span className="px-2 py-0.5 rounded text-xs bg-kaptan-card border border-kaptan-border text-kaptan-muted">{listing.model}</span>}
              {listing.partNumber && <span className="px-2 py-0.5 rounded text-xs bg-kaptan-card border border-kaptan-border text-kaptan-muted">#{listing.partNumber}</span>}
            </div>
          </div>

          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-4">Detaylar</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {listing.brand && <D label="Marka" value={listing.brand} />}
              {listing.model && <D label="Model" value={listing.model} />}
              {listing.partNumber && <D label="Parça No" value={listing.partNumber} />}
              {listing.city && <D label="Konum" value={listing.city} />}
              {listing.warranty !== undefined && <D label="Garanti" value={listing.warranty ? `${listing.warrantyMonths || 3} ay` : 'Yok'} />}
              {listing.shippingAvailable !== undefined && <D label="Kargo" value={listing.shippingAvailable ? `${listing.shippingPrice || 0} ₺` : 'Yok'} />}
            </div>
            {listing.description && <p className="mt-4 text-kaptan-muted text-sm border-t border-kaptan-border pt-4">{listing.description}</p>}
          </div>

          {msgSent && <div className="p-3 bg-kaptan-success/20 text-kaptan-success rounded-lg text-sm">Mesaj gönderildi!</div>}
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-3 flex items-center gap-2"><MessageSquare size={18} /> Mesaj Gönder</h3>
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)} className="w-full px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text text-sm" rows={3} placeholder="Satıcıya mesajınız..." />
            <button onClick={handleSendMsg} className="mt-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold">Gönder</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="kaptan-card p-6 text-center">
            <p className="text-3xl font-bold text-kaptan-primary">{(listing.price || 0).toLocaleString('tr-TR')} ₺</p>
            <button onClick={() => router.push(`/part-market/transaction?id=${id}`)} className="w-full mt-4 py-2.5 bg-kaptan-success text-white rounded-lg font-semibold">Satın Al</button>
          </div>
          {listing.condition && <div className="kaptan-card p-4"><p className="text-xs text-kaptan-muted mb-1">Durum</p><p className="text-kaptan-text font-semibold">{CONDITION_LABELS[listing.condition] || listing.condition}</p></div>}
        </div>
      </div>
    </div>
  );
}

function D({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-muted text-xs">{label}</p><p className="text-kaptan-text font-semibold">{value}</p></div>;
}
