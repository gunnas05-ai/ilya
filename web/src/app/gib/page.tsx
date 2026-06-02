'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, FileText, Download, Eye, Send, Shield, FileCode } from 'lucide-react';

const INVOICE_TYPES = ['E-Fatura', 'E-Arşiv Fatura', 'Proforma Fatura', 'Temel Fatura', 'Ticari Fatura', 'İrsaliyeli Fatura', 'E-İrsaliye', 'İstisna Faturası', 'İhracat Faturası', 'Tevkifatlı Fatura', 'KDV Muaf Fatura'];
const STATUS_MAP: Record<string, string> = { draft: 'Taslak', pending: 'Bekliyor', sent: 'Gönderildi', approved: 'Onaylandı', rejected: 'Reddedildi', cancelled: 'İptal', archived: 'Arşivlendi' };

export default function GibPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoiceType: 'E-Arşiv Fatura', customerName: '', customerTaxNo: '', customerEmail: '',
    customerAddress: '', description: '', quantity: '1', unitPrice: '', vatRate: '20',
    notes: '', currency: 'TRY',
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoice');
      const data = res.data?.data?.data || res.data?.data || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch { setInvoices([]); }
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const calcTotal = () => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.unitPrice) || 0;
    const subtotal = qty * price;
    const vat = subtotal * (parseFloat(form.vatRate) / 100);
    return { subtotal, vat, total: subtotal + vat };
  };
  const totals = calcTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/invoice/${editing.id}`, form);
      } else {
        await api.post('/invoice/create', { ...form, items: [{ description: form.description, quantity: parseFloat(form.quantity), unitPrice: parseFloat(form.unitPrice), vatRate: parseFloat(form.vatRate) }] });
      }
      setShowForm(false); setEditing(null); resetForm(); fetchInvoices();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await api.post(`/invoice/${id}/preview`);
      const pdf = res.data?.data?.pdfBase64 || res.data?.data;
      if (pdf) setPreviewUrl(`data:application/pdf;base64,${pdf}`);
    } catch { alert('PDF önizleme hatası'); }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Bu belgeyi onaylamak istediğinize emin misiniz?')) return;
    try { await api.post(`/invoice/${id}/approve`); fetchInvoices(); }
    catch (err: any) { alert(err.response?.data?.message || 'Onay hatası'); }
  };

  const resetForm = () => setForm({ invoiceType: 'E-Arşiv Fatura', customerName: '', customerTaxNo: '', customerEmail: '', customerAddress: '', description: '', quantity: '1', unitPrice: '', vatRate: '20', notes: '', currency: 'TRY' });

  const filtered = invoices.filter((inv: any) =>
    !search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    (typeof inv.invoiceType === 'string' && inv.invoiceType.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">GİB e-Belge Yönetimi</h2>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
          <Plus size={18} /> Yeni Belge
        </button>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Belge no, müşteri ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kaptan-border text-kaptan-muted">
                <th className="text-left p-3">Belge No</th>
                <th className="text-left p-3">Tür</th>
                <th className="text-left p-3">Müşteri</th>
                <th className="text-left p-3">Tutar</th>
                <th className="text-left p-3">Tarih</th>
                <th className="text-left p-3">Durum</th>
                <th className="text-left p-3">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-kaptan-muted">Henüz belge bulunmuyor</td></tr>
              ) : filtered.map((inv: any) => (
                <tr key={inv.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                  <td className="p-3 font-mono text-xs text-kaptan-text">{inv.invoiceNo || inv.id?.slice(0, 8)}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/20 text-kaptan-primary">{inv.invoiceType}</span></td>
                  <td className="p-3 text-kaptan-text">{inv.customerName || '-'}</td>
                  <td className="p-3 text-kaptan-text font-medium">{Number(inv.grandTotal || 0).toLocaleString('tr-TR')} ₺</td>
                  <td className="p-3 text-kaptan-muted text-xs">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      inv.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      inv.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                      inv.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{STATUS_MAP[inv.status] || inv.status}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => handlePreview(inv.id)} className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary" title="PDF Önizle"><Eye size={16} /></button>
                      <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/invoice/xml/${inv.id}`} target="_blank"
                        className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400 inline-block" title="XML İndir"><FileCode size={16} /></a>
                      <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/invoice/pdf/${inv.id}`} target="_blank"
                        className="p-1.5 hover:bg-green-500/20 rounded text-green-400 inline-block" title="PDF İndir"><Download size={16} /></a>
                      {inv.status === 'draft' && (
                        <button onClick={() => handleApprove(inv.id)} className="p-1.5 hover:bg-kaptan-success/20 rounded text-kaptan-success" title="Onayla"><Shield size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-3 border-b">
              <h3 className="font-semibold text-gray-900">Belge Önizleme</h3>
              <button onClick={() => setPreviewUrl(null)} className="text-gray-500 hover:text-gray-700 px-3 py-1">Kapat</button>
            </div>
            <iframe src={previewUrl} className="w-full h-full" />
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Yeni e-Belge Oluştur</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Belge Tipi *</label>
                <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                  value={form.invoiceType} onChange={e => setForm({...form, invoiceType: e.target.value})}>
                  {INVOICE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Alıcı Adı *</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">VKN/TCKN *</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.customerTaxNo} onChange={e => setForm({...form, customerTaxNo: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">E-Posta</label>
                <input type="email" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                  value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Adres</label>
                <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={2}
                  value={form.customerAddress} onChange={e => setForm({...form, customerAddress: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Hizmet Açıklaması *</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Miktar</label>
                  <input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Birim Fiyat (₺)</label>
                  <input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">KDV %</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.vatRate} onChange={e => setForm({...form, vatRate: e.target.value})}>
                    <option value="1">%1</option><option value="10">%10</option><option value="20">%20</option>
                  </select>
                </div>
              </div>
              <div className="bg-kaptan-dark rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between text-kaptan-muted"><span>Ara Toplam</span><span>{totals.subtotal.toFixed(2)} ₺</span></div>
                <div className="flex justify-between text-kaptan-muted"><span>KDV (%{form.vatRate})</span><span>{totals.vat.toFixed(2)} ₺</span></div>
                <div className="flex justify-between text-kaptan-text font-semibold"><span>Genel Toplam</span><span>{totals.total.toFixed(2)} ₺</span></div>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">
                  {saving ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
