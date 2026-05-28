'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Trash2, Copy, Key, Link as LinkIcon, RefreshCw } from 'lucide-react';

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'api-keys' | 'webhooks'>('api-keys');
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [keyRes, whRes] = await Promise.all([
        api.get('/integrations/api-keys').catch(() => ({ data: { data: [] } })),
        api.get('/integrations/webhooks').catch(() => ({ data: { data: [] } })),
      ]);
      setApiKeys(Array.isArray(keyRes.data?.data?.data || keyRes.data?.data) ? (keyRes.data?.data?.data || keyRes.data?.data) : []);
      setWebhooks(Array.isArray(whRes.data?.data?.data || whRes.data?.data) ? (whRes.data?.data?.data || whRes.data?.data) : []);
    } catch { setApiKeys([]); setWebhooks([]); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createApiKey = async () => {
    if (!keyName) return;
    try {
      const res = await api.post('/integrations/api-keys', { name: keyName });
      setNewKey(res.data?.data?.key || res.data?.data?.apiKey);
      setKeyName(''); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Bu API key\'i silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/integrations/api-keys/${id}`); fetchData(); } catch {}
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Bu webhook\'u silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/integrations/webhooks/${id}`); fetchData(); } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Entegrasyonlar</h2>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
          <Plus size={18} /> {tab === 'api-keys' ? 'API Key Oluştur' : 'Webhook Ekle'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['api-keys', 'webhooks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted'}`}>
            {t === 'api-keys' ? 'API Keys' : 'Webhooks'}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        tab === 'api-keys' ? (
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Ad</th><th className="text-left p-3">Key Prefix</th><th className="text-left p-3">Oluşturulma</th><th className="text-left p-3">Son Kullanım</th><th className="text-left p-3">İşlemler</th></tr></thead>
              <tbody>
                {apiKeys.map((k: any) => (
                  <tr key={k.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                    <td className="p-3 text-kaptan-text font-medium">{k.name}</td>
                    <td className="p-3 font-mono text-xs text-kaptan-muted">{k.keyPrefix || k.key?.slice(0, 12)}...</td>
                    <td className="p-3 text-kaptan-muted text-xs">{k.createdAt ? new Date(k.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                    <td className="p-3 text-kaptan-muted text-xs">{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString('tr-TR') : 'Hiç'}</td>
                    <td className="p-3"><button onClick={() => deleteApiKey(k.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
                {apiKeys.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-kaptan-muted">API Key bulunmuyor</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((w: any) => (
              <div key={w.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <LinkIcon size={16} className="text-kaptan-primary" />
                      <span className="font-medium text-kaptan-text">{w.url}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-kaptan-muted">
                      <span>Event: {w.events?.join(', ') || w.event}</span>
                      <span className={w.isActive ? 'text-kaptan-success' : 'text-kaptan-danger'}>{w.isActive ? 'Aktif' : 'Pasif'}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteWebhook(w.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {webhooks.length === 0 && <div className="text-center py-12 text-kaptan-muted">Webhook bulunmuyor</div>}
          </div>
        )
      )}

      {showCreate && tab === 'api-keys' && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-20 z-50">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Yeni API Key</h3>
            {newKey ? (
              <div>
                <div className="bg-kaptan-success/10 border border-kaptan-success/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-kaptan-success mb-1">API Key oluşturuldu. Bu key bir daha gösterilmeyecek!</p>
                  <div className="flex items-center gap-2 bg-kaptan-dark rounded p-2 font-mono text-sm text-kaptan-text break-all">{newKey}
                    <button onClick={() => { navigator.clipboard.writeText(newKey); }} className="text-kaptan-primary"><Copy size={14} /></button>
                  </div>
                </div>
                <button onClick={() => { setNewKey(null); setShowCreate(false); }} className="w-full py-2 bg-kaptan-primary text-white rounded-lg">Tamam</button>
              </div>
            ) : (
              <div>
                <label className="block text-sm text-kaptan-muted mb-2">Key Adı</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text mb-4"
                  value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="örn: Mobil Uygulama" />
                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                  <button onClick={createApiKey} disabled={!keyName} className="flex-1 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">Oluştur</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
