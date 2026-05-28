'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, CheckCircle, XCircle, Eye, Shield, FileCheck, AlertTriangle, Clock } from 'lucide-react';

const VERIFICATION_FIELDS = [
  { key: 'isIdentityVerified', label: 'Kimlik Doğrulama' },
  { key: 'isSrcVerified', label: 'SRC Belgesi' },
  { key: 'isKBelgesiVerified', label: 'K Belgesi' },
  { key: 'isPlateVerified', label: 'Plaka Doğrulama' },
  { key: 'escrowAccountVerified', label: 'Escrow Hesap' },
];

export default function CarrierProfilesPage() {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?role=tasiyici');
      const data = res.data?.data?.data || res.data?.data || [];
      setCarriers(Array.isArray(data) ? data.filter((u: any) => u.role === 'tasiyici' || u.role === 'sofor') : []);
    } catch {
      try {
        const res = await api.get('/carrier-api');
        setCarriers(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []);
      } catch { setCarriers([]); }
    }
    setLoading(false);
  };

  useEffect(() => { fetchCarriers(); }, []);

  const handleVerify = async (userId: string, field: string, value: boolean) => {
    setVerifying(userId + field);
    try {
      await api.patch(`/users/${userId}/verify`, { field, value: !value });
      fetchCarriers();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setVerifying(null);
  };

  const getCompletionPct = (c: any) => {
    const fields = ['isIdentityVerified', 'isSrcVerified', 'isKBelgesiVerified', 'isPlateVerified', 'escrowAccountVerified', 'tcKimlikNo'];
    const filled = fields.filter(f => c[f]).length;
    return Math.round((filled / fields.length) * 100);
  };

  const filtered = carriers.filter((c: any) => !search || c.fullName?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.plateNumber?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Shield size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">Taşıyıcı Profil Doğrulama</h2></div>
        <span className="text-sm text-kaptan-muted">{carriers.length} taşıyıcı • {carriers.filter((c: any) => c.profileStatus === 'VERIFIED').length} doğrulanmış</span>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="İsim, e-posta, plaka ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-kaptan-card rounded-lg animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((c: any) => {
            const pct = getCompletionPct(c);
            return (
              <div key={c.id} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 hover:border-kaptan-primary/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-kaptan-text">{c.fullName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${c.profileStatus === 'VERIFIED' ? 'bg-green-500/20 text-green-400' : c.profileStatus === 'PENDING_REVIEW' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {c.profileStatus === 'VERIFIED' ? 'Doğrulandı' : c.profileStatus === 'PENDING_REVIEW' ? 'İncelemede' : c.profileStatus === 'SUSPENDED' ? 'Askıda' : 'Eksik'}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-kaptan-muted">
                      <span>{c.email}</span><span>{c.phone}</span>
                      {c.plateNumber && <span>🚛 {c.plateNumber}</span>}
                      {c.vehicleType && <span>{c.vehicleType}</span>}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-kaptan-dark rounded-full h-1.5 max-w-[200px]">
                          <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-kaptan-success' : pct >= 50 ? 'bg-kaptan-warning' : 'bg-kaptan-danger'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-kaptan-muted">%{pct} tamamlandı</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSelected(selected?.id === c.id ? null : c)}
                      className="px-2 py-1 text-xs bg-kaptan-primary/10 text-kaptan-primary rounded hover:bg-kaptan-primary/20"><Eye size={12} /> Detay</button>
                  </div>
                </div>

                {selected?.id === c.id && (
                  <div className="mt-3 pt-3 border-t border-kaptan-border grid grid-cols-2 md:grid-cols-3 gap-2">
                    {VERIFICATION_FIELDS.map(f => (
                      <div key={f.key} className="flex items-center justify-between bg-kaptan-dark rounded-lg px-3 py-2">
                        <span className="text-xs text-kaptan-muted">{f.label}</span>
                        <button onClick={() => handleVerify(c.id, f.key, c[f.key])} disabled={verifying === c.id + f.key}
                          className={`p-1 rounded ${c[f.key] ? 'text-kaptan-success' : 'text-kaptan-muted'}`}>
                          {c[f.key] ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-kaptan-dark rounded-lg px-3 py-2">
                      <span className="text-xs text-kaptan-muted">K Belgesi No</span>
                      <span className="text-xs text-kaptan-text">{c.kBelgesi || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-kaptan-dark rounded-lg px-3 py-2">
                      <span className="text-xs text-kaptan-muted">SRC Belge No</span>
                      <span className="text-xs text-kaptan-text">{c.srcBelgesi || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-kaptan-dark rounded-lg px-3 py-2">
                      <span className="text-xs text-kaptan-muted">IBAN</span>
                      <span className="text-xs text-kaptan-text font-mono">{c.iban ? '****' + c.iban.slice(-4) : '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-kaptan-muted">Taşıyıcı bulunamadı</div>}
        </div>
      )}
    </div>
  );
}
