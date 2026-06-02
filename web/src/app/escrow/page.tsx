'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, Clock, AlertTriangle, CheckCircle, XCircle, DollarSign, Search, Eye, RefreshCw } from 'lucide-react';

export default function EscrowPage() {
  const [tab, setTab] = useState<'withdrawals' | 'disputes' | 'overview'>('overview');
  const [pending, setPending] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [withRes, dispRes] = await Promise.all([
        api.get('/escrow/admin/withdrawals/pending').catch(() => ({ data: { data: [] } })),
        api.get('/escrow/disputes').catch(() => ({ data: { data: [] } })),
      ]);
      setPending(Array.isArray(withRes.data?.data) ? withRes.data.data : []);
      setDisputes(Array.isArray(dispRes.data?.data?.data || dispRes.data?.data) ? (dispRes.data?.data?.data || dispRes.data?.data) : []);
    } catch { setPending([]); setDisputes([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleWithdrawalAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Çekim talebini ${action === 'approve' ? 'onaylamak' : 'reddetmek'} istediğinize emin misiniz?`)) return;
    setActionLoading(id);
    try {
      await api.post(`/escrow/admin/withdrawals/${id}/${action}`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setActionLoading(null);
  };

  const handleDisputeResolution = async (disputeId: string, resolution: 'release' | 'refund' | 'partial_refund') => {
    if (!resolutionNote && resolution !== 'release') {
      alert('Lütfen bir karar notu giriniz');
      return;
    }
    if (!confirm(`${resolution === 'release' ? 'Fonu serbest bırak' : resolution === 'refund' ? 'Tam iade yap' : 'Kısmi iade yap'} işlemini onaylıyor musunuz?`)) return;
    setActionLoading(disputeId);
    try {
      await api.post(`/escrow/disputes/${disputeId}/resolve`, { resolution, note: resolutionNote });
      setResolutionNote('');
      setSelectedDispute(null);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setActionLoading(null);
  };

  const totalEscrowVolume = disputes.reduce((s, d) => s + Number(d.amount || 0), 0);
  const activeDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">Escrow & Güvenli Ödeme</h2>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'overview', label: 'Genel Bakış' },
          { key: 'withdrawals', label: `Çekim Talepleri (${pending.length})` },
          { key: 'disputes', label: `İhtilaflar (${activeDisputes.length})` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted hover:text-kaptan-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-kaptan-muted text-sm mb-2"><DollarSign size={16} className="text-kaptan-primary" /> Escrow Hacmi</div>
              <p className="text-2xl font-bold text-kaptan-text">{totalEscrowVolume.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-kaptan-muted text-sm mb-2"><Clock size={16} className="text-kaptan-warning" /> Bekleyen Çekim</div>
              <p className="text-2xl font-bold text-kaptan-warning">{pending.length}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-kaptan-muted text-sm mb-2"><AlertTriangle size={16} className="text-kaptan-danger" /> Aktif İhtilaf</div>
              <p className="text-2xl font-bold text-kaptan-danger">{activeDisputes.length}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-kaptan-muted text-sm mb-2"><CheckCircle size={16} className="text-kaptan-success" /> Çözümlenen</div>
              <p className="text-2xl font-bold text-kaptan-success">{disputes.filter(d => d.status === 'resolved').length}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-kaptan-text mb-3">Hızlı İşlemler</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Çekim Onayla', action: () => setTab('withdrawals'), color: 'bg-green-500/10 text-green-400 hover:bg-green-500/20' },
                { label: 'İhtilaf Çöz', action: () => setTab('disputes'), color: 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' },
                { label: 'Riskli İşlemler', action: () => {}, color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
                { label: 'Rapor İndir', action: () => {}, color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${item.color}`}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
              <tr className="text-left text-kaptan-muted">
                <th className="px-4 py-3">Kullanıcı</th><th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">IBAN</th><th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Durum</th><th className="px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-kaptan-muted">
                  <Clock size={24} className="mx-auto mb-2 opacity-50" /> Bekleyen çekim talebi yok.
                </td></tr>
              ) : pending.map((w: any, i: number) => (
                <tr key={w.id || i} className="border-b border-kaptan-border/50 hover:bg-kaptan-dark/20">
                  <td className="px-4 py-3 text-kaptan-text font-mono text-xs">{w.userId?.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-kaptan-text font-medium">{Number(w.amount || 0).toLocaleString('tr-TR')} ₺</td>
                  <td className="px-4 py-3 text-kaptan-muted font-mono text-xs">{w.iban || '-'}</td>
                  <td className="px-4 py-3 text-kaptan-muted text-xs">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400">{w.status || 'pending'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleWithdrawalAction(w.id, 'approve')} disabled={actionLoading === w.id}
                        className="px-3 py-1 text-xs bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 disabled:opacity-50">Onayla</button>
                      <button onClick={() => handleWithdrawalAction(w.id, 'reject')} disabled={actionLoading === w.id}
                        className="px-3 py-1 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 disabled:opacity-50">Reddet</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {disputes.length === 0 ? (
              <div className="glass-card p-12 text-center text-kaptan-muted">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p>Aktif ihtilaf bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d: any) => (
                  <button key={d.id} onClick={() => setSelectedDispute(d)}
                    className={`w-full text-left bg-kaptan-card border rounded-xl p-4 transition-colors hover:border-kaptan-primary/50 ${
                      selectedDispute?.id === d.id ? 'border-kaptan-primary bg-kaptan-primary/5' : 'border-kaptan-border'
                    }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-kaptan-text">İhtilaf #{d.id?.slice(0, 8)}</h3>
                        <p className="text-xs text-kaptan-muted mt-1">{d.reason || d.type || 'Belirtilmemiş'} • {d.createdAt ? new Date(d.createdAt).toLocaleDateString('tr-TR') : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-kaptan-text">{Number(d.amount || 0).toLocaleString('tr-TR')} ₺</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          d.status === 'open' ? 'bg-red-500/10 text-red-400' :
                          d.status === 'under_review' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-green-500/10 text-green-400'
                        }`}>
                          {d.status === 'open' ? 'Açık' : d.status === 'under_review' ? 'İnceleniyor' : 'Çözüldü'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {selectedDispute ? (
              <div className="glass-card p-4 sticky top-6">
                <h3 className="font-semibold text-kaptan-text mb-3">İhtilaf Çözüm Paneli</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-kaptan-muted">İhtilaf ID</span>
                    <p className="text-kaptan-text font-mono text-xs mt-0.5">{selectedDispute.id}</p>
                  </div>
                  <div>
                    <span className="text-kaptan-muted">Tutar</span>
                    <p className="text-kaptan-text font-bold">{Number(selectedDispute.amount || 0).toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <div>
                    <span className="text-kaptan-muted">Sebep</span>
                    <p className="text-kaptan-text">{selectedDispute.reason || selectedDispute.type || 'Belirtilmemiş'}</p>
                  </div>
                  {selectedDispute.evidence && (
                    <div>
                      <span className="text-kaptan-muted">Kanıtlar</span>
                      <p className="text-kaptan-text text-xs mt-0.5">{selectedDispute.evidence} adet kanıt mevcut</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-kaptan-muted mb-1">Karar Notu</label>
                    <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" rows={3}
                      placeholder="Karar gerekçesini yazın..."
                      value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
                  </div>

                  {selectedDispute.status !== 'resolved' && (
                    <div className="space-y-2 pt-2">
                      <button onClick={() => handleDisputeResolution(selectedDispute.id, 'release')}
                        disabled={actionLoading === selectedDispute.id}
                        className="w-full py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 disabled:opacity-50 text-sm font-medium">
                        ✅ Fonu Serbest Bırak (Release)
                      </button>
                      <button onClick={() => handleDisputeResolution(selectedDispute.id, 'refund')}
                        disabled={actionLoading === selectedDispute.id}
                        className="w-full py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 disabled:opacity-50 text-sm font-medium">
                        🔄 Tam İade (Full Refund)
                      </button>
                      <button onClick={() => handleDisputeResolution(selectedDispute.id, 'partial_refund')}
                        disabled={actionLoading === selectedDispute.id}
                        className="w-full py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 disabled:opacity-50 text-sm font-medium">
                        📊 Kısmi İade (Partial)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 text-center text-kaptan-muted">
                <Eye size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Çözmek için bir ihtilaf seçin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
