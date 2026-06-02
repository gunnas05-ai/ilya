'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CreditCard, Package, ShoppingCart, CheckCircle, Clock, Zap, History } from 'lucide-react';

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [creditPkgs, setCreditPkgs] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'subscription' | 'credits' | 'history'>('subscription');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/billing/plans').catch(() => ({ data: { data: [] } })),
      api.get('/billing/credits/packages').catch(() => ({ data: { data: [] } })),
      api.get('/billing/subscriptions').catch(() => ({ data: { data: [] } })),
    ]).then(([plansRes, creditsRes, subsRes]) => {
      setPlans(plansRes.data?.data || []);
      setCreditPkgs(creditsRes.data?.data || []);
      setSubs(subsRes.data?.data || []);
      setLoading(false);
    });
  }, []);

  const handlePurchase = async (type: string, id: string) => {
    setPurchasing(id);
    try {
      if (type === 'plan') await api.post('/billing/subscribe', { planId: id });
      else await api.post('/billing/credits/purchase', { packageId: id });
      // Refresh
      const res = await api.get('/billing/subscriptions');
      setSubs(res.data?.data || []);
    } catch (err: any) { alert('Satın alma başarısız: ' + (err.response?.data?.message || 'Hata')); }
    setPurchasing(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-kaptan-text mb-6">Abonelik & Kontör Yönetimi</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'subscription' as const, label: 'Abonelik Planları', icon: Package },
          { key: 'credits' as const, label: 'E-Fatura Kontörleri', icon: Zap },
          { key: 'history' as const, label: 'Satın Alma Geçmişi', icon: History },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted hover:text-kaptan-text'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-52 skeleton rounded-xl" />)}</div>
      ) : (
        <>
          {/* Subscription Plans */}
          {tab === 'subscription' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-kaptan-muted">Henüz plan tanımlanmamış</div>
              ) : plans.map((p) => (
                <div key={p.id} className={`bg-kaptan-card border rounded-xl p-6 flex flex-col ${p.isPopular ? 'border-kaptan-primary shadow-lg shadow-kaptan-primary/10' : 'border-kaptan-border'}`}>
                  {p.isPopular && <span className="self-start text-xs bg-kaptan-primary text-white px-3 py-1 rounded-full mb-3">En Popüler</span>}
                  <h3 className="text-lg font-bold text-kaptan-text">{p.displayName || p.name}</h3>
                  <p className="text-xs text-kaptan-muted mt-1">{p.description || 'Aylık abonelik planı'}</p>
                  <div className="mt-4 mb-4">
                    <span className="text-3xl font-bold text-kaptan-primary">{p.monthlyPrice}₺</span>
                    <span className="text-sm text-kaptan-muted">/ay</span>
                  </div>
                  <div className="space-y-2 mb-6 text-sm flex-1">
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-kaptan-success" /><span className="text-kaptan-muted">{p.maxLoads === -1 ? 'Limitsiz yük' : `${p.maxLoads} yük`}</span></div>
                    <div className="flex items-center gap-2"><CheckCircle size={14} className="text-kaptan-success" /><span className="text-kaptan-muted">{p.maxUsers} kullanıcı</span></div>
                    {p.escrowEnabled && <div className="flex items-center gap-2"><CheckCircle size={14} className="text-kaptan-success" /><span className="text-kaptan-muted">Escrow dahil</span></div>}
                    {p.apiAccess && <div className="flex items-center gap-2"><CheckCircle size={14} className="text-kaptan-success" /><span className="text-kaptan-muted">API erişimi</span></div>}
                  </div>
                  <button onClick={() => handlePurchase('plan', p.id)} disabled={purchasing === p.id}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${p.isPopular ? 'bg-kaptan-primary text-white hover:opacity-90' : 'border border-kaptan-primary text-kaptan-primary hover:bg-kaptan-primary/10'} disabled:opacity-50`}>
                    {purchasing === p.id ? 'İşleniyor...' : p.isActive ? 'Abone Ol' : 'Pasif'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Credit Packages */}
          {tab === 'credits' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {creditPkgs.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-kaptan-muted">Henüz kontör paketi tanımlanmamış</div>
              ) : creditPkgs.map((p) => (
                <div key={p.id} className="glass-card p-6 flex flex-col text-center">
                  <Zap size={28} className="mx-auto text-kaptan-warning mb-3" />
                  <h3 className="text-lg font-bold text-kaptan-text">{p.name}</h3>
                  <div className="mt-3 mb-1">
                    <span className="text-3xl font-bold text-kaptan-warning">{p.credits}</span>
                    <span className="text-sm text-kaptan-muted"> kontör</span>
                  </div>
                  {p.bonusCredits > 0 && <span className="text-xs text-kaptan-success mb-3">+{p.bonusCredits} hediye kontör</span>}
                  <div className="mt-4 mb-4">
                    <span className="text-2xl font-bold text-kaptan-text">{p.price}₺</span>
                  </div>
                  <button onClick={() => handlePurchase('credit', p.id)} disabled={purchasing === p.id}
                    className="w-full py-2.5 rounded-xl bg-kaptan-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                    {purchasing === p.id ? 'İşleniyor...' : 'Satın Al'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Purchase History */}
          {tab === 'history' && (
            <div className="glass-card overflow-hidden">
              {subs.length === 0 ? (
                <div className="text-center py-16 text-kaptan-muted">
                  <Clock size={40} className="mx-auto mb-2 opacity-20" />
                  <p>Henüz satın alma geçmişi bulunmuyor</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-kaptan-dark/50"><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Plan/Paket</th><th className="text-left p-3">Tutar</th><th className="text-left p-3">Tarih</th><th className="text-left p-3">Bitiş</th><th className="text-left p-3">Durum</th></tr></thead>
                  <tbody>
                    {subs.map((s: any) => (
                      <tr key={s.id} className="border-b border-kaptan-border/50">
                        <td className="p-3 text-kaptan-text font-medium">{s.planName || s.packageName || '-'}</td>
                        <td className="p-3 text-kaptan-text">{Number(s.amount || 0).toLocaleString('tr-TR')} ₺</td>
                        <td className="p-3 text-xs text-kaptan-muted">{s.startDate ? new Date(s.startDate).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="p-3 text-xs text-kaptan-muted">{s.endDate ? new Date(s.endDate).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{s.status === 'active' ? 'Aktif' : 'Pasif'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
