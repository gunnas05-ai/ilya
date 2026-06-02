'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FlaskConical, Play, Activity, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';

export default function TestCenterPage() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/tests/stats').catch(()=>({data:null})),
      api.get('/admin/tests/health').catch(()=>({data:[]})),
      api.get('/admin/tests/runs').catch(()=>({data:[]})),
    ]).then(([sRes, hRes, rRes]) => {
      setStats(sRes.data?.data || sRes.data);
      setHealth(Array.isArray(hRes.data?.data||hRes.data) ? (hRes.data?.data||hRes.data) : []);
      setRuns(Array.isArray(rRes.data?.data||rRes.data) ? (rRes.data?.data||rRes.data).slice(0,10) : []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleRunAll = async () => {
    setRunning(true);
    try { await api.post('/admin/tests/run/all'); setTimeout(fetchData, 3000); } catch { alert('Test başlatılamadı'); }
    setRunning(false);
  };

  const handleHealthCheck = async () => {
    setHealthChecking(true);
    try { await api.post('/admin/tests/health/check'); setTimeout(fetchData, 2000); } catch { alert('Kontrol başarısız'); }
    setHealthChecking(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><FlaskConical size={28} className="text-kaptan-primary" /> Test Merkezi</h1>

      {loading ? <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-20 bg-kaptan-card animate-pulse rounded-xl" />)}</div>
      : <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Geçme Oranı" value={`%${stats?.passRate||0}`} color="text-kaptan-success" icon={CheckCircle} />
        <KPI label="Toplam Test" value={stats?.totalRuns||0} color="text-kaptan-text" icon={Activity} />
        <KPI label="Başarılı" value={stats?.passed||0} color="text-kaptan-success" icon={CheckCircle} />
        <KPI label="Başarısız" value={stats?.failed||0} color="text-kaptan-danger" icon={XCircle} />
      </div>}

      <div className="flex gap-3">
        <button onClick={handleRunAll} disabled={running} className="flex items-center gap-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50"><Play size={14} /> {running?'Çalışıyor...':'Tüm Testleri Çalıştır'}</button>
        <button onClick={handleHealthCheck} disabled={healthChecking} className="flex items-center gap-2 px-4 py-2 bg-kaptan-info/20 text-kaptan-info rounded-lg text-sm font-semibold disabled:opacity-50"><Activity size={14} /> Sağlık Kontrolü</button>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 glass-card text-sm"><RefreshCw size={14} /> Yenile</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4">Servis Sağlığı</h3>
          <div className="space-y-2">
            {health.map((svc: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
                <span className="text-kaptan-text text-sm font-medium">{svc.service||svc.name||'Servis'}</span>
                <div className="flex items-center gap-3">
                  {svc.responseTime && <span className="text-kaptan-muted text-xs">{svc.responseTime}ms</span>}
                  <span className={`w-2.5 h-2.5 rounded-full ${svc.status==='healthy'||svc.status==='ok'?'bg-kaptan-success':svc.status==='degraded'?'bg-kaptan-warning':'bg-kaptan-danger'}`} />
                </div>
              </div>
            ))}
            {health.length===0 && <p className="text-kaptan-muted text-sm text-center py-4">Sağlık verisi yok</p>}
          </div>
        </div>

        <div className="kaptan-card p-6">
          <h3 className="font-bold text-kaptan-text mb-4">Test Geçmişi</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {runs.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-kaptan-dark rounded-lg text-sm">
                <div><p className="text-kaptan-text">{r.name||r.testName||'Test'}</p><p className="text-kaptan-muted text-xs flex items-center gap-1"><Clock size={10} /> {r.timestamp ? new Date(r.timestamp).toLocaleString('tr-TR') : '-'}</p></div>
                <div className="flex items-center gap-2">
                  {r.duration && <span className="text-kaptan-muted text-xs">{r.duration}ms</span>}
                  {r.passed||r.status==='passed' ? <CheckCircle size={16} className="text-kaptan-success" /> : <XCircle size={16} className="text-kaptan-danger" />}
                </div>
              </div>
            ))}
            {runs.length===0 && <p className="text-kaptan-muted text-sm text-center py-4">Henüz test çalıştırılmamış</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color, icon: Icon }: any) {
  return <div className="kaptan-card p-4 text-center"><Icon size={20} className={`mx-auto mb-1 ${color}`} /><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-kaptan-muted">{label}</p></div>;
}
