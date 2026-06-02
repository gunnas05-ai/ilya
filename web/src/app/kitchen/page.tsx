'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ChefHat, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const STATUS_FLOW: Record<string, { label: string; next: string; nextLabel: string; color: string }> = {
  pending: { label: 'Bekliyor', next: 'confirmed', nextLabel: 'Onayla', color: 'bg-kaptan-warning/20 text-kaptan-warning' },
  confirmed: { label: 'Onaylandı', next: 'preparing', nextLabel: 'Hazırla', color: 'bg-kaptan-info/20 text-kaptan-info' },
  preparing: { label: 'Hazırlanıyor', next: 'ready', nextLabel: 'Hazır', color: 'bg-kaptan-primary/20 text-kaptan-primary' },
  ready: { label: 'Hazır', next: 'completed', nextLabel: 'Tamamla', color: 'bg-kaptan-success/20 text-kaptan-success' },
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = () => {
    api.get('/restaurants/kitchen/reservations').then(r => {
      setOrders(Array.isArray(r.data?.data||r.data) ? (r.data?.data||r.data) : []);
      setLoading(false);
    }).catch(() => { setOrders([]); setLoading(false); });
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.post(`/restaurants/reservations/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id===orderId ? {...o, status: newStatus} : o));
    } catch { alert('Durum güncellenemedi'); }
  };

  const activeOrders = orders.filter((o: any) => ['pending','confirmed','preparing','ready'].includes(o.status));
  const grouped = activeOrders.reduce((acc: any, o: any) => { const s = o.status||'pending'; if (!acc[s]) acc[s] = []; acc[s].push(o); return acc; }, {});

  if (loading) return <div className="p-6 space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-kaptan-card animate-pulse rounded-xl" />)}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><ChefHat size={28} className="text-kaptan-primary" /> Mutfak Ekranı</h1>
        <button onClick={fetchOrders} className="flex items-center gap-1 text-sm text-kaptan-primary"><RefreshCw size={14} /> Yenile</button>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center text-sm">
        {['pending','confirmed','preparing','ready'].map(s => (
          <div key={s} className={`kaptan-card p-3 ${s==='ready'?'border-kaptan-success/30':''}`}>
            <p className="text-2xl font-bold text-kaptan-text">{grouped[s]?.length || 0}</p>
            <p className="text-kaptan-muted text-xs">{STATUS_FLOW[s]?.label || s}</p>
          </div>
        ))}
      </div>

      {Object.entries(grouped).map(([status, items]: any) => (
        <div key={status} className="kaptan-card p-4">
          <h3 className={`font-bold text-sm mb-3 px-2 py-1 rounded-lg inline-block ${STATUS_FLOW[status]?.color}`}>{STATUS_FLOW[status]?.label} ({items.length})</h3>
          <div className="space-y-2">
            {items.map((order: any) => (
              <div key={order.id} className="bg-kaptan-dark rounded-lg">
                <div onClick={() => setExpanded(expanded===order.id ? null : order.id)} className="p-3 flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-kaptan-text font-semibold text-sm">{order.restaurantName || 'Sipariş'}</p>
                    <p className="text-kaptan-muted text-xs flex items-center gap-2 mt-1"><Clock size={12} /> {order.reservedAt ? new Date(order.reservedAt).toLocaleTimeString('tr-TR') : '-'} • {order.items?.length || 0} kalem</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-kaptan-text text-sm font-bold">{(order.total||0).toLocaleString('tr-TR')} ₺</span>
                    <span className="text-kaptan-muted">{expanded===order.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded === order.id && (
                  <div className="px-3 pb-3 border-t border-kaptan-border pt-2">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm py-1"><span className="text-kaptan-muted">{item.quantity}x {item.name}</span><span className="text-kaptan-text">{((item.quantity||1)*(item.price||0)).toLocaleString('tr-TR')} ₺</span></div>
                    ))}
                    {order.note && <p className="text-kaptan-muted text-xs mt-2 italic">📝 {order.note}</p>}
                    {STATUS_FLOW[status]?.next && (
                      <button onClick={() => handleStatus(order.id, STATUS_FLOW[status].next)} className="mt-3 w-full py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold">
                        {STATUS_FLOW[status].nextLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {activeOrders.length === 0 && <p className="text-center text-kaptan-muted py-12">Aktif sipariş bulunmuyor</p>}
    </div>
  );
}
