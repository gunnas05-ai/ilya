'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  CreditCard, Banknote, Receipt, Percent, Wallet, Shield,
  RefreshCw, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';

export default function OdemePage() {
  const [cards, setCards] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [creditPkgs, setCreditPkgs] = useState<any[]>([]);
  const [commissionConfigs, setCommissionConfigs] = useState<any[]>([]);
  const [commissionReport, setCommissionReport] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/payment/card/list').catch(() => ({ data: { data: [] } })),
      api.get('/billing/plans').catch(() => ({ data: { data: [] } })),
      api.get('/billing/credits/packages').catch(() => ({ data: { data: [] } })),
      api.get('/billing/commission/configs').catch(() => ({ data: { data: [] } })),
      api.get('/billing/commission/report?period=month').catch(() => ({ data: { data: {} } })),
      api.get('/payment/transactions').catch(() => ({ data: { data: { transactions: [], total: 0 } } })),
    ]).then(([cardsRes, plansRes, creditsRes, commRes, commReportRes, txRes]) => {
      setCards(cardsRes.data?.data || []);
      setPlans(plansRes.data?.data || []);
      setCreditPkgs(creditsRes.data?.data || []);
      setCommissionConfigs(commRes.data?.data || []);
      setCommissionReport(commReportRes.data?.data || {});
      setTransactions(txRes.data?.data?.transactions || txRes.data?.data || []);
      setLoading(false);
    });
  }, []);

  const tabs = [
    { key: 'overview', label: 'Genel Bakış', icon: Banknote },
    { key: 'cards', label: 'Kartlar', icon: CreditCard },
    { key: 'subscriptions', label: 'Abonelikler', icon: RefreshCw },
    { key: 'credits', label: 'Kontör', icon: Receipt },
    { key: 'commission', label: 'Komisyon', icon: Percent },
    { key: 'transactions', label: 'İşlemler', icon: Wallet },
  ];

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-kaptan-text mb-6">Ödeme Sistemi</h2>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const configLabels: Record<string, string> = {
    platform_match: 'Platform Eşleşme',
    own_carrier: 'Kendi Taşıyıcısı',
    escrow_acceleration: 'Escrow Hızlandırma',
    insurance: 'Sigorta',
    fuel_card: 'Akaryakıt Kartı',
    early_payment: 'Erken Ödeme (Faktoring)',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-kaptan-text">Ödeme Sistemi</h2>
          <p className="text-sm text-kaptan-muted mt-1">Kredi kartı, abonelik, kontör, komisyon ve tüm ödeme ayarları</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-kaptan-muted">
          <Shield size={16} className="text-kaptan-success" />
          PCI-DSS Uyumlu
        </div>
      </div>

      {/* ── Üst İstatistikler ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><CreditCard size={14} /> Kayıtlı Kart</div>
          <div className="text-xl font-bold text-kaptan-text">{cards.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><RefreshCw size={14} /> Abonelik Planı</div>
          <div className="text-xl font-bold text-kaptan-primary">{plans.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><Receipt size={14} /> Kontör Paketi</div>
          <div className="text-xl font-bold text-kaptan-warning">{creditPkgs.length}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><Percent size={14} /> Komisyon</div>
          <div className="text-xl font-bold text-kaptan-success">{commissionConfigs.length} oran</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-xs text-kaptan-muted mb-1"><Banknote size={14} /> Aylık Komisyon</div>
          <div className="text-xl font-bold text-kaptan-success">{commissionReport?.totalCommissionTL || '0'} ₺</div>
        </div>
      </div>

      {/* ── Tab Navigasyon ── */}
      <div className="flex gap-1 mb-4 glass-card p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-kaptan-primary text-white'
                : 'text-kaptan-muted hover:text-kaptan-text'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Genel Bakış ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-kaptan-text mb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-kaptan-primary" /> Ödeme Sağlayıcı
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-kaptan-border/30">
                <span className="text-kaptan-muted">Provider</span>
                <span className="text-kaptan-text font-medium">İyzico (Sandbox)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-kaptan-border/30">
                <span className="text-kaptan-muted">PCI-DSS</span>
                <span className="text-kaptan-success flex items-center gap-1"><CheckCircle size={14} /> Uyumlu</span>
              </div>
              <div className="flex justify-between py-2 border-b border-kaptan-border/30">
                <span className="text-kaptan-muted">Kart Verisi</span>
                <span className="text-kaptan-success flex items-center gap-1"><Shield size={14} /> Tokenize (AES-256)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-kaptan-muted">QuickPay</span>
                <span className="text-kaptan-success flex items-center gap-1"><CheckCircle size={14} /> Aktif</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-kaptan-text mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-kaptan-warning" /> Sistem Durumu
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-kaptan-border/30">
                <span className="text-kaptan-muted">Son İşlem</span>
                <span className="text-kaptan-text">{transactions.length > 0 ? new Date(transactions[0]?.createdAt).toLocaleString('tr-TR') : '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-kaptan-border/30">
                <span className="text-kaptan-muted">Toplam İşlem</span>
                <span className="text-kaptan-text font-medium">{Array.isArray(transactions) ? transactions.length : 0}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-kaptan-muted">Platform Komisyonu</span>
                <span className="text-kaptan-warning font-medium">%3.5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Kartlar ── */}
      {tab === 'cards' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
              <tr className="text-left text-kaptan-muted">
                <th className="px-4 py-3">Kart</th><th className="px-4 py-3">Son Kullanma</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-kaptan-muted">
                  <CreditCard size={24} className="mx-auto mb-2 opacity-50" /> Kayıtlı kart bulunmuyor.
                </td></tr>
              ) : cards.map((c: any) => (
                <tr key={c.id} className="border-b border-kaptan-border/50">
                  <td className="px-4 py-3 text-kaptan-text">
                    <span className="uppercase font-medium">{c.brand}</span> •••• {c.last4}
                  </td>
                  <td className="px-4 py-3 text-kaptan-muted">{c.expiryMonth}/{c.expiryYear?.slice(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${c.isDefault ? 'bg-kaptan-primary/10 text-kaptan-primary' : 'bg-kaptan-border/30 text-kaptan-muted'}`}>
                      {c.isDefault ? 'Varsayılan' : 'Kayıtlı'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: Abonelikler ── */}
      {tab === 'subscriptions' && (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="glass-card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-kaptan-text font-semibold text-lg">{p.displayName}</span>
                  <span className="text-xs text-kaptan-muted ml-2">({p.name})</span>
                  <p className="text-xs text-kaptan-muted mt-1">{p.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-kaptan-primary font-bold text-xl">{p.monthlyPrice}₺<span className="text-xs text-kaptan-muted">/ay</span></div>
                  {p.yearlyPrice > 0 && <div className="text-xs text-kaptan-success">Yıllık {p.yearlyPrice}₺ (%20 indirim)</div>}
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-kaptan-muted">
                <span>🚛 {p.maxLoads === -1 ? 'Limitsiz' : `${p.maxLoads} yük/ay`}</span>
                <span>👥 {p.maxUsers} kullanıcı</span>
                <span>🌐 {p.features?.webhook ? 'Webhook' : '—'}</span>
                <span>🔌 {p.features?.api ? 'API' : '—'}</span>
                <span>🛡️ {p.features?.sla ? 'SLA' : '—'}</span>
                <span>{p.isActive ? '🟢 Aktif' : '🔴 Pasif'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Kontör ── */}
      {tab === 'credits' && (
        <div className="space-y-3">
          {creditPkgs.map((p) => (
            <div key={p.id} className="glass-card p-5">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-kaptan-text font-semibold">{p.name}</span>
                  {p.bonusCredits > 0 && <span className="text-xs text-kaptan-success ml-2">+{p.bonusCredits} hediye</span>}
                </div>
                <div className="text-right">
                  <div className="text-kaptan-warning font-bold text-lg">{p.price}₺</div>
                  <div className="text-xs text-kaptan-muted">{p.credits} kontör</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Komisyon ── */}
      {tab === 'commission' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {commissionConfigs.map((c) => (
              <div key={c.id} className="glass-card p-4 text-center">
                <div className="text-3xl font-bold text-kaptan-primary">%{c.rate}</div>
                <div className="text-sm text-kaptan-text mt-1">{c.displayName || configLabels[c.name] || c.name}</div>
                {c.description && <div className="text-xs text-kaptan-muted mt-1">{c.description}</div>}
              </div>
            ))}
          </div>
          {commissionReport && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-kaptan-text mb-3">Aylık Komisyon Raporu</h3>
              <div className="text-3xl font-bold text-kaptan-success">{commissionReport.totalCommissionTL} ₺</div>
              <div className="text-xs text-kaptan-muted mt-1">{commissionReport.totalTransactions} işlem</div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: İşlemler ── */}
      {tab === 'transactions' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
              <tr className="text-left text-kaptan-muted">
                <th className="px-4 py-3">Tarih</th><th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Tip</th><th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(transactions) || transactions.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-kaptan-muted">
                  <Clock size={24} className="mx-auto mb-2 opacity-50" /> Henüz işlem bulunmuyor.
                </td></tr>
              ) : transactions.slice(0, 20).map((tx: any) => (
                <tr key={tx.id} className="border-b border-kaptan-border/50">
                  <td className="px-4 py-3 text-kaptan-muted text-xs">{new Date(tx.createdAt).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-kaptan-text font-medium">{(tx.amount / 100).toFixed(2)} ₺</td>
                  <td className="px-4 py-3 text-kaptan-muted">{tx.type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      tx.status === 'success' ? 'bg-green-500/10 text-green-400' :
                      tx.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
