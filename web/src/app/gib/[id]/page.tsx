'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, FileText, User, Building, Hash, Calendar, Banknote, Send, CheckCircle, XCircle, Download, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-kaptan-muted/20 text-kaptan-muted', pending: 'bg-kaptan-warning/20 text-kaptan-warning',
  sent: 'bg-kaptan-info/20 text-kaptan-info', approved: 'bg-kaptan-success/20 text-kaptan-success',
  rejected: 'bg-kaptan-danger/20 text-kaptan-danger', cancelled: 'bg-kaptan-danger/20 text-kaptan-danger',
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/invoice/${id}`).then(r => setInv(r.data?.data || r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const endpoints: Record<string, string> = { approve: `/invoice/${id}/approve`, send: `/invoice/${id}/send-gib`, cancel: `/invoice/${id}/cancel`, accountant: `/invoice/${id}/send-accountant` };
      await api.post(endpoints[action]);
      const r = await api.get(`/invoice/${id}`);
      setInv(r.data?.data || r.data);
    } catch { alert('İşlem başarısız'); }
    setActionLoading(null);
  };

  const handlePreview = async () => {
    try { const r = await api.post(`/invoice/${id}/preview`); setPdfPreview(r.data?.data?.pdfBase64 || r.data?.pdfBase64 || r.data?.data); } catch { alert('Önizleme alınamadı'); }
  };

  if (loading) return <div className="p-6"><div className="h-64 bg-kaptan-card animate-pulse rounded" /></div>;
  if (!inv) return <div className="p-6 text-center text-kaptan-muted">Fatura bulunamadı</div>;

  const statusColor = STATUS_COLORS[inv.status] || 'bg-kaptan-muted/20 text-kaptan-muted';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text"><ArrowLeft size={18} /> Geri</button>

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-kaptan-text">{inv.invoiceNumber || inv.id}</h1><p className="text-kaptan-muted text-sm">{inv.type || 'E-Fatura'} • {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('tr-TR') : '-'}</p></div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>{inv.status === 'draft' ? 'Taslak' : inv.status === 'pending' ? 'Onay Bekliyor' : inv.status === 'sent' ? 'Gönderildi' : inv.status === 'approved' ? 'Onaylandı' : inv.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Building size={18} /> Taraflar</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-3 bg-kaptan-dark rounded-lg">
                <p className="text-xs text-kaptan-muted mb-1">Tedarikçi</p>
                <p className="text-kaptan-text font-semibold">{inv.supplierName || '-'}</p>
                <p className="text-kaptan-muted text-xs">VKN: {inv.supplierTaxNo || '-'} • {inv.supplierTaxOffice || '-'}</p>
              </div>
              <div className="p-3 bg-kaptan-dark rounded-lg">
                <p className="text-xs text-kaptan-muted mb-1">Müşteri</p>
                <p className="text-kaptan-text font-semibold">{inv.customerName || '-'}</p>
                <p className="text-kaptan-muted text-xs">VKN: {inv.customerTaxNo || '-'} • {inv.customerTaxOffice || '-'}</p>
              </div>
            </div>
          </div>

          {inv.items?.length > 0 && <div className="kaptan-card p-6"><h3 className="font-bold text-kaptan-text mb-3">Kalemler</h3><table className="w-full text-sm"><thead><tr className="text-kaptan-muted text-xs"><th className="text-left pb-2">Açıklama</th><th className="text-right pb-2">Miktar</th><th className="text-right pb-2">Birim Fiyat</th><th className="text-right pb-2">KDV</th><th className="text-right pb-2">Toplam</th></tr></thead><tbody>{inv.items.map((item: any, i: number) => (<tr key={i} className="border-t border-kaptan-border/50"><td className="py-2 text-kaptan-text">{item.name}</td><td className="py-2 text-right text-kaptan-muted">{item.quantity}</td><td className="py-2 text-right text-kaptan-muted">{item.unitPrice?.toLocaleString('tr-TR')} ₺</td><td className="py-2 text-right text-kaptan-muted">%{item.vatRate || 20}</td><td className="py-2 text-right text-kaptan-text font-medium">{((item.quantity||1)*(item.unitPrice||0)).toLocaleString('tr-TR')} ₺</td></tr>))}</tbody></table></div>}

          <div className="kaptan-card p-6"><h3 className="font-bold text-kaptan-text mb-3">Finansal Özet</h3><div className="space-y-2 text-sm"><Row label="Ara Toplam" value={inv.subtotal || 0} /><Row label="İndirim" value={inv.discountTotal || 0} deduct /><Row label="KDV Matrahı" value={(inv.subtotal||0)-(inv.discountTotal||0)} /><Row label="KDV" value={inv.vatAmount || 0} /><div className="border-t border-kaptan-border pt-2 mt-2"><Row label="Genel Toplam" value={inv.totalAmount || inv.grandTotal || 0} bold /></div></div></div>
        </div>

        <div className="space-y-4">
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-3">İşlemler</h3>
            <div className="space-y-2">
              {inv.status === 'draft' && <><button onClick={() => handleAction('approve')} disabled={actionLoading === 'approve'} className="w-full py-2 bg-kaptan-success text-white rounded-lg text-sm font-semibold disabled:opacity-50"><CheckCircle size={14} className="inline mr-1" /> Onayla</button></>}
              {inv.status === 'pending' && <button onClick={() => handleAction('send')} disabled={actionLoading === 'send'} className="w-full py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50"><Send size={14} className="inline mr-1" /> GİB&apos;e Gönder</button>}
              {['draft','pending'].includes(inv.status) && <button onClick={() => handleAction('cancel')} disabled={actionLoading === 'cancel'} className="w-full py-2 bg-kaptan-danger/20 text-kaptan-danger rounded-lg text-sm font-semibold disabled:opacity-50"><XCircle size={14} className="inline mr-1" /> İptal Et</button>}
              <button onClick={() => handleAction('accountant')} disabled={actionLoading === 'accountant'} className="w-full py-2 bg-kaptan-info/20 text-kaptan-info rounded-lg text-sm font-semibold disabled:opacity-50">Muhasebeciye Gönder</button>
            </div>
          </div>

          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-3">Belgeler</h3>
            <div className="space-y-2">
              <a href={`/api/v1/invoice/pdf/${id}`} target="_blank" className="flex items-center gap-2 w-full py-2 bg-kaptan-card border border-kaptan-border rounded-lg text-sm text-kaptan-text hover:bg-kaptan-primary/10 justify-center"><Download size={14} /> PDF İndir</a>
              <a href={`/api/v1/invoice/xml/${id}`} target="_blank" className="flex items-center gap-2 w-full py-2 bg-kaptan-card border border-kaptan-border rounded-lg text-sm text-kaptan-text hover:bg-kaptan-primary/10 justify-center"><Download size={14} /> XML İndir</a>
              <button onClick={handlePreview} className="flex items-center gap-2 w-full py-2 bg-kaptan-card border border-kaptan-border rounded-lg text-sm text-kaptan-text hover:bg-kaptan-primary/10 justify-center"><Eye size={14} /> PDF Önizleme</button>
            </div>
            {pdfPreview && <div className="mt-3 p-3 bg-kaptan-dark rounded-lg text-center"><iframe src={`data:application/pdf;base64,${pdfPreview}`} className="w-full h-96 rounded" /></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, deduct, bold }: { label: string; value: number; deduct?: boolean; bold?: boolean }) {
  return <div className="flex justify-between"><span className="text-kaptan-muted">{label}</span><span className={`${bold?'text-kaptan-text font-bold':deduct?'text-kaptan-danger':'text-kaptan-text'}`}>{deduct?'-':''}{value.toLocaleString('tr-TR')} ₺</span></div>;
}
