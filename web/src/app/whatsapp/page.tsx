'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MessageSquare, Save, Send, Settings, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function WhatsAppPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get('/admin/whatsapp/settings').then(r => {
      setSettings(r.data?.data || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/whatsapp/settings', settings);
      alert('✅ Ayarlar kaydedildi.');
    } catch { alert('Hata oluştu.'); }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testPhone) return;
    setTesting(true);
    try {
      const res = await api.post('/admin/whatsapp/test', { phone: testPhone });
      setTestResult(res.data || res);
    } catch { setTestResult({ success: false, message: 'Bağlantı hatası' }); }
    setTesting(false);
  };

  const update = (field: string, value: any) => setSettings({ ...settings, [field]: value });

  if (loading) return <div className="p-4"><div className="h-64 skeleton rounded-xl" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={24} className="text-kaptan-success" />
        <h2 className="text-2xl font-bold text-kaptan-text">WhatsApp Entegrasyonu</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ayarlar */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2"><Settings size={18} /> API Yapılandırması</h3>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={settings.enabled} onChange={e => update('enabled', e.target.checked)} className="rounded" />
              <span className="text-sm text-kaptan-text font-medium">WhatsApp Entegrasyonunu Aktif Et</span>
            </label>

            <div>
              <label className="block text-sm text-kaptan-muted mb-1">Phone Number ID</label>
              <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm font-mono"
                value={settings.phoneNumberId || ''} onChange={e => update('phoneNumberId', e.target.value)}
                placeholder="123456789012345" />
            </div>

            <div>
              <label className="block text-sm text-kaptan-muted mb-1">Business Account ID</label>
              <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm font-mono"
                value={settings.businessAccountId || ''} onChange={e => update('businessAccountId', e.target.value)}
                placeholder="987654321098765" />
            </div>

            <div>
              <label className="block text-sm text-kaptan-muted mb-1">Access Token</label>
              <input type="password" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm font-mono"
                value={settings.accessToken || ''} onChange={e => update('accessToken', e.target.value)}
                placeholder="EAA..." />
            </div>

            <div>
              <label className="block text-sm text-kaptan-muted mb-1">Webhook Verify Token</label>
              <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm font-mono"
                value={settings.webhookVerifyToken || ''} onChange={e => update('webhookVerifyToken', e.target.value)}
                placeholder="kaptan_webhook_123" />
            </div>

            <div>
              <label className="block text-sm text-kaptan-muted mb-1">Varsayılan Gönderici No</label>
              <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm"
                value={settings.defaultPhoneNumber || ''} onChange={e => update('defaultPhoneNumber', e.target.value)}
                placeholder="+905300000000" />
            </div>

            <div className="border-t border-kaptan-border pt-4 space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={settings.sendLoadNotifications} onChange={e => update('sendLoadNotifications', e.target.checked)} className="rounded" />
                <span className="text-sm text-kaptan-text">Yük bildirimleri gönder</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={settings.sendTrackingLinks} onChange={e => update('sendTrackingLinks', e.target.checked)} className="rounded" />
                <span className="text-sm text-kaptan-text">Takip linkleri gönder</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={settings.sendPaymentConfirmations} onChange={e => update('sendPaymentConfirmations', e.target.checked)} className="rounded" />
                <span className="text-sm text-kaptan-text">Ödeme onayları gönder</span>
              </label>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-kaptan-primary text-white px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </button>
          </div>
        </div>

        {/* Test + Durum */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-kaptan-text mb-4 flex items-center gap-2"><Send size={18} /> Test Mesajı Gönder</h3>
            <div className="flex gap-3">
              <input className="flex-1 bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text text-sm"
                placeholder="+905300000000" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
              <button onClick={handleTest} disabled={testing || !testPhone}
                className="flex items-center gap-2 bg-kaptan-success text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
                <Send size={16} /> {testing ? '...' : 'Test Et'}
              </button>
            </div>
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {testResult.message}
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-kaptan-text mb-3">📋 Kurulum Adımları</h3>
            <ol className="text-sm text-kaptan-muted space-y-2 list-decimal list-inside">
              <li><a href="https://developers.facebook.com/" target="_blank" className="text-kaptan-primary hover:underline">Meta Developers</a>'da uygulama oluştur</li>
              <li>WhatsApp → API Setup → Phone Number ID'yi al</li>
              <li>System User oluştur, Access Token üret</li>
              <li>Webhook URL: <code className="text-kaptan-text bg-kaptan-dark px-2 py-0.5 rounded">https://api.kaptan.app/api/v1/whatsapp/webhook</code></li>
              <li>Webhook Verify Token'ı yukarıdaki alana gir</li>
              <li>Ayarları kaydet ve Test Mesajı gönder</li>
            </ol>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-kaptan-text mb-3">Durum</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {settings.enabled ? <CheckCircle size={14} className="text-kaptan-success" /> : <XCircle size={14} className="text-kaptan-danger" />}
                <span className="text-kaptan-text">Entegrasyon: {settings.enabled ? 'Aktif' : 'Pasif'}</span>
              </div>
              <div className="flex items-center gap-2">
                {settings.accessToken ? <CheckCircle size={14} className="text-kaptan-success" /> : <XCircle size={14} className="text-kaptan-danger" />}
                <span className="text-kaptan-text">Access Token: {settings.accessToken ? '✓ Tanımlı' : '✗ Eksik'}</span>
              </div>
              <div className="flex items-center gap-2">
                {settings.phoneNumberId ? <CheckCircle size={14} className="text-kaptan-success" /> : <XCircle size={14} className="text-kaptan-danger" />}
                <span className="text-kaptan-text">Phone Number ID: {settings.phoneNumberId ? '✓ Tanımlı' : '✗ Eksik'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
