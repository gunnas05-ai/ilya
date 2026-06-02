'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Banknote, Package, CreditCard, Percent } from 'lucide-react';

export default function RevenuePage() {
  const [data, setData] = useState<any>({ commissions: [], credits: [], plans: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('commissions');

  useEffect(() => {
    api.get('/admin/revenue/configs').then(r => {
      setData(r.data?.data || r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleToggle = async (type: string, id: string) => {
    await api.delete(`/admin/revenue/${type}/${id}`);
    const r = await api.get('/admin/revenue/configs');
    setData(r.data?.data || r.data);
  };

  if (loading) return <div className="p-8"><div className="h-32 skeleton rounded-xl" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Banknote size={24} className="text-kaptan-primary" />
        <h2 className="text-2xl font-bold text-kaptan-text">Gelir Yönetimi</h2>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 glass-card p-1">
        {[
          { key: 'commissions', label: 'Komisyon Oranları', icon: Percent },
          { key: 'credits', label: 'Kontör Paketleri', icon: Package },
          { key: 'plans', label: 'Abonelik Planları', icon: CreditCard },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${tab === t.key ? 'bg-kaptan-primary text-white' : 'text-kaptan-muted hover:text-kaptan-text'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Komisyon */}
      {tab === 'commissions' && (
        <div className="space-y-3">
          {(data.commissions || []).map((c: any) => (
            <div key={c.id} className="glass-card p-5 flex items-center justify-between">
              <div>
                <div className="text-kaptan-text font-semibold">{c.displayName || c.name}</div>
                <div className="text-xs text-kaptan-muted">{c.description}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-kaptan-primary">%{c.rate}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${c.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{c.isActive ? 'Aktif' : 'Pasif'}</span>
                <button onClick={() => handleToggle('commission', c.id)} className="px-3 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">Pasif Yap</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kontör */}
      {tab === 'credits' && (
        <div className="space-y-3">
          {(data.credits || []).map((p: any) => (
            <div key={p.id} className="glass-card p-5 flex items-center justify-between">
              <div>
                <div className="text-kaptan-text font-semibold">{p.name}</div>
                <div className="text-xs text-kaptan-muted">{p.credits} kontör {p.bonusCredits > 0 ? `(+${p.bonusCredits} hediye)` : ''}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-kaptan-warning">{p.price} ₺</span>
                <span className={`px-2 py-1 text-xs rounded-full ${p.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.isActive ? 'Aktif' : 'Pasif'}</span>
                <button onClick={() => handleToggle('credits', p.id)} className="px-3 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">Pasif Yap</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Planlar */}
      {tab === 'plans' && (
        <div className="space-y-3">
          {(data.plans || []).map((p: any) => (
            <div key={p.id} className="glass-card p-5 flex items-center justify-between">
              <div>
                <div className="text-kaptan-text font-semibold">{p.displayName} <span className="text-xs text-kaptan-muted">({p.name})</span></div>
                <div className="text-xs text-kaptan-muted">{p.maxLoads === -1 ? 'Limitsiz yük' : `${p.maxLoads} yük/ay`} • {p.maxUsers} kullanıcı</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-kaptan-primary">{p.monthlyPrice} ₺<span className="text-xs text-kaptan-muted">/ay</span></span>
                <span className={`px-2 py-1 text-xs rounded-full ${p.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.isActive ? 'Aktif' : 'Pasif'}</span>
                <button onClick={() => handleToggle('plans', p.id)} className="px-3 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">Pasif Yap</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
