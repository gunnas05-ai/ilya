'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, MapPin, Truck, Package, Shield, Calendar, Phone, User, Timer, Banknote, Gavel, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Zap } from 'lucide-react';

const LOAD_TYPE_LABELS: Record<string, string> = {
  tam_yuk: 'Tam Yük', kismi_yuk: 'Kısmi Yük', evden_eve: 'Evden Eve', sehir_ici: 'Şehir İçi',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor', active: 'Aktif', in_transit: 'Yolda', delivered: 'Teslim Edildi', completed: 'Tamamlandı', cancelled: 'İptal',
};

export default function LoadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loadId = params.id as string;

  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [routeRate, setRouteRate] = useState<any>(null);
  const [instantBookStatus, setInstantBookStatus] = useState<any>(null);

  // Bid form
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNote, setBidNote] = useState('');
  const [bidDays, setBidDays] = useState('1');
  const [bidReturnLoad, setBidReturnLoad] = useState(false);
  const [bidEscrow, setBidEscrow] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);

  // Instant book
  const [instantBooking, setInstantBooking] = useState(false);
  const [bookLocked, setBookLocked] = useState(false);

  useEffect(() => {
    if (!loadId) return;
    setLoading(true);
    api.get(`/loads/${loadId}`)
      .then(r => setLoad(r.data?.data || r.data))
      .catch(() => setError('Yük bilgisi yüklenemedi.'))
      .finally(() => setLoading(false));

    api.get(`/bids/load/${loadId}`)
      .then(r => setBids(r.data?.data || r.data || []))
      .catch(() => setBids([]))
      .finally(() => setBidsLoading(false));

    api.get(`/rates/route?from=${load?.fromCity || ''}&to=${load?.toCity || ''}`)
      .then(r => setRouteRate(r.data?.data || r.data))
      .catch(() => {});

    api.get(`/instant-book/${loadId}/status`)
      .then(r => setInstantBookStatus(r.data?.data || r.data))
      .catch(() => {});
  }, [loadId]);

  const handleBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) { alert('Geçerli bir teklif tutarı giriniz.'); return; }
    setSubmittingBid(true);
    try {
      await api.post('/bids', {
        loadId,
        amount: parseFloat(bidAmount),
        note: bidNote,
        estimatedDeliveryDays: parseInt(bidDays),
        hasReturnLoad: bidReturnLoad,
        requestEscrow: bidEscrow,
      });
      setBidSuccess(true);
      setShowBidForm(false);
      const r = await api.get(`/bids/load/${loadId}`);
      setBids(r.data?.data || r.data || []);
    } catch { alert('Teklif gönderilemedi.'); }
    finally { setSubmittingBid(false); }
  };

  const handleInstantBook = async () => {
    setInstantBooking(true);
    try {
      await api.post(`/instant-book/${loadId}/book`);
      setBookLocked(true);
      alert('Yük rezerve edildi! 5 dakika içinde onaylamanız gerekiyor.');
      const r = await api.get(`/instant-book/${loadId}/status`);
      setInstantBookStatus(r.data?.data || r.data);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Rezervasyon başarısız.');
    } finally { setInstantBooking(false); }
  };

  const handleConfirmBook = async () => {
    try {
      await api.post(`/instant-book/${loadId}/confirm`);
      alert('Rezervasyon onaylandı! Yük size atandı.');
      router.push('/loads');
    } catch { alert('Onay başarısız.'); }
  };

  const handleReleaseBook = async () => {
    try {
      await api.post(`/instant-book/${loadId}/release`);
      setBookLocked(false);
      setInstantBookStatus(null);
    } catch { alert('Serbest bırakma başarısız.'); }
  };

  const bidSummary = useMemo(() => {
    if (!bids.length) return null;
    const amounts = bids.map((b: any) => b.amount || 0);
    return {
      count: bids.length,
      avg: amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    };
  }, [bids]);

  const priceBreakdown = useMemo(() => {
    const price = load?.totalPrice || load?.price || 0;
    const commission = price * 0.05;
    const escrowFee = load?.escrow ? price * 0.02 : 0;
    const vat = price * 0.20;
    return { price, commission, escrowFee, vat, net: price - commission - escrowFee };
  }, [load]);

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-kaptan-card rounded w-1/3" /><div className="h-64 bg-kaptan-card rounded" /></div></div>;
  if (error) return <div className="p-6 text-center"><AlertTriangle className="mx-auto mb-2 text-kaptan-danger" size={48} /><p className="text-kaptan-muted">{error}</p><button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-kaptan-primary text-white rounded-lg">Geri Dön</button></div>;
  if (!load) return null;

  const canBook = instantBookStatus?.available && !bookLocked;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-kaptan-card rounded-lg"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-kaptan-text">{load.title || 'Yük Detayı'}</h1>
            <p className="text-kaptan-muted text-sm">{LOAD_TYPE_LABELS[load.loadType] || load.loadType} • {load.fromCity || load.originCity} → {load.toCity || load.destCity}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${load.status === 'active' ? 'bg-kaptan-success/20 text-kaptan-success' : load.status === 'pending' ? 'bg-kaptan-warning/20 text-kaptan-warning' : 'bg-kaptan-muted/20 text-kaptan-muted'}`}>
          {STATUS_LABELS[load.status] || load.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Load details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Card */}
          <div className="kaptan-card p-6">
            <h2 className="text-lg font-bold text-kaptan-text mb-4 flex items-center gap-2"><MapPin size={20} className="text-kaptan-primary" /> Güzergah</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 bg-kaptan-dark rounded-lg">
                <p className="text-kaptan-muted text-xs">Kalkış</p>
                <p className="text-kaptan-text font-bold">{load.fromCity || load.originCity}{load.fromDistrict ? ` / ${load.fromDistrict}` : ''}</p>
                <p className="text-kaptan-muted text-sm">{load.originAddress || load.fromAddress}</p>
                <p className="text-kaptan-muted text-xs mt-2">{load.pickupDate ? new Date(load.pickupDate).toLocaleDateString('tr-TR') : '-'} {load.pickupTime || ''}</p>
              </div>
              <div className="text-kaptan-primary text-2xl">→</div>
              <div className="flex-1 p-4 bg-kaptan-dark rounded-lg">
                <p className="text-kaptan-muted text-xs">Varış</p>
                <p className="text-kaptan-text font-bold">{load.toCity || load.destCity}{load.toDistrict ? ` / ${load.toDistrict}` : ''}</p>
                <p className="text-kaptan-muted text-sm">{load.destAddress || load.toAddress}</p>
                <p className="text-kaptan-muted text-xs mt-2">{load.deliveryDate ? new Date(load.deliveryDate).toLocaleDateString('tr-TR') : '-'} {load.deliveryTime || ''}</p>
              </div>
            </div>
          </div>

          {/* Load Specs */}
          <div className="kaptan-card p-6">
            <h2 className="text-lg font-bold text-kaptan-text mb-4 flex items-center gap-2"><Package size={20} className="text-kaptan-primary" /> Yük Detayları</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {load.vehicleType && <Spec label="Araç Tipi" value={load.vehicleType} />}
              {load.trailerType && <Spec label="Dorse" value={load.trailerType} />}
              {load.totalWeight && <Spec label="Ağırlık" value={`${load.totalWeight} ton`} />}
              {load.tonnage && <Spec label="Tonaj" value={`${load.tonnage} ton`} />}
              {load.volume && <Spec label="Hacim" value={`${load.volume} m³`} />}
              {load.partCount && <Spec label="Parça" value={`${load.partCount} adet`} />}
              {load.coldChain !== undefined && <Spec label="Soğuk Zincir" value={load.coldChain ? '✅ Var' : '❌ Yok'} />}
              {load.urgency && <Spec label="Aciliyet" value={load.urgency} />}
            </div>
            {load.description && <p className="mt-4 text-kaptan-muted text-sm border-t border-kaptan-border pt-4">{load.description}</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {load.escrow && <span className="px-3 py-1 bg-kaptan-info/20 text-kaptan-info rounded-full text-sm flex items-center gap-1"><Shield size={14} /> Escrow Korumalı</span>}
            {load.insurance && <span className="px-3 py-1 bg-kaptan-success/20 text-kaptan-success rounded-full text-sm">Sigortalı</span>}
            {load.isAuction && <span className="px-3 py-1 bg-kaptan-warning/20 text-kaptan-warning rounded-full text-sm flex items-center gap-1"><Gavel size={14} /> Açık Artırma</span>}
            {load.cod && <span className="px-3 py-1 bg-kaptan-ftl/20 text-kaptan-ftl rounded-full text-sm">Kapıda Ödeme</span>}
          </div>

          {/* Price Breakdown */}
          <div className="kaptan-card p-6">
            <h2 className="text-lg font-bold text-kaptan-text mb-4 flex items-center gap-2"><Banknote size={20} className="text-kaptan-primary" /> Fiyat Detayı</h2>
            <div className="space-y-2">
              <PriceRow label="Yük Bedeli" value={priceBreakdown.price} />
              <PriceRow label="Platform Komisyonu (%5)" value={priceBreakdown.commission} deduct />
              {priceBreakdown.escrowFee > 0 && <PriceRow label="Escrow Ücreti (%2)" value={priceBreakdown.escrowFee} deduct />}
              <PriceRow label="KDV (%20)" value={priceBreakdown.vat} />
              <div className="border-t border-kaptan-border pt-2 mt-2">
                <PriceRow label="Net Kazanç" value={priceBreakdown.net} bold />
              </div>
            </div>
          </div>

          {/* Bids Section */}
          <div className="kaptan-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-kaptan-text flex items-center gap-2"><TrendingUp size={20} className="text-kaptan-primary" /> Teklifler</h2>
              <button onClick={() => setShowBidForm(!showBidForm)} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:opacity-90 transition flex items-center gap-2">
                {showBidForm ? 'İptal' : 'Teklif Ver'}
              </button>
            </div>

            {bidSummary && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <MiniStat label="Teklif" value={bidSummary.count} />
                <MiniStat label="Ortalama" value={`${bidSummary.avg.toLocaleString('tr-TR')} ₺`} />
                <MiniStat label="En Düşük" value={`${bidSummary.min.toLocaleString('tr-TR')} ₺`} />
                <MiniStat label="En Yüksek" value={`${bidSummary.max.toLocaleString('tr-TR')} ₺`} />
              </div>
            )}

            {/* Bid Form */}
            {showBidForm && (
              <div className="mb-4 p-4 bg-kaptan-dark rounded-lg space-y-3">
                <div>
                  <label className="text-kaptan-muted text-sm">Teklif Tutarı (₺)</label>
                  <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-card border border-kaptan-border rounded-lg text-kaptan-text" placeholder="0" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-kaptan-muted text-sm">Tahmini Teslim (gün)</label>
                    <input type="number" value={bidDays} onChange={e => setBidDays(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-card border border-kaptan-border rounded-lg text-kaptan-text" />
                  </div>
                </div>
                <div>
                  <label className="text-kaptan-muted text-sm">Not</label>
                  <textarea value={bidNote} onChange={e => setBidNote(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-card border border-kaptan-border rounded-lg text-kaptan-text" rows={2} placeholder="Opsiyonel..." />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-kaptan-muted text-sm">
                    <input type="checkbox" checked={bidReturnLoad} onChange={e => setBidReturnLoad(e.target.checked)} className="rounded" /> Dönüş Yükü Var
                  </label>
                  <label className="flex items-center gap-2 text-kaptan-muted text-sm">
                    <input type="checkbox" checked={bidEscrow} onChange={e => setBidEscrow(e.target.checked)} className="rounded" /> Escrow Kullan
                  </label>
                </div>
                <button onClick={handleBid} disabled={submittingBid} className="w-full py-2 bg-kaptan-success text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
                  {submittingBid ? 'Gönderiliyor...' : 'Teklifi Gönder'}
                </button>
              </div>
            )}

            {bidSuccess && <div className="mb-4 p-3 bg-kaptan-success/20 text-kaptan-success rounded-lg flex items-center gap-2"><CheckCircle size={16} /> Teklifiniz başarıyla gönderildi!</div>}

            {/* Bids List */}
            {bidsLoading ? <div className="animate-pulse space-y-3"><div className="h-12 bg-kaptan-card rounded" /><div className="h-12 bg-kaptan-card rounded" /></div>
            : bids.length === 0 ? <p className="text-kaptan-muted text-center py-4">Henüz teklif verilmemiş.</p>
            : <div className="space-y-2">
              {bids.map((bid: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
                  <div>
                    <p className="text-kaptan-text font-semibold">{bid.carrierName || bid.carrier?.fullName || 'Taşıyıcı'}</p>
                    <p className="text-kaptan-muted text-xs">{bid.note || `${bid.estimatedDeliveryDays || 1} gün teslim`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-kaptan-text font-bold text-lg">{(bid.amount || 0).toLocaleString('tr-TR')} ₺</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${bid.status === 'accepted' ? 'bg-kaptan-success/20 text-kaptan-success' : bid.status === 'rejected' ? 'bg-kaptan-danger/20 text-kaptan-danger' : 'bg-kaptan-warning/20 text-kaptan-warning'}`}>
                      {bid.status === 'pending' ? 'Bekliyor' : bid.status === 'accepted' ? 'Kabul' : bid.status === 'rejected' ? 'Red' : bid.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        </div>

        {/* Right: Actions & Summary */}
        <div className="space-y-6">
          {/* Instant Book Card */}
          <div className="kaptan-card p-6">
            <h3 className="text-lg font-bold text-kaptan-text mb-3 flex items-center gap-2"><Zap size={20} className="text-kaptan-warning" /> Anında Rezervasyon</h3>
            {canBook ? (
              <div className="space-y-3">
                <p className="text-kaptan-muted text-sm">Bu yük anında rezervasyon için uygun. Teklif beklemeden hemen alabilirsiniz.</p>
                <p className="text-kaptan-text font-bold text-lg">{load.totalPrice?.toLocaleString('tr-TR') || load.price?.toLocaleString('tr-TR') || '0'} ₺</p>
                <button onClick={handleInstantBook} disabled={instantBooking} className="w-full py-2 bg-kaptan-success text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
                  {instantBooking ? 'Rezerve Ediliyor...' : 'Hemen Al'}
                </button>
              </div>
            ) : bookLocked ? (
              <div className="space-y-3">
                <div className="p-3 bg-kaptan-warning/20 text-kaptan-warning rounded-lg flex items-center gap-2"><Clock size={16} /> Rezervasyonunuz bekliyor. 5 dakika içinde onaylayın.</div>
                <div className="flex gap-2">
                  <button onClick={handleConfirmBook} className="flex-1 py-2 bg-kaptan-success text-white rounded-lg font-semibold">Onayla</button>
                  <button onClick={handleReleaseBook} className="flex-1 py-2 bg-kaptan-danger text-white rounded-lg font-semibold">Vazgeç</button>
                </div>
              </div>
            ) : (
              <p className="text-kaptan-muted text-sm">Bu yük için anında rezervasyon şu anda {instantBookStatus?.reason || 'mevcut değil'}.</p>
            )}
          </div>

          {/* Contact Card */}
          <div className="kaptan-card p-6">
            <h3 className="text-lg font-bold text-kaptan-text mb-3 flex items-center gap-2"><Phone size={20} className="text-kaptan-primary" /> İletişim</h3>
            {load.contactName && <p className="text-kaptan-text font-semibold flex items-center gap-2"><User size={14} /> {load.contactName}</p>}
            {load.contactPhone && <p className="text-kaptan-muted text-sm mt-1">{load.contactPhone}</p>}
            <p className="text-kaptan-muted text-sm mt-1 flex items-center gap-2"><Calendar size={14} /> {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString('tr-TR') : '-'}</p>
          </div>

          {/* Route Rate Card */}
          {routeRate && (
            <div className="kaptan-card p-6">
              <h3 className="text-lg font-bold text-kaptan-text mb-3 flex items-center gap-2"><TrendingUp size={20} className="text-kaptan-info" /> Piyasa Analizi</h3>
              <div className="space-y-2 text-sm">
                {routeRate.avg7Day && <p className="text-kaptan-muted">7 Günlük Ort: <span className="text-kaptan-text font-semibold">{Number(routeRate.avg7Day).toLocaleString('tr-TR')} ₺</span></p>}
                {routeRate.avg30Day && <p className="text-kaptan-muted">30 Günlük Ort: <span className="text-kaptan-text font-semibold">{Number(routeRate.avg30Day).toLocaleString('tr-TR')} ₺</span></p>}
                {routeRate.trend && <p className="text-kaptan-muted">Trend: <span className={routeRate.trend > 0 ? 'text-kaptan-danger' : 'text-kaptan-success'}>{routeRate.trend > 0 ? '📈' : '📉'} %{Math.abs(routeRate.trend)}</span></p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-kaptan-dark rounded-lg">
      <p className="text-kaptan-muted text-xs">{label}</p>
      <p className="text-kaptan-text font-semibold text-sm">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, deduct, bold }: { label: string; value: number; deduct?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-kaptan-muted">{label}</span>
      <span className={`${bold ? 'text-kaptan-text font-bold text-lg' : deduct ? 'text-kaptan-danger' : 'text-kaptan-text'}`}>
        {deduct ? '-' : ''}{value.toLocaleString('tr-TR')} ₺
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 bg-kaptan-dark rounded-lg text-center">
      <p className="text-kaptan-muted text-xs">{label}</p>
      <p className="text-kaptan-text font-bold text-sm">{value}</p>
    </div>
  );
}
