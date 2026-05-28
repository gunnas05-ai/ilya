'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, Star, Trophy, TrendingUp, AlertTriangle, Search, Medal, Zap, Package } from 'lucide-react';

export default function CarrierQualityPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    api.get('/carrier-quality/leaderboard?limit=20').then(r => {
      setLeaderboard(Array.isArray(r.data?.data) ? r.data.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!searchId) return;
    try {
      const r = await api.get(`/carrier-quality/scorecard/${searchId}`);
      setSelected(r.data?.data || null);
    } catch { alert('Taşıyıcı bulunamadı'); }
  };

  const tierLabel = (t: string) => t === 'excellent' ? 'Mükemmel' : t === 'good' ? 'İyi' : t === 'fair' ? 'Orta' : 'Riskli';
  const tierColor = (t: string) => t === 'excellent' ? 'text-kaptan-success' : t === 'good' ? 'text-kaptan-primary' : t === 'fair' ? 'text-kaptan-warning' : 'text-kaptan-danger';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={24} className="text-kaptan-warning" />
        <h2 className="text-2xl font-bold text-kaptan-text">Taşıyıcı Kalite Skoru</h2>
      </div>

      {/* Search */}
      <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 mb-6 flex gap-3 items-center">
        <Search size={18} className="text-kaptan-muted" />
        <input className="flex-1 bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
          placeholder="Taşıyıcı ID'si ile ara..." value={searchId} onChange={e => setSearchId(e.target.value)} />
        <button onClick={handleSearch} className="bg-kaptan-primary text-white px-4 py-2 rounded-lg text-sm">Sorgula</button>
      </div>

      {/* Detail Card */}
      {selected && (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center"><p className="text-xs text-kaptan-muted">Genel Skor</p>
              <p className={`text-3xl font-bold ${tierColor(selected.scoreTier)}`}>{selected.overallScore}%</p>
              <p className="text-xs text-kaptan-muted">{tierLabel(selected.scoreTier)}</p></div>
            {Object.entries(selected.scoreBreakdown || {}).map(([k, v]: any) => (
              <div key={k} className="text-center"><p className="text-xs text-kaptan-muted capitalize">{k}</p>
                <p className="text-xl font-bold text-kaptan-text">{Math.round(v)}%</p></div>
            ))}
          </div>
          {selected.badges?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {selected.badges.map((b: any) => (
                <span key={b.id} className="px-3 py-1 bg-kaptan-primary/10 text-kaptan-primary rounded-full text-xs font-bold">{b.icon} {b.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-kaptan-border"><h3 className="font-semibold text-kaptan-text">🏆 Liderlik Tablosu</h3></div>
        {loading ? <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-kaptan-dark rounded-lg animate-pulse" />)}</div> : (
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50"><tr className="text-kaptan-muted"><th className="text-left p-3">#</th><th className="text-left p-3">Taşıyıcı</th><th className="text-left p-3">Skor</th><th className="text-left p-3">Seviye</th><th className="text-left p-3">Yük</th><th className="text-left p-3">Zamanında</th><th className="text-left p-3">Hasar</th><th className="text-left p-3">Kısıt</th></tr></thead>
            <tbody>
              {leaderboard.map((c, i) => (
                <tr key={c.carrierId} className="border-b border-kaptan-border/50 hover:bg-kaptan-dark/20 cursor-pointer" onClick={() => { setSearchId(c.carrierId); }}>
                  <td className="p-3 text-kaptan-text font-bold">{i+1}</td>
                  <td className="p-3 text-kaptan-text font-mono text-xs">{c.carrierId?.slice(0, 12)}...</td>
                  <td className={`p-3 font-bold ${tierColor(c.scoreTier)}`}>{c.overallScore}%</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${c.scoreTier === 'excellent' ? 'bg-green-500/20 text-green-400' : c.scoreTier === 'good' ? 'bg-blue-500/20 text-blue-400' : c.scoreTier === 'fair' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{tierLabel(c.scoreTier)}</span></td>
                  <td className="p-3 text-kaptan-text">{c.totalCompletedLoads}</td>
                  <td className="p-3 text-kaptan-text">%{c.onTimeDeliveryPct}</td>
                  <td className="p-3 text-kaptan-text">%{c.claimsRatio?.toFixed(1)}</td>
                  <td className="p-3">{c.isRestricted ? <AlertTriangle size={14} className="text-kaptan-danger" /> : c.escrowRequired ? <Shield size={14} className="text-kaptan-warning" /> : <Star size={14} className="text-kaptan-success" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
