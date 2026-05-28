'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FileText, CheckCircle, AlertTriangle, XCircle, FileCheck, ClipboardList, Search } from 'lucide-react';

const DOC_LABELS: Record<string, string> = { cmr: 'CMR Belgesi', invoice: 'Fatura', insurance: 'Sigorta Poliçesi', weight_ticket: 'Tartı Fişi', delivery_note: 'İrsaliye', customs: 'Gümrük Beyanı', adr: 'ADR Belgesi', other: 'Diğer' };

export default function DocumentsPage() {
  const [allStatus, setAllStatus] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/documents/all-status').catch(() => ({ data: { data: [] } })),
      api.get('/documents/dashboard').catch(() => ({ data: { data: null } })),
    ]).then(([s, d]) => {
      setAllStatus(Array.isArray(s.data?.data) ? s.data.data : []);
      setDashboard(d.data?.data || null);
      setLoading(false);
    });
  }, []);

  const filtered = allStatus.filter((s: any) => !search || s.shipmentId?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList size={24} className="text-kaptan-primary" />
        <h2 className="text-2xl font-bold text-kaptan-text">Evrak Yönetimi</h2>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><FileText size={20} className="mx-auto mb-1 text-kaptan-primary" /><p className="text-2xl font-bold text-kaptan-text">{dashboard.total}</p><p className="text-xs text-kaptan-muted">Toplam Evrak</p></div>
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><CheckCircle size={20} className="mx-auto mb-1 text-kaptan-success" /><p className="text-2xl font-bold text-kaptan-success">{dashboard.verified}</p><p className="text-xs text-kaptan-muted">Doğrulanmış</p></div>
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><AlertTriangle size={20} className="mx-auto mb-1 text-kaptan-warning" /><p className="text-2xl font-bold text-kaptan-warning">{dashboard.missingCount}</p><p className="text-xs text-kaptan-muted">Eksik Evrak</p></div>
          <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-4 text-center"><FileCheck size={20} className="mx-auto mb-1 text-kaptan-primary" /><p className="text-2xl font-bold text-kaptan-text">{Object.keys(dashboard.typeBreakdown || {}).length}</p><p className="text-xs text-kaptan-muted">Evrak Tipi</p></div>
        </div>
      )}

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted" placeholder="Sevkiyat ID ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {filtered.map((s: any) => (
            <div key={s.shipmentId} className={`bg-kaptan-card border rounded-xl p-4 ${s.status === 'incomplete' ? 'border-kaptan-warning/40' : 'border-kaptan-border'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-kaptan-text">{s.shipmentId?.slice(0, 16)}...</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {s.status === 'complete' ? '✅ Tam' : `⚠️ ${s.missing?.length || 0} eksik`}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {s.missing?.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 flex items-center gap-1"><XCircle size={10} /> {DOC_LABELS[t] || t}</span>
                    ))}
                    {s.docs?.filter((d: any) => d.status === 'verified').map((d: any) => (
                      <span key={d.id} className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 flex items-center gap-1"><CheckCircle size={10} /> {DOC_LABELS[d.type] || d.type}</span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-kaptan-muted">{s.docCount} evrak</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
