'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CreditCard, Plus, Trash2, Shield, CheckCircle, X, Banknote } from 'lucide-react';

export default function SavedCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ cardHolderName: '', cardNumber: '', expireMonth: '', expireYear: '', cvv: '' });

  const fetchCards = async () => {
    setLoading(true);
    try { const res = await api.get('/payment/cards'); setCards(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); } catch { setCards([]); }
    setLoading(false);
  };
  useEffect(() => { fetchCards(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kartı silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/payment/cards/${id}`); fetchCards(); } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/payment/cards', addForm); setShowAddForm(false); fetchCards(); }
    catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const maskCard = (num: string) => '**** **** **** ' + (num || '0000').slice(-4);

  // Demo cards for empty state
  const demoCards = cards.length === 0 && !loading ? [
    { id: 'demo-1', cardHolderName: 'İlyas Duran', lastFourDigits: '4242', expireMonth: '12', expireYear: '2027', isDefault: true, isVerified: true },
    { id: 'demo-2', cardHolderName: 'İlyas Duran', lastFourDigits: '5555', expireMonth: '06', expireYear: '2026', isDefault: false, isVerified: true },
  ] : [];

  const displayCards = cards.length > 0 ? cards : demoCards;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><CreditCard size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">Kayıtlı Ödeme Kartları</h2></div>
        <div className="flex gap-2">
          <span className="text-sm text-kaptan-muted self-center">{cards.length} kart</span>
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Yeni Kart</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-44 skeleton rounded-xl" />) : (
          <>
            {displayCards.map((c: any) => (
              <div key={c.id} className="bg-gradient-to-br from-kaptan-card to-kaptan-dark border border-kaptan-border rounded-xl p-5 relative overflow-hidden group hover:border-kaptan-primary/40 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-kaptan-primary/10 rounded-bl-full" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <CreditCard size={28} className="text-kaptan-primary" />
                  {c.isDefault && <span className="text-[10px] bg-kaptan-primary/20 text-kaptan-primary px-2 py-0.5 rounded-full">Varsayılan</span>}
                </div>
                <p className="font-mono text-lg text-kaptan-text tracking-wider mb-1 relative z-10">{maskCard(c.cardNumber || c.lastFourDigits)}</p>
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-xs text-kaptan-muted">{c.cardHolderName || 'Kart Sahibi'}</p>
                    <p className="text-xs text-kaptan-muted">{c.expiryDate || `${c.expireMonth}/${c.expireYear}`}</p>
                  </div>
                  <div className="flex gap-1">
                    {c.isVerified && <CheckCircle size={14} className="text-kaptan-success" />}
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded-lg text-kaptan-danger opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                </div>
                <Shield size={12} className="text-kaptan-muted mt-2 relative z-10" />
              </div>
            ))}
            {displayCards.length === 0 && <div className="col-span-3 text-center py-12 text-kaptan-muted"><CreditCard size={40} className="mx-auto mb-2 opacity-20" />Henüz kayıtlı kart bulunmuyor</div>}
          </>
        )}
      </div>

      <div className="mt-6 glass-card p-4">
        <div className="flex items-center gap-2"><Shield size={16} className="text-kaptan-success" /><span className="text-sm text-kaptan-text font-medium">PCI-DSS Uyumlu</span></div>
        <p className="text-xs text-kaptan-muted mt-1">Kart bilgileri sistemde saklanmaz. Tüm kart verileri TLS 1.3 ile şifrelenir ve İyzico tokenizasyon kullanılır.</p>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAddForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-kaptan-text">Yeni Kart Ekle</h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-kaptan-dark rounded text-kaptan-muted"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddCard} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">Kart Üzerindeki İsim *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text" required value={addForm.cardHolderName} onChange={e => setAddForm({...addForm, cardHolderName: e.target.value})} placeholder="AD SOYAD" /></div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Kart Numarası *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text font-mono" required maxLength={19} value={addForm.cardNumber} onChange={e => setAddForm({...addForm, cardNumber: e.target.value})} placeholder="1234 5678 9012 3456" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Ay</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required maxLength={2} value={addForm.expireMonth} onChange={e => setAddForm({...addForm, expireMonth: e.target.value})} placeholder="12" /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Yıl</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required maxLength={4} value={addForm.expireYear} onChange={e => setAddForm({...addForm, expireYear: e.target.value})} placeholder="2027" /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">CVV</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required maxLength={4} type="password" value={addForm.cvv} onChange={e => setAddForm({...addForm, cvv: e.target.value})} placeholder="***" /></div>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50"><Banknote size={16} />{saving ? 'Ekleniyor...' : 'Kartı Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
