'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Shield, User, Clock, AlertTriangle, Activity, FileText } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try { const res = await api.get('/audit'); const data = res.data?.data?.data || res.data?.data || []; setLogs(Array.isArray(data) ? data : []); } catch { setLogs([]); }
    setLoading(false);
  };
  useEffect(() => { fetchLogs(); }, []);

  const actions = [...new Set(logs.map((l: any) => l.action || l.type).filter(Boolean))] as string[];
  const filtered = logs.filter((l: any) => {
    return (!search || JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) && (!actionFilter || (l.action || l.type) === actionFilter);
  });

  const getActionColor = (action: string) => {
    if (action?.includes('create') || action?.includes('CREATE')) return 'bg-green-500/10 text-green-400';
    if (action?.includes('update') || action?.includes('UPDATE')) return 'bg-blue-500/10 text-blue-400';
    if (action?.includes('delete') || action?.includes('DELETE')) return 'bg-red-500/10 text-red-400';
    if (action?.includes('login') || action?.includes('LOGIN')) return 'bg-purple-500/10 text-purple-400';
    return 'bg-gray-500/10 text-gray-400';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Shield size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">Denetim Kayıtları</h2></div>
        <div className="flex items-center gap-3 text-sm text-kaptan-muted"><span>{logs.length} kayıt</span><button onClick={fetchLogs} className="text-kaptan-primary hover:underline">Yenile</button></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[{ label: 'Toplam', value: logs.length, icon: FileText, color: 'text-kaptan-text' },{ label: 'Oluşturma', value: logs.filter(l => (l.action||l.type||'').toLowerCase().includes('create')).length, icon: Activity, color: 'text-kaptan-success' },{ label: 'Güncelleme', value: logs.filter(l => (l.action||l.type||'').toLowerCase().includes('update')).length, icon: Clock, color: 'text-kaptan-warning' },{ label: 'Silme', value: logs.filter(l => (l.action||l.type||'').toLowerCase().includes('delete')).length, icon: AlertTriangle, color: 'text-kaptan-danger' }].map(s => (
          <div key={s.label} className="glass-card p-4"><div className="flex items-center justify-between"><span className="text-sm text-kaptan-muted">{s.label}</span><s.icon size={18} className={s.color} /></div><p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative"><Search size={16} className="absolute left-3 top-3 text-kaptan-muted" /><input className="w-full glass-card pl-10 pr-4 py-2.5 text-sm text-kaptan-text" placeholder="Kullanıcı, işlem, detay ara..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="glass-card px-3 py-2 text-sm text-kaptan-text" value={actionFilter} onChange={e => setActionFilter(e.target.value)}><option value="">Tüm İşlemler</option>{actions.map(a => <option key={a} value={a}>{a}</option>)}</select>
      </div>

      {loading ? <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 skeleton rounded-lg" />)}</div> : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border"><tr className="text-left text-kaptan-muted"><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">Kullanıcı</th><th className="px-4 py-3">İşlem</th><th className="px-4 py-3">Detay</th><th className="px-4 py-3">IP</th></tr></thead>
            <tbody>
              {filtered.slice(0, 100).map((l: any, i: number) => (
                <tr key={l.id || i} className="border-b border-kaptan-border/50 hover:bg-kaptan-dark/20">
                  <td className="px-4 py-3 text-kaptan-muted text-xs whitespace-nowrap">{l.timestamp ? new Date(l.timestamp).toLocaleString('tr-TR') : l.createdAt ? new Date(l.createdAt).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><User size={14} className="text-kaptan-muted" /><span className="text-kaptan-text font-medium text-xs">{l.userName || l.userId?.slice(0, 8) || 'Sistem'}</span></div></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full font-medium ${getActionColor(l.action || l.type)}`}>{l.action || l.type || '-'}</span></td>
                  <td className="px-4 py-3 text-kaptan-muted text-xs max-w-[300px] truncate">{l.detail || l.description || l.entityId || '-'}</td>
                  <td className="px-4 py-3 text-kaptan-muted text-xs font-mono">{l.ip || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-kaptan-muted"><Shield size={36} className="mx-auto mb-2 opacity-30" />Denetim kaydı bulunamadı</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
