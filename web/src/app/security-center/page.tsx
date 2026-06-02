'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, AlertTriangle, Activity, Database, Server, HardDrive, RefreshCw, Download } from 'lucide-react';

export default function SecurityCenterPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backupMsg, setBackupMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/security/audit-logs?limit=20').catch(()=>({data:{data:[]}})),
      api.get('/admin/security/security-events?limit=20').catch(()=>({data:{data:[]}})),
      api.get('/admin/tests/health').catch(()=>({data:null})),
    ]).then(([aRes, sRes, hRes]) => {
      setAuditLogs(Array.isArray(aRes.data?.data?.logs||aRes.data?.data) ? (aRes.data?.data?.logs||aRes.data?.data) : []);
      setSecurityEvents(Array.isArray(sRes.data?.data?.events||sRes.data?.data) ? (sRes.data?.data?.events||sRes.data?.data) : []);
      setHealth(hRes.data?.data || hRes.data);
      setLoading(false);
    });
  }, []);

  const handleBackup = async () => {
    setBackupMsg('Yedekleme başlatıldı...');
    try { const r = await api.post('/admin/security/backup'); setBackupMsg(`Yedek alındı: ${r.data?.data?.path || 'tamamlandı'}`); } catch { setBackupMsg('Yedekleme başarısız'); }
  };

  if (loading) return <div className="p-6"><div className="h-64 bg-kaptan-card animate-pulse rounded" /></div>;

  const criticalCount = securityEvents.filter((e:any) => e.severity==='critical'||e.eventType==='INTRUSION'||e.level==='critical').length;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><Shield size={28} className="text-kaptan-primary" /> Güvenlik Merkezi</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Kritik Olay" value={criticalCount} color="text-kaptan-danger" icon={AlertTriangle} />
        <KPI label="Denetim Kaydı" value={auditLogs.length} color="text-kaptan-text" icon={Activity} />
        <KPI label="Güvenlik Olayı" value={securityEvents.length} color="text-kaptan-warning" icon={Shield} />
        <KPI label="Sistem Sağlığı" value={health?.status||'✅'} color="text-kaptan-success" icon={Server} />
      </div>

      <div className="flex gap-3">
        <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 bg-kaptan-warning text-white rounded-lg text-sm font-semibold hover:opacity-90"><Download size={14} /> Manuel Yedek Al</button>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 glass-card text-sm"><RefreshCw size={14} /> Yenile</button>
      </div>
      {backupMsg && <div className="p-3 bg-kaptan-success/10 text-kaptan-success rounded-lg text-sm">{backupMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Activity size={18} /> Son Denetim Kayıtları</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {auditLogs.map((log:any,i:number)=><div key={i} className="p-2.5 bg-kaptan-dark rounded-lg text-sm"><div className="flex justify-between"><p className="text-kaptan-text font-medium">{log.description||log.action||log.detail}</p><span className={`px-1.5 py-0.5 rounded text-xs ${log.action==='create'?'bg-kaptan-success/20 text-kaptan-success':log.action==='delete'?'bg-kaptan-danger/20 text-kaptan-danger':log.action==='update'?'bg-kaptan-info/20 text-kaptan-info':'bg-kaptan-muted/20 text-kaptan-muted'}`}>{log.action||log.type}</span></div><p className="text-kaptan-muted text-xs mt-1">{log.adminEmail||log.user} • {log.ip} • {log.timestamp ? new Date(log.timestamp).toLocaleString('tr-TR') : ''}</p></div>)}
            {auditLogs.length===0 && <p className="text-kaptan-muted text-sm text-center py-4">Denetim kaydı bulunamadı</p>}
          </div>
        </div>

        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><AlertTriangle size={18} /> Güvenlik Olayları</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {securityEvents.map((evt:any,i:number)=><div key={i} className="flex items-center justify-between p-2.5 bg-kaptan-dark rounded-lg text-sm"><div className="flex items-center gap-2"><span className={evt.severity==='critical'?'text-kaptan-danger':evt.severity==='warning'?'text-kaptan-warning':'text-kaptan-info'}>{evt.severity==='critical'?'🔴':evt.severity==='warning'?'🟡':'🔵'}</span><div><p className="text-kaptan-text">{evt.eventType||evt.title}</p><p className="text-kaptan-muted text-xs">{evt.description?.substring(0,60)}</p></div></div><span className="text-kaptan-muted text-xs">{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString('tr-TR') : ''}</span></div>)}
            {securityEvents.length===0 && <p className="text-kaptan-muted text-sm text-center py-4">Güvenlik olayı bulunamadı</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color, icon: Icon }: any) {
  return <div className="kaptan-card p-4 text-center"><Icon size={20} className={`mx-auto mb-1 ${color}`} /><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-kaptan-muted">{label}</p></div>;
}
