'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Wallet, ArrowUpRight, ArrowDownLeft, DollarSign, Shield, Clock, RefreshCw } from 'lucide-react';

export default function WalletPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalBalance: 0, escrowBalance: 0, availableBalance: 0, pendingRelease: 0 });
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawIBAN, setWithdrawIBAN] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [kycStatus, setKycStatus] = useState<any>(null);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) { alert('Geçerli tutar giriniz'); return; }
    if (!withdrawIBAN || !withdrawIBAN.startsWith('TR') || withdrawIBAN.length < 26) { alert('Geçerli IBAN giriniz (TR ile başlamalı)'); return; }
    setWithdrawing(true);
    try { await api.post('/wallet/withdraw', { amount: parseFloat(withdrawAmount), iban: withdrawIBAN }); alert('Çekim talebi oluşturuldu!'); setShowWithdraw(false); fetchData(); }
    catch { alert('Çekim başarısız'); }
    setWithdrawing(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        api.get('/wallet/transactions').catch(() => ({ data: { data: [] } })),
        api.get('/wallet/balance').catch(() => ({ data: { data: {} } })),
      ]);
      setTransactions(Array.isArray(txRes.data?.data?.data || txRes.data?.data) ? (txRes.data?.data?.data || txRes.data?.data) : []);
      const bal = balRes.data?.data || {};
      setStats({
        totalBalance: Number(bal.totalBalance || bal.available_balance || 0),
        escrowBalance: Number(bal.escrowBalance || bal.escrow_balance || 0),
        availableBalance: Number(bal.availableBalance || bal.available_balance || 0),
        pendingRelease: Number(bal.pendingRelease || bal.pending_release || 0),
      });
    } catch { setTransactions([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = transactions.filter((t: any) => !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Wallet size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">Cüzdan Yönetimi</h2></div>
        <button onClick={fetchData} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline"><RefreshCw size={14} /> Yenile</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><DollarSign size={16} className="text-kaptan-text" /> Toplam Bakiye</div>
          <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.totalBalance.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><Wallet size={16} className="text-kaptan-success" /> Kullanılabilir</div>
          <p className="text-2xl font-bold text-kaptan-success mt-2">{stats.availableBalance.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><Shield size={16} className="text-kaptan-warning" /> Escrow Blokeli</div>
          <p className="text-2xl font-bold text-kaptan-warning mt-2">{stats.escrowBalance.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><Clock size={16} className="text-blue-400" /> Onay Bekleyen</div>
          <p className="text-2xl font-bold text-blue-400 mt-2">{stats.pendingRelease.toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      {/* Faz-2: Para Çekme + KYC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="kaptan-card p-4">
          <h3 className="font-bold text-kaptan-text mb-3 flex items-center gap-2"><ArrowUpRight size={18} className="text-kaptan-danger" /> IBAN'a Para Çek</h3>
          {!showWithdraw ? <button onClick={() => setShowWithdraw(true)} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold">Çekim Talebi Oluştur</button>
          : <div className="space-y-3">
            <div><label className="text-xs text-kaptan-muted">Tutar (₺)</label><input type="number" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text text-sm" /></div>
            <div><label className="text-xs text-kaptan-muted">IBAN</label><input value={withdrawIBAN} onChange={e=>setWithdrawIBAN(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text text-sm" placeholder="TR00 0000 0000 0000 0000 0000 00" /></div>
            <div className="flex gap-2"><button onClick={handleWithdraw} disabled={withdrawing} className="px-4 py-2 bg-kaptan-success text-white rounded-lg text-sm font-semibold disabled:opacity-50">{withdrawing?'Gönderiliyor...':'Çekim Yap'}</button><button onClick={()=>setShowWithdraw(false)} className="px-3 py-2 border border-kaptan-border rounded-lg text-sm text-kaptan-muted">İptal</button></div>
          </div>}
        </div>
        <div className="kaptan-card p-4">
          <h3 className="font-bold text-kaptan-text mb-3 flex items-center gap-2"><Shield size={18} className="text-kaptan-info" /> KYC / Doğrulama</h3>
          <p className="text-kaptan-muted text-sm">Kimlik doğrulama durumu: <span className="text-kaptan-warning font-semibold">{kycStatus?.level || 'Temel Seviye'}</span></p>
          <p className="text-kaptan-muted text-xs mt-1">Limit: {kycStatus?.dailyLimit ? `${Number(kycStatus.dailyLimit).toLocaleString('tr-TR')} ₺/gün` : '50.000 ₺/gün'}</p>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="İşlem ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}</div> : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
              <tr className="text-left text-kaptan-muted"><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">İşlem</th><th className="px-4 py-3">Açıklama</th><th className="px-4 py-3">Tutar</th><th className="px-4 py-3">Bakiye</th></tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((t: any, i: number) => {
                const isCredit = (t.type || '').includes('credit') || (t.type || '').includes('deposit') || (t.type || '').includes('release') || Number(t.amount) > 0;
                return (
                  <tr key={t.id || i} className="border-b border-kaptan-border/50 hover:bg-kaptan-dark/20">
                    <td className="px-4 py-3 text-kaptan-muted text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleString('tr-TR') : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isCredit ? <ArrowDownLeft size={14} className="text-kaptan-success" /> : <ArrowUpRight size={14} className="text-kaptan-danger" />}
                        <span className="text-xs text-kaptan-text">{t.type || 'İşlem'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-kaptan-muted text-xs max-w-[200px] truncate">{t.description || '-'}</td>
                    <td className={`px-4 py-3 font-medium text-sm ${isCredit ? 'text-kaptan-success' : 'text-kaptan-danger'}`}>
                      {isCredit ? '+' : '-'}{Math.abs(Number(t.amount || 0)).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-4 py-3 text-kaptan-text text-xs">{Number(t.balance || 0).toLocaleString('tr-TR')} ₺</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-kaptan-muted">İşlem bulunamadı</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
