'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FileText, TrendingUp, CheckCircle, Clock, QrCode, Eye } from 'lucide-react';

export default function AccountantDashboardPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [kdvSummary, setKdvSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all'|'pending'>('all');
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/invoice/accountant/pending?status=${activeTab==='all'?'':activeTab}`).catch(()=>({data:[]})),
      api.get('/invoice/accountant/kdv-summary').catch(()=>({data:null})),
    ]).then(([invRes, kdvRes]) => {
      setInvoices(Array.isArray(invRes.data?.data||invRes.data) ? (invRes.data?.data||invRes.data) : []);
      setKdvSummary(kdvRes.data?.data || kdvRes.data);
      setLoading(false);
    });
  }, [activeTab]);

  const handleQR = async (invId: string) => {
    try { const r = await api.get(`/invoice/qr/${invId}`); setQrData(r.data?.data?.qrDataUrl || r.data?.qrDataUrl); } catch { alert('QR alınamadı'); }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><FileText size={28} className="text-kaptan-primary" /> Muhasebeci Paneli</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Bekleyen Fatura" value={invoices.filter(i=>i.status==='pending').length} icon={Clock} color="text-kaptan-warning" />
        <KPI label="Onaylanan" value={invoices.filter(i=>i.status==='approved').length} icon={CheckCircle} color="text-kaptan-success" />
        <KPI label="Aylık KDV" value={`${((kdvSummary?.totalVat||0)/1000).toFixed(0)}k ₺`} icon={TrendingUp} color="text-kaptan-info" />
        <KPI label="Toplam Ciro" value={`${((kdvSummary?.totalTurnover||0)/1000).toFixed(0)}k ₺`} icon={FileText} color="text-kaptan-text" />
      </div>

      {kdvSummary?.monthlyBreakdown && (
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4">Aylık KDV Özeti</h3>
          <table className="w-full text-sm"><thead><tr className="text-kaptan-muted"><th className="text-left pb-2">Dönem</th><th className="text-right pb-2">Fatura</th><th className="text-right pb-2">Toplam</th><th className="text-right pb-2">KDV</th></tr></thead><tbody>
            {kdvSummary.monthlyBreakdown.map((m:any,i:number)=><tr key={i} className="border-t border-kaptan-border/50"><td className="py-2 text-kaptan-text">{m.period}</td><td className="py-2 text-right text-kaptan-muted">{m.count}</td><td className="py-2 text-right text-kaptan-text">{m.total?.toLocaleString('tr-TR')} ₺</td><td className="py-2 text-right text-kaptan-info font-semibold">{m.vat?.toLocaleString('tr-TR')} ₺</td></tr>)}
          </tbody></table>
        </div>
      )}

      <div className="kaptan-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-kaptan-text">Faturalar</h3>
          <div className="flex gap-2">
            {(['all','pending'] as const).map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${activeTab===t?'bg-kaptan-primary text-white':'bg-kaptan-card text-kaptan-muted'}`}>{t==='all'?'Tümü':'Onay Bekleyen'}</button>)}
          </div>
        </div>
        {loading ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-kaptan-dark animate-pulse rounded-lg" />)}</div>
        : invoices.length===0 ? <p className="text-center text-kaptan-muted py-8">Fatura bulunamadı</p>
        : <div className="space-y-2">{invoices.slice(0,20).map((inv:any)=><div key={inv.id} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg"><div><p className="text-kaptan-text text-sm font-semibold">{inv.invoiceNumber}</p><p className="text-kaptan-muted text-xs">{inv.customerName||'Müşteri'} • {inv.totalAmount?.toLocaleString('tr-TR')} ₺</p></div><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-xs ${inv.status==='approved'?'bg-kaptan-success/20 text-kaptan-success':inv.status==='pending'?'bg-kaptan-warning/20 text-kaptan-warning':'bg-kaptan-muted/20 text-kaptan-muted'}`}>{inv.status==='pending'?'Onay Bekliyor':inv.status==='approved'?'Onaylandı':inv.status}</span><button onClick={()=>handleQR(inv.id)} className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><QrCode size={14} /></button></div></div>)}</div>}
      </div>

      {qrData && <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setQrData(null)}><div className="bg-white p-6 rounded-2xl" onClick={e=>e.stopPropagation()}><img src={qrData} alt="QR" className="w-64 h-64" /><button onClick={()=>setQrData(null)} className="mt-3 w-full py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-sm">Kapat</button></div></div>}
    </div>
  );
}

function KPI({ label, value, icon: Icon, color }: any) {
  return <div className="kaptan-card p-4 text-center"><Icon size={20} className={`mx-auto mb-1 ${color}`} /><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-kaptan-muted">{label}</p></div>;
}
