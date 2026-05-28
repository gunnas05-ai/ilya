'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Brain, TrendingUp, MapPin, DollarSign, Activity, BarChart3, Star } from 'lucide-react';

export default function MatchingPage() {
  const [pref, setPref] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'preferences' | 'feedback'>('preferences');

  useEffect(() => {
    Promise.all([
      api.get('/matching/preferences').catch(() => ({ data: { data: null } })),
      api.get('/matching/feedback?limit=30').catch(() => ({ data: { data: [] } })),
    ]).then(([p, f]) => {
      setPref(p.data?.data || p.data || null);
      setFeedback(Array.isArray(f.data?.data) ? f.data.data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-kaptan-card rounded-xl animate-pulse" />)}</div>;

  const topRoutes = (pref?.favoriteRoutes || []).slice(0, 5);
  const topTypes = (pref?.preferredLoadTypes || []).slice(0, 5);
  const acceptRate = pref?.totalInteractions > 0 ? Math.round((pref.totalAccepted / pref.totalInteractions) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Brain size={24} className="text-kaptan-primary" />
        <h2 className="text-2xl font-bold text-kaptan-text">AI Eşleştirme & Tercih Analizi</h2>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ k: 'preferences', l: 'Tercih Profili' }, { k: 'feedback', l: 'Geri Bildirim Geçmişi' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.k ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stats */}
          <div className="space-y-4">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-4">📊 Taşıyıcı Profili</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-kaptan-dark rounded-lg">
                  <Activity size={20} className="mx-auto mb-1 text-kaptan-primary" />
                  <p className="text-2xl font-bold text-kaptan-text">{pref?.totalInteractions || 0}</p>
                  <p className="text-xs text-kaptan-muted">Toplam Etkileşim</p>
                </div>
                <div className="text-center p-3 bg-kaptan-dark rounded-lg">
                  <Star size={20} className="mx-auto mb-1 text-kaptan-warning" />
                  <p className="text-2xl font-bold text-kaptan-text">%{acceptRate}</p>
                  <p className="text-xs text-kaptan-muted">Kabul Oranı</p>
                </div>
                <div className="text-center p-3 bg-kaptan-dark rounded-lg">
                  <DollarSign size={20} className="mx-auto mb-1 text-kaptan-success" />
                  <p className="text-2xl font-bold text-kaptan-text">{Math.round(pref?.avgAcceptedPrice || 0).toLocaleString('tr-TR')} ₺</p>
                  <p className="text-xs text-kaptan-muted">Ortalama Fiyat</p>
                </div>
                <div className="text-center p-3 bg-kaptan-dark rounded-lg">
                  <MapPin size={20} className="mx-auto mb-1 text-kaptan-primary" />
                  <p className="text-2xl font-bold text-kaptan-text">{Math.round(pref?.avgPreferredDistance || 0)} km</p>
                  <p className="text-xs text-kaptan-muted">Ortalama Mesafe</p>
                </div>
              </div>
            </div>

            {/* Embedding */}
            {pref?.embedding?.length > 0 && (
              <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
                <h3 className="font-semibold text-kaptan-text mb-3">🧬 Embedding Vektörü</h3>
                <div className="space-y-2">
                  {['Rota Çeşitliliği', 'Fiyat Norm.', 'Yük Tipi Çeşit.', 'Mesafe Tercihi', 'Kabul Oranı', 'Aktivite'].map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-kaptan-muted w-28">{label}</span>
                      <div className="flex-1 bg-kaptan-dark rounded-full h-2">
                        <div className="bg-kaptan-primary h-2 rounded-full" style={{ width: `${(pref.embedding[i] || 0) * 100}%` }} />
                      </div>
                      <span className="text-xs text-kaptan-text w-10 text-right">{Math.round((pref.embedding[i] || 0) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Routes & Types */}
          <div className="space-y-4">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-3">🛣️ Favori Rotalar ({topRoutes.length})</h3>
              {topRoutes.length === 0 ? <p className="text-sm text-kaptan-muted">Henüz veri yok</p> : (
                <div className="space-y-2">
                  {topRoutes.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 bg-kaptan-dark rounded-lg text-sm">
                      <span className="text-kaptan-text">{r.fromCity} → {r.toCity}</span>
                      <span className="text-kaptan-primary font-bold">{r.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <h3 className="font-semibold text-kaptan-text mb-3">📦 Yük Tipi Tercihleri</h3>
              {topTypes.length === 0 ? <p className="text-sm text-kaptan-muted">Henüz veri yok</p> : (
                <div className="space-y-2">
                  {topTypes.map((t: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 bg-kaptan-dark rounded-lg text-sm">
                      <span className="text-kaptan-text">{t.loadType}</span>
                      <span className="text-kaptan-primary font-bold">{t.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50"><tr className="text-kaptan-muted"><th className="text-left p-3">Tarih</th><th className="text-left p-3">Yük</th><th className="text-left p-3">Rota</th><th className="text-left p-3">Fiyat</th><th className="text-left p-3">Aksiyon</th><th className="text-left p-3">Skor</th></tr></thead>
            <tbody>
              {feedback.map((f: any, i: number) => (
                <tr key={f.id || i} className="border-b border-kaptan-border/50 hover:bg-kaptan-dark/20">
                  <td className="p-3 text-xs text-kaptan-muted">{f.createdAt ? new Date(f.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="p-3 text-kaptan-text font-medium text-xs">{f.loadTitle}</td>
                  <td className="p-3 text-xs text-kaptan-muted">{f.fromCity} → {f.toCity}</td>
                  <td className="p-3 text-xs text-kaptan-text">{Number(f.loadPrice || 0).toLocaleString('tr-TR')} ₺</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      f.action === 'accepted' ? 'bg-green-500/20 text-green-400' :
                      f.action === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      f.action === 'bid' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{f.action}</span>
                  </td>
                  <td className="p-3 text-xs text-kaptan-primary">{f.matchScore || '-'}%</td>
                </tr>
              ))}
              {feedback.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-kaptan-muted">Henüz geri bildirim yok</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
