'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Package } from 'lucide-react';

export default function ShipperApiPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/shipper-api'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = items.filter((s: any) => !search || s.companyName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Gönderici API Yönetimi</h2>
        <button onClick={fetchData} className="text-sm text-kaptan-primary hover:underline">Yenile</button>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Firma ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((s: any) => (
            <div key={s.id} className="glass-card p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2"><Package size={16} className="text-kaptan-primary" /><h3 className="font-medium text-kaptan-text">{s.companyName || 'Gönderici'}</h3></div>
                <span className={`text-xs px-2 py-0.5 rounded ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.status || 'unknown'}</span>
              </div>
              <p className="text-xs text-kaptan-muted mt-1">Gönderi sayısı: {s.totalShipments || 0} • Aktif: {s.activeShipments || 0}</p>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-kaptan-muted">Gönderici bulunmuyor</div>}
        </div>
      )}
    </div>
  );
}
