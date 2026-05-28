'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Wallet, ArrowUpRight, ArrowDownLeft, DollarSign, Shield, Clock, RefreshCw } from 'lucide-react';

export default function WalletPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalBalance: 0, escrowBalance: 0, availableBalance: 0, pendingRelease: 0 });

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
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><DollarSign size={16} className="text-kaptan-text" /> Toplam Bakiye</div>
          <p className="text-2xl font-bold text-kaptan-text mt-2">{stats.totalBalance.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><Wallet size={16} className="text-kaptan-success" /> Kullanılabilir</div>
          <p className="text-2xl font-bold text-kaptan-success mt-2">{stats.availableBalance.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><Shield size={16} className="text-kaptan-warning" /> Escrow Blokeli</div>
          <p className="text-2xl font-bold text-kaptan-warning mt-2">{stats.escrowBalance.toLocaleString('tr-TR')} ₺</p>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-kaptan-muted"><Clock size={16} className="text-blue-400" /> Onay Bekleyen</div>
          <p className="text-2xl font-bold text-blue-400 mt-2">{stats.pendingRelease.toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="İşlem ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-kaptan-card rounded-lg animate-pulse" />)}</div> : (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
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
