'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { safeText } from '@/lib/utils';
import { Plus, Search, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Upload } from 'lucide-react';

const INCOME_TYPES = ['maaş', 'kira', 'ticari_kazanc', 'yatırım', 'yardım', 'taşıma_kazancı', 'diğer'];
const EXPENSE_CATEGORIES_LOJISTIK = ['yakit', 'bakim', 'sigorta', 'vergi', 'personel', 'kredi_leasing', 'lastik', 'yol_kopru_tunel', 'park', 'ceza', 'diğer'];
const EXPENSE_CATEGORIES_AILE = ['fatura', 'market', 'sağlık', 'eğitim', 'ulaşım', 'kira', 'eğlence', 'giyim', 'diğer'];

export default function FinancePage() {
  const [tab, setTab] = useState<'incomes' | 'expenses' | 'dashboard'>('dashboard');
  const [incomes, setIncomes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [form, setForm] = useState({
    category: '', type: '', amount: '', description: '', date: '',
    paymentMethod: '', vehiclePlate: '', relatedPerson: '', location: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incRes, expRes, plRes] = await Promise.all([
        api.get('/finance/incomes').catch(() => ({ data: { data: [] } })),
        api.get('/finance/expenses').catch(() => ({ data: { data: [] } })),
        api.get('/finance/profit-loss').catch(() => ({ data: { data: null } })),
      ]);
      setIncomes(Array.isArray(incRes.data?.data?.data || incRes.data?.data) ? (incRes.data?.data?.data || incRes.data?.data) : []);
      setExpenses(Array.isArray(expRes.data?.data?.data || expRes.data?.data) ? (expRes.data?.data?.data || expRes.data?.data) : []);
      setProfitLoss(plRes.data?.data || null);
    } catch { setIncomes([]); setExpenses([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const endpoint = formType === 'income' ? '/finance/incomes' : '/finance/expenses';
    const payload = formType === 'income'
      ? { type: form.type, amount: parseFloat(form.amount), description: form.description, date: form.date, paymentMethod: form.paymentMethod }
      : { category: form.category, amount: parseFloat(form.amount), description: form.description, date: form.date, vehiclePlate: form.vehiclePlate, relatedPerson: form.relatedPerson, location: form.location, paymentMethod: form.paymentMethod };

    try {
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setShowForm(false); setEditing(null); resetForm(); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (type: 'income' | 'expense', id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    const endpoint = type === 'income' ? `/finance/incomes/${id}` : `/finance/expenses/${id}`;
    try { await api.delete(endpoint); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  const handleOcrUpload = async () => {
    if (!ocrFile) return;
    setOcrLoading(true);
    const formData = new FormData();
    formData.append('file', ocrFile);
    try {
      const res = await api.post('/finance/ocr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOcrResult(res.data?.data);
      if (res.data?.data) {
        setForm({
          ...form,
          amount: res.data.data.amount?.toString() || '',
          description: res.data.data.merchant || '',
          date: res.data.data.date || '',
        });
      }
    } catch (err: any) { alert('OCR işleme hatası'); }
    setOcrLoading(false);
  };

  const resetForm = () => setForm({ category: '', type: '', amount: '', description: '', date: '', paymentMethod: '', vehiclePlate: '', relatedPerson: '', location: '' });

  const totalIncome = incomes.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const totalExpense = expenses.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Finans Yönetimi</h2>
        <div className="flex gap-2">
          <button onClick={() => { resetForm(); setFormType('income'); setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-kaptan-success text-white px-4 py-2 rounded-lg hover:bg-kaptan-success/90 text-sm">
            <Plus size={16} /> Gelir Ekle
          </button>
          <button onClick={() => { resetForm(); setFormType('expense'); setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-kaptan-danger text-white px-4 py-2 rounded-lg hover:bg-kaptan-danger/90 text-sm">
            <Plus size={16} /> Gider Ekle
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['dashboard', 'incomes', 'expenses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted hover:text-kaptan-text'}`}>
            {t === 'dashboard' ? 'Dashboard' : t === 'incomes' ? 'Gelirler' : 'Giderler'}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><TrendingUp className="text-kaptan-success" size={24} /><span className="text-kaptan-muted text-sm">Toplam Gelir</span></div>
              <p className="text-2xl font-bold text-kaptan-success mt-2">{totalIncome.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><TrendingDown className="text-kaptan-danger" size={24} /><span className="text-kaptan-muted text-sm">Toplam Gider</span></div>
              <p className="text-2xl font-bold text-kaptan-danger mt-2">{totalExpense.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
              <div className="flex items-center gap-3"><DollarSign className="text-kaptan-primary" size={24} /><span className="text-kaptan-muted text-sm">Net Durum</span></div>
              <p className={`text-2xl font-bold mt-2 ${totalIncome - totalExpense >= 0 ? 'text-kaptan-success' : 'text-kaptan-danger'}`}>
                {(totalIncome - totalExpense).toLocaleString('tr-TR')} ₺
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
              <h3 className="font-semibold text-kaptan-text mb-3">Son Gelirler</h3>
              {incomes.slice(0, 5).map((inc: any) => (
                <div key={inc.id} className="flex justify-between py-2 border-b border-kaptan-border/50 text-sm">
                  <span className="text-kaptan-text">{inc.type || inc.description}</span>
                  <span className="text-kaptan-success">+{Number(inc.amount || 0).toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
              {incomes.length === 0 && <p className="text-kaptan-muted text-sm">Henüz gelir kaydı yok</p>}
            </div>
            <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
              <h3 className="font-semibold text-kaptan-text mb-3">Son Giderler</h3>
              {expenses.slice(0, 5).map((exp: any) => (
                <div key={exp.id} className="flex justify-between py-2 border-b border-kaptan-border/50 text-sm">
                  <span className="text-kaptan-text">{safeText(exp.category) || exp.description}</span>
                  <span className="text-kaptan-danger">-{Number(exp.amount || 0).toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-kaptan-muted text-sm">Henüz gider kaydı yok</p>}
            </div>
          </div>
        </div>
      )}

      {tab !== 'dashboard' && (
        <>
          <div className="mb-4 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
            <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
              placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kaptan-border text-kaptan-muted">
                  <th className="text-left p-3">Tarih</th>
                  <th className="text-left p-3">{tab === 'incomes' ? 'Gelir Türü' : 'Kategori'}</th>
                  <th className="text-left p-3">Tutar</th>
                  <th className="text-left p-3">Açıklama</th>
                  <th className="text-left p-3">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'incomes' ? incomes : expenses).filter((item: any) =>
                  !search || JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
                ).map((item: any) => (
                  <tr key={item.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                    <td className="p-3 text-kaptan-muted">{item.date ? new Date(item.date).toLocaleDateString('tr-TR') : '-'}</td>
                    <td className="p-3 text-kaptan-text">{item.type || safeText(item.category)}</td>
                    <td className={`p-3 font-medium ${tab === 'incomes' ? 'text-kaptan-success' : 'text-kaptan-danger'}`}>
                      {tab === 'incomes' ? '+' : '-'}{Number(item.amount || 0).toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="p-3 text-kaptan-muted max-w-[200px] truncate">{item.description}</td>
                    <td className="p-3">
                      <button onClick={() => handleDelete(tab === 'incomes' ? 'income' : 'expense', item.id)}
                        className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {(tab === 'incomes' ? incomes : expenses).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-kaptan-muted">Henüz kayıt bulunmuyor</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">
              {formType === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
            </h3>

            <div className="mb-4 p-3 bg-kaptan-dark border border-kaptan-border rounded-lg">
              <label className="block text-sm text-kaptan-muted mb-2">OCR ile Fiş/Fatura Tara</label>
              <div className="flex gap-2">
                <input type="file" accept="image/*" onChange={e => setOcrFile(e.target.files?.[0] || null)}
                  className="text-sm text-kaptan-muted file:bg-kaptan-primary file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-2" />
                <button onClick={handleOcrUpload} disabled={!ocrFile || ocrLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-kaptan-primary text-white rounded-lg text-sm disabled:opacity-50">
                  <Upload size={14} /> {ocrLoading ? 'İşleniyor...' : 'Tara'}
                </button>
              </div>
              {ocrResult && (
                <div className="mt-2 text-xs text-kaptan-success">
                  OCR başarılı — Güven skoru: %{Math.round((ocrResult.confidence || 0) * 100)}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {formType === 'income' ? (
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Gelir Türü *</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="">Seçiniz</option>
                    {INCOME_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Kategori *</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">Seçiniz</option>
                    <optgroup label="Lojistik">
                      {EXPENSE_CATEGORIES_LOJISTIK.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Aile">
                      {EXPENSE_CATEGORIES_AILE.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Tutar (₺) *</label>
                  <input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required
                    value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Tarih</label>
                  <input type="date" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                    value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Açıklama</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              {formType === 'expense' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Araç Plakası</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                      value={form.vehiclePlate} onChange={e => setForm({...form, vehiclePlate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Ödeme Yöntemi</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                      value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} />
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); setOcrResult(null); }}
                  className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted hover:text-kaptan-text">İptal</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
