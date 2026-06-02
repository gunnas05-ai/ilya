'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Calculator, TrendingUp, FileText, Banknote } from 'lucide-react';

export default function TaxDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tevkifat' | 'sgk' | 'mevzuat'>('dashboard');
  const [tevkifatAmount, setTevkifatAmount] = useState('');
  const [tevkifatService, setTevkifatService] = useState('yapim');
  const [tevkifatResult, setTevkifatResult] = useState<any>(null);
  const [sgkGross, setSgkGross] = useState('');
  const [sgkResult, setSgkResult] = useState<any>(null);

  useEffect(() => {
    api.get('/tax/dashboard').then(r => setData(r.data?.data || r.data)).catch(() => {});
  }, []);

  const handleTevkifat = async () => {
    if (!tevkifatAmount) return;
    try { const r = await api.post('/tax/quick/withholding', { amount: parseFloat(tevkifatAmount), serviceType: tevkifatService }); setTevkifatResult(r.data?.data || r.data); } catch { alert('Hesaplama hatası'); }
  };

  const handleSGK = async () => {
    if (!sgkGross) return;
    try { const r = await api.post('/tax/sgk/calculate', { grossSalary: parseFloat(sgkGross) }); setSgkResult(r.data?.data || r.data); } catch { alert('Hesaplama hatası'); }
  };

  const TEVKIFAT_RATES: Record<string, number> = { yapim: 3, temizlik: 5, danismanlik: 20, tasimacilik: 2, guvenlik: 10 };

  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
    { key: 'tevkifat' as const, label: 'Tevkifat Hesapla', icon: Calculator },
    { key: 'sgk' as const, label: 'SGK Hesapla', icon: Banknote },
    { key: 'mevzuat' as const, label: 'Mevzuat', icon: FileText },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><Calculator size={28} className="text-kaptan-primary" /> Vergi Yönetimi</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => <button key={t.key} onClick={()=>setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${activeTab===t.key?'bg-kaptan-primary text-white':'bg-kaptan-card text-kaptan-muted'}`}><t.icon size={16} />{t.label}</button>)}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI label="Aylık Gelir" value={`${((data?.monthlyRevenue||0)/1000).toFixed(0)}k ₺`} color="text-kaptan-success" />
            <KPI label="Aylık KDV" value={`${((data?.monthlyVAT||0)/1000).toFixed(0)}k ₺`} color="text-kaptan-info" />
            <KPI label="Ödenecek Vergi" value={`${((data?.taxDue||0)/1000).toFixed(0)}k ₺`} color="text-kaptan-warning" />
          </div>
          {data?.monthlyBreakdown && (
            <div className="kaptan-card p-6">
              <h3 className="font-bold text-kaptan-text mb-4">Aylık KDV Dökümü</h3>
              <table className="w-full text-sm"><thead><tr className="text-kaptan-muted"><th className="text-left pb-2">Ay</th><th className="text-right pb-2">Gelir</th><th className="text-right pb-2">KDV</th></tr></thead><tbody>
                {data.monthlyBreakdown.map((m: any, i: number) => <tr key={i} className="border-t border-kaptan-border/50"><td className="py-2 text-kaptan-text">{m.month}</td><td className="py-2 text-right text-kaptan-text">{m.revenue?.toLocaleString('tr-TR')||0} ₺</td><td className="py-2 text-right text-kaptan-muted">{(m.vat||0).toLocaleString('tr-TR')} ₺</td></tr>)}
              </tbody></table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tevkifat' && (
        <div className="kaptan-card p-6 max-w-lg">
          <h3 className="font-bold text-kaptan-text mb-4">Tevkifat Hesaplayıcı</h3>
          <div className="space-y-3">
            <div><label className="text-kaptan-muted text-sm">Hizmet Tutarı (₺)</label><input type="number" value={tevkifatAmount} onChange={e=>setTevkifatAmount(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text" /></div>
            <div><label className="text-kaptan-muted text-sm">Hizmet Türü</label><select value={tevkifatService} onChange={e=>setTevkifatService(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text">{Object.entries(TEVKIFAT_RATES).map(([k,v])=><option key={k} value={k}>{k} (%{v})</option>)}</select></div>
            <button onClick={handleTevkifat} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold">Hesapla</button>
            {tevkifatResult && <div className="p-4 bg-kaptan-dark rounded-lg mt-3 space-y-1 text-sm"><p className="text-kaptan-muted">Brüt: <span className="text-kaptan-text">{Number(tevkifatResult.gross||0).toLocaleString('tr-TR')} ₺</span></p><p className="text-kaptan-muted">Tevkifat (%{TEVKIFAT_RATES[tevkifatService]}): <span className="text-kaptan-danger">{Number(tevkifatResult.withholding||0).toLocaleString('tr-TR')} ₺</span></p><p className="text-kaptan-text font-bold">Net: {Number(tevkifatResult.net||0).toLocaleString('tr-TR')} ₺</p></div>}
          </div>
        </div>
      )}

      {activeTab === 'sgk' && (
        <div className="kaptan-card p-6 max-w-lg">
          <h3 className="font-bold text-kaptan-text mb-4">SGK Prim Hesaplayıcı</h3>
          <div className="space-y-3">
            <div><label className="text-kaptan-muted text-sm">Brüt Maaş (₺)</label><input type="number" value={sgkGross} onChange={e=>setSgkGross(e.target.value)} className="w-full mt-1 px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text" /></div>
            <button onClick={handleSGK} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold">Hesapla</button>
            {sgkResult && <div className="p-4 bg-kaptan-dark rounded-lg mt-3 space-y-1 text-sm"><p className="text-kaptan-muted">SGK İşçi (%14): <span className="text-kaptan-danger">{Number(sgkResult.employeeSgk||0).toLocaleString('tr-TR')} ₺</span></p><p className="text-kaptan-muted">İşsizlik İşçi (%1): <span className="text-kaptan-danger">{Number(sgkResult.employeeUnemp||0).toLocaleString('tr-TR')} ₺</span></p><p className="text-kaptan-muted">SGK İşveren (%20.5): <span className="text-kaptan-danger">{Number(sgkResult.employerSgk||0).toLocaleString('tr-TR')} ₺</span></p><p className="text-kaptan-text font-bold">Net Maaş: {Number(sgkResult.netSalary||0).toLocaleString('tr-TR')} ₺</p></div>}
          </div>
        </div>
      )}

      {activeTab === 'mevzuat' && (
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4">2026 Vergi Mevzuatı</h3>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-text font-semibold">KDV Oranları</p><p className="text-kaptan-muted">Genel: %20 • İndirimli: %10 • Gıda: %1 • Taşımacılık: %20</p></div>
            <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-text font-semibold">Kurumlar Vergisi</p><p className="text-kaptan-muted">%25 (2026) • Finans kurumları: %30</p></div>
            <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-text font-semibold">Gelir Vergisi Dilimleri (2026)</p><p className="text-kaptan-muted">%15 - 158.000₺ • %20 - 330.000₺ • %27 - 1.200.000₺ • %35 - 4.300.000₺ • %40 üzeri</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="kaptan-card p-4 text-center"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-kaptan-muted">{label}</p></div>;
}
