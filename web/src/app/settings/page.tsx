'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Settings, Save, Tag, Percent, FileText, Eye, Edit3, Plus, Trash2, Copy, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'general' | 'commission' | 'promo' | 'kvkk'>('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Commission
  const [commissionRates, setCommissionRates] = useState<any[]>([]);
  const [newCommission, setNewCommission] = useState({ type: '', rate: '' });

  // Promo codes
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount: '', maxUses: '', expiresAt: '' });
  const [generatedCode, setGeneratedCode] = useState('');

  // KVKK
  const [kvkkText, setKvkkText] = useState('');
  const [termsText, setTermsText] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const generatePromoCode = () => {
    const code = 'KPT' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    setNewPromo(prev => ({ ...prev, code }));
  };

  const handleSaveCommission = async () => {
    if (!newCommission.type || !newCommission.rate) return;
    setSaving(true);
    try {
      await api.post('/billing/commission', { category: newCommission.type, rate: parseFloat(newCommission.rate) });
      setNewCommission({ type: '', rate: '' });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleSavePromo = async () => {
    if (!newPromo.code || !newPromo.discount) return;
    setSaving(true);
    try {
      await api.post('/admin/promo-codes', newPromo);
      setNewPromo({ code: '', discount: '', maxUses: '', expiresAt: '' });
      setGeneratedCode('');
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleSaveKvkk = async () => {
    setSaving(true);
    try {
      await api.put('/admin/system-settings', { kvkkText, termsText });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">Sistem Ayarları</h2>
        </div>
        {saved && <span className="flex items-center gap-1 text-kaptan-success text-sm"><CheckCircle size={14} /> Kaydedildi</span>}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { key: 'general', label: 'Genel', icon: Settings },
          { key: 'commission', label: 'Komisyon Oranları', icon: Percent },
          { key: 'promo', label: 'Promosyon Kodları', icon: Tag },
          { key: 'kvkk', label: 'KVKK & Sözleşmeler', icon: FileText },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted hover:text-kaptan-text'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-kaptan-border/50">
            <div><span className="text-kaptan-text font-medium">QuickPay</span><p className="text-xs text-kaptan-muted mt-1">Teslimat onayında anında ödeme özelliği</p></div>
            <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-400 font-medium">Aktif</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-kaptan-border/50">
            <div><span className="text-kaptan-text font-medium">Platform Komisyonu</span><p className="text-xs text-kaptan-muted mt-1">Varsayılan oran</p></div>
            <span className="text-kaptan-warning font-bold">%3.5</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-kaptan-border/50">
            <div><span className="text-kaptan-text font-medium">GİB Mock Modu</span><p className="text-xs text-kaptan-muted mt-1">Test ortamında gerçek GİB\'e bağlanmaz</p></div>
            <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400 font-medium">Aktif</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-kaptan-border/50">
            <div><span className="text-kaptan-text font-medium">Ödeme Sağlayıcı</span><p className="text-xs text-kaptan-muted mt-1">Aktif ödeme entegrasyonu</p></div>
            <span className="text-kaptan-muted text-sm">Mock (İyzico Sandbox)</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div><span className="text-kaptan-text font-medium">API Versiyonu</span><p className="text-xs text-kaptan-muted mt-1">Backend API sürümü</p></div>
            <span className="text-kaptan-muted text-sm">v1.0.0</span>
          </div>
        </div>
      )}

      {tab === 'commission' && (
        <div className="space-y-6">
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
            <h3 className="font-semibold text-kaptan-text mb-4">Komisyon Oranı Ekle</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm text-kaptan-muted mb-1">Kategori</label>
                <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                  value={newCommission.type} onChange={e => setNewCommission({...newCommission, type: e.target.value})}>
                  <option value="">Seçiniz</option>
                  <option value="platform_match">Platform Eşleştirme</option>
                  <option value="own_carrier">Kendi Taşıyıcı</option>
                  <option value="escrow_acceleration">Escrow Hızlandırma</option>
                  <option value="insurance">Sigorta</option>
                  <option value="fuel_card">Yakıt Kartı</option>
                  <option value="early_payment">Erken Ödeme</option>
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm text-kaptan-muted mb-1">Oran (%)</label>
                <input type="number" step="0.1" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                  value={newCommission.rate} onChange={e => setNewCommission({...newCommission, rate: e.target.value})}
                  placeholder="3.5" />
              </div>
              <button onClick={handleSaveCommission} disabled={saving}
                className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> {saving ? '...' : 'Kaydet'}
              </button>
            </div>
          </div>
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
                <tr className="text-left text-kaptan-muted"><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Oran</th><th className="px-4 py-3">İşlem</th></tr>
              </thead>
              <tbody>
                <tr className="border-b border-kaptan-border/50"><td className="px-4 py-3 text-kaptan-text">Platform Eşleştirme</td><td className="px-4 py-3 text-kaptan-warning">%2.0</td><td className="px-4 py-3"><button className="text-kaptan-danger text-xs hover:underline"><Trash2 size={14} /></button></td></tr>
                <tr className="border-b border-kaptan-border/50"><td className="px-4 py-3 text-kaptan-text">Sigorta</td><td className="px-4 py-3 text-kaptan-warning">%15.0</td><td className="px-4 py-3"><button className="text-kaptan-danger text-xs hover:underline"><Trash2 size={14} /></button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'promo' && (
        <div className="space-y-6">
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
            <h3 className="font-semibold text-kaptan-text mb-4">Promosyon Kodu Oluştur</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Kod</label>
                <div className="flex gap-1">
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text font-mono"
                    value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} placeholder="KPTXXXX" />
                  <button onClick={generatePromoCode} className="px-2 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-primary hover:bg-kaptan-primary/10" title="Rastgele Kod"><Copy size={14} /></button>
                </div>
                {generatedCode && <p className="text-xs text-kaptan-success mt-1">Kod oluşturuldu: {generatedCode}</p>}
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">İndirim (%)</label>
                <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                  value={newPromo.discount} onChange={e => setNewPromo({...newPromo, discount: e.target.value})} placeholder="10" />
              </div>
              <div>
                <label className="block text-sm text-kaptan-muted mb-1">Maks. Kullanım</label>
                <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                  value={newPromo.maxUses} onChange={e => setNewPromo({...newPromo, maxUses: e.target.value})} placeholder="100" />
              </div>
              <button onClick={handleSavePromo} disabled={saving}
                className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50 flex items-center gap-2 h-[42px]">
                <Plus size={14} /> {saving ? '...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'kvkk' && (
        <div className="space-y-6">
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-kaptan-text">KVKK Gizlilik Politikası</h3>
              <div className="flex gap-2">
                <button onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-kaptan-border rounded-lg text-sm text-kaptan-muted hover:text-kaptan-text">
                  {previewMode ? <Edit3 size={14} /> : <Eye size={14} />} {previewMode ? 'Düzenle' : 'Önizle'}
                </button>
              </div>
            </div>
            {previewMode ? (
              <div className="bg-white text-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto prose prose-sm">
                <h2 className="text-lg font-bold mb-3">KVKK Aydınlatma Metni</h2>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{kvkkText || 'KVKK metni henüz girilmemiş.'}</div>
                <hr className="my-4" />
                <h2 className="text-lg font-bold mb-3">Kullanıcı Sözleşmesi</h2>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{termsText || 'Kullanıcı sözleşmesi henüz girilmemiş.'}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-2">KVKK Metni (HTML destekli)</label>
                  <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-4 py-3 text-kaptan-text font-mono text-sm"
                    rows={10} value={kvkkText}
                    onChange={e => setKvkkText(e.target.value)}
                    placeholder="<h2>KVKK Aydınlatma Metni</h2><p>...</p>" />
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-2">Kullanıcı Sözleşmesi (HTML destekli)</label>
                  <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-4 py-3 text-kaptan-text font-mono text-sm"
                    rows={10} value={termsText}
                    onChange={e => setTermsText(e.target.value)}
                    placeholder="<h2>Kullanıcı Sözleşmesi</h2><p>...</p>" />
                </div>
                <button onClick={handleSaveKvkk} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">
                  <Save size={14} /> {saving ? 'Kaydediliyor...' : 'KVKK Metinlerini Kaydet'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
