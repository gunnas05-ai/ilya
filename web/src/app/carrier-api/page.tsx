'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function CarrierApiPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/carrier-api'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = items.filter((c: any) => !search || c.companyName?.toLowerCase().includes(search.toLowerCase()) || c.status?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Taşıyıcı API Yönetimi</h2>
        <button onClick={fetchData} className="text-sm text-kaptan-primary hover:underline">Yenile</button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Firma ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((c: any) => (
            <div key={c.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2"><Truck size={16} className="text-kaptan-primary" /><h3 className="font-medium text-kaptan-text">{c.companyName || 'Taşıyıcı'}</h3></div>
                  <p className="text-xs text-kaptan-muted mt-1">Plaka: {c.plateNumber || '-'} • Araç: {c.vehicleType || '-'} • Kapasite: {c.capacity || '-'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-500/20 text-green-400' : c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{c.status}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-kaptan-muted">Taşıyıcı bulunmuyor</div>}
        </div>
      )}
    </div>
  );
}
