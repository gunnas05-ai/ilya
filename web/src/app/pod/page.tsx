'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, FileCheck, Camera, PenTool, QrCode, Eye, Download, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function PodPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showPreview, setShowPreview] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try { const res = await api.get('/pod'); setItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); }
    catch { setItems([]); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = items.filter((p: any) => !search || p.loadTitle?.toLowerCase().includes(search.toLowerCase()) || p.signatureName?.toLowerCase().includes(search.toLowerCase()) || p.driverName?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: items.length,
    signed: items.filter(p => p.signatureUrl).length,
    photoed: items.filter(p => p.photos?.length > 0).length,
    verified: items.filter(p => p.verified).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><FileCheck size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">ePOD — Teslimat Kanıtları</h2></div>
        <button onClick={fetchData} className="text-sm text-kaptan-primary hover:underline">Yenile</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Kanıt', value: stats.total, icon: FileCheck, color: 'text-kaptan-primary' },
          { label: 'İmzalı', value: stats.signed, icon: PenTool, color: 'text-kaptan-success' },
          { label: 'Fotoğraflı', value: stats.photoed, icon: Camera, color: 'text-kaptan-warning' },
          { label: 'Doğrulanmış', value: stats.verified, icon: CheckCircle, color: 'text-kaptan-success' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center justify-between"><span className="text-sm text-kaptan-muted">{s.label}</span><s.icon size={20} className={s.color} /></div>
            <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Yük, sürücü, imza ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((p: any) => (
            <div key={p.id} className="glass-card p-4 hover:border-kaptan-primary/30 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-kaptan-text">{p.loadTitle || 'Teslimat Kanıtı'}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${p.verified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {p.verified ? 'Doğrulandı' : 'Bekliyor'}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-kaptan-muted">
                    <span>Sürücü: {p.driverName || '-'}</span>
                    <span>Plaka: {p.plateNumber || '-'}</span>
                    <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    {p.signatureUrl && (
                      <button onClick={() => setShowPreview({ type: 'signature', url: p.signatureUrl, name: p.signatureName })} className="flex items-center gap-1 text-xs text-kaptan-success hover:underline">
                        <PenTool size={12} /> İmza: {p.signatureName}
                      </button>
                    )}
                    {p.photos?.length > 0 && (
                      <button onClick={() => setShowPreview({ type: 'photo', urls: p.photos })} className="flex items-center gap-1 text-xs text-kaptan-primary hover:underline">
                        <Camera size={12} /> {p.photos.length} Fotoğraf
                      </button>
                    )}
                    {p.qrCode && (
                      <span className="flex items-center gap-1 text-xs text-kaptan-muted"><QrCode size={12} /> QR Doğrulandı</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(selected?.id === p.id ? null : p)} className="px-2 py-1 text-xs bg-kaptan-dark border border-kaptan-border rounded text-kaptan-muted hover:text-kaptan-text">
                    <Eye size={14} /> Detay
                  </button>
                </div>
              </div>

              {selected?.id === p.id && (
                <div className="mt-3 pt-3 border-t border-kaptan-border grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-kaptan-muted">Teslim Tarihi:</span><p className="text-kaptan-text">{p.deliveryDate ? new Date(p.deliveryDate).toLocaleString('tr-TR') : '-'}</p></div>
                  <div><span className="text-kaptan-muted">GPS Konum:</span><p className="text-kaptan-text">{p.gpsLat ? `${p.gpsLat}, ${p.gpsLng}` : '-'}</p></div>
                  <div><span className="text-kaptan-muted">Cihaz:</span><p className="text-kaptan-text font-mono">{p.deviceFingerprint?.slice(0, 16) || '-'}</p></div>
                  <div><span className="text-kaptan-muted">Doğrulama:</span><p className={p.verified ? 'text-kaptan-success' : 'text-kaptan-warning'}>{p.verified ? '✓ Tamamlandı' : 'Bekleniyor'}</p></div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-kaptan-muted">
              <FileCheck size={56} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Henüz teslimat kanıtı bulunmuyor</p>
              <p className="text-sm mt-1">Teslimatlar tamamlandıkça ePOD kayıtları burada görünecek</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(null)}>
          <div className="glass-card rounded-2xl p-4 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-kaptan-text">{showPreview.type === 'signature' ? `İmza: ${showPreview.name}` : 'Teslimat Fotoğrafları'}</h3>
              <button onClick={() => setShowPreview(null)} className="p-1.5 hover:bg-kaptan-dark rounded text-kaptan-muted"><X size={18} /></button>
            </div>
            {showPreview.type === 'signature' ? (
              <div className="bg-white rounded-xl p-8 flex items-center justify-center"><img src={showPreview.url} alt="İmza" className="max-h-60" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {showPreview.urls?.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Foto ${i+1}`} className="rounded-xl w-full h-48 object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
