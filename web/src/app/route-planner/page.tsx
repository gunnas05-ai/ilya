'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MapPin, Fuel, Utensils, Navigation } from 'lucide-react';

const CENTER = { lat: 39.9334, lng: 32.8597 }; // Ankara

export default function RoutePlannerPage() {
  const [fuelStations, setFuelStations] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/fuel-stations?lat=${CENTER.lat}&lng=${CENTER.lng}&radius=50`).catch(()=>({data:[]})),
      api.get(`/restaurants?lat=${CENTER.lat}&lng=${CENTER.lng}&radius=50`).catch(()=>({data:[]})),
    ]).then(([fRes, rRes]) => {
      setFuelStations((Array.isArray(fRes.data?.data) ? fRes.data.data : Array.isArray(fRes.data) ? fRes.data : []).slice(0, 5));
      setRestaurants((Array.isArray(rRes.data?.data) ? rRes.data.data : Array.isArray(rRes.data) ? rRes.data : []).slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 grid grid-cols-2 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-32 bg-kaptan-card animate-pulse rounded-xl" />)}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><Navigation size={28} className="text-kaptan-primary" /> Rota Planlayıcı</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cheapest Fuel */}
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Fuel size={18} className="text-kaptan-warning" /> En Ucuz Akaryakıt (50km)</h3>
          {fuelStations.length === 0 ? <p className="text-kaptan-muted text-sm">Yakında istasyon bulunamadı</p>
          : <div className="space-y-3">
            {fuelStations.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
                <div><p className="text-kaptan-text font-semibold text-sm">{s.name}</p><p className="text-kaptan-muted text-xs">{s.brand} • {s.city}</p></div>
                <div className="text-right"><p className="text-kaptan-primary font-bold">{s.prices?.[0]?.price || s.motorin || '-'} ₺</p><p className="text-kaptan-muted text-xs">Motorin</p></div>
              </div>
            ))}
          </div>}
        </div>

        {/* Nearest Restaurants */}
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Utensils size={18} className="text-kaptan-success" /> En Yakın Tesisler (50km)</h3>
          {restaurants.length === 0 ? <p className="text-kaptan-muted text-sm">Yakında tesis bulunamadı</p>
          : <div className="space-y-3">
            {restaurants.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
                <div><p className="text-kaptan-text font-semibold text-sm">{r.name}</p><p className="text-kaptan-muted text-xs">{r.city} {r.hasTirParking ? '• 🅿️ TIR Parkı' : ''}</p></div>
                <div className="text-right"><p className="text-kaptan-warning font-bold">⭐ {r.averageRating?.toFixed(1) || '-'}</p><p className="text-kaptan-muted text-xs">{r.capacity || '-'} kişi</p></div>
              </div>
            ))}
          </div>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Yakıt İstasyonları', href: '/fuel-stations', icon: Fuel }, { label: 'Lokantalar', href: '/restaurants', icon: Utensils }, { label: 'Depolar', href: '/warehouse', icon: MapPin }].map(q => (
          <a key={q.label} href={q.href} className="kaptan-card p-4 text-center hover:bg-kaptan-primary/10 transition group">
            <q.icon size={24} className="mx-auto mb-2 text-kaptan-text group-hover:text-kaptan-primary" />
            <p className="text-sm text-kaptan-muted group-hover:text-kaptan-primary">{q.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
