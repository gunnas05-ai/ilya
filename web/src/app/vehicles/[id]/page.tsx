'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Car, Calendar, Gauge, Palette, Fuel, Cog, Phone, User, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

const FUEL_LABELS: Record<string, string> = { benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG', elektrik: 'Elektrik', hibrit: 'Hibrit' };
const TRANS_LABELS: Record<string, string> = { manuel: 'Manuel', otomatik: 'Otomatik', yari_otomatik: 'Yarı Otomatik' };

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/vehicles/${id}`).then(r => setListing(r.data?.data || r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 space-y-4"><div className="h-8 bg-kaptan-card animate-pulse rounded w-1/3" /><div className="h-64 bg-kaptan-card animate-pulse rounded" /></div>;
  if (!listing) return <div className="p-6 text-center text-kaptan-muted">Araç bulunamadı</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text"><ArrowLeft size={18} /> Geri</button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Photo */}
          <div className="kaptan-card p-0 overflow-hidden rounded-xl border border-kaptan-border">
            {listing.photos?.[0]?.url ? <img src={listing.photos[0].url} className="w-full h-80 object-cover" /> :
            <div className="w-full h-80 bg-kaptan-dark flex items-center justify-center"><Car size={64} className="text-kaptan-muted" /></div>}
          </div>

          {/* Details */}
          <div className="kaptan-card p-6">
            <h2 className="text-lg font-bold text-kaptan-text mb-4">{listing.brand} {listing.model} — {listing.year}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Spec icon={Fuel} label="Yakıt" value={FUEL_LABELS[listing.fuelType] || listing.fuelType || '-'} />
              <Spec icon={Cog} label="Vites" value={TRANS_LABELS[listing.transmission] || listing.transmission || '-'} />
              <Spec icon={Gauge} label="Kilometre" value={`${(listing.mileage || 0).toLocaleString('tr-TR')} km`} />
              <Spec icon={Palette} label="Renk" value={listing.color || '-'} />
              <Spec icon={Calendar} label="Yıl" value={listing.year || '-'} />
              {listing.plate && <Spec icon={Car} label="Plaka" value={listing.plate} />}
              {listing.city && <Spec icon={MapPin} label="Konum" value={`${listing.city}${listing.district ? ' / '+listing.district : ''}`} />}
            </div>
            {listing.description && <p className="mt-4 text-kaptan-muted text-sm border-t border-kaptan-border pt-4">{listing.description}</p>}
          </div>

          {/* Accident History */}
          {listing.hasAccident && <div className="kaptan-card p-4 border-l-4 border-kaptan-warning"><div className="flex items-center gap-2 text-kaptan-warning font-semibold mb-1"><AlertTriangle size={18} /> Kaza Geçmişi</div><p className="text-kaptan-muted text-sm">{listing.accidentDetail || 'Kaza kaydı mevcut'}</p></div>}

          {/* Contact */}
          <div className="kaptan-card p-6"><h3 className="font-bold text-kaptan-text mb-3 flex items-center gap-2"><Phone size={18} className="text-kaptan-primary" /> İletişim</h3><div className="space-y-2 text-sm"><p className="text-kaptan-muted flex items-center gap-2"><User size={14} /> {listing.contactName || listing.sellerName || 'Satıcı'}</p>{listing.contactPhone && <p className="text-kaptan-text">{listing.contactPhone}</p>}</div></div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="kaptan-card p-6 text-center">
            <p className="text-3xl font-bold text-kaptan-primary">{(listing.price || 0).toLocaleString('tr-TR')} ₺</p>
            <p className="text-kaptan-muted text-xs mt-1">{listing.isBarterAvailable ? 'Takas seçeneği mevcut' : 'Sabit fiyat'}</p>
            <button onClick={() => router.push(`/vehicles/${id}/sale`)} className="w-full mt-4 py-2.5 bg-kaptan-primary text-white rounded-lg font-semibold hover:opacity-90 transition">Satın Al / Teklif Ver</button>
          </div>
          {listing.vehicleType && <div className="kaptan-card p-4"><p className="text-xs text-kaptan-muted mb-1">Araç Tipi</p><p className="text-kaptan-text font-semibold">{listing.vehicleType}</p></div>}
        </div>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="p-3 bg-kaptan-dark rounded-lg"><Icon size={16} className="text-kaptan-primary mb-1" /><p className="text-kaptan-muted text-xs">{label}</p><p className="text-kaptan-text text-sm font-semibold">{value}</p></div>;
}
