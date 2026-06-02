'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Activity, Server, Database, Wifi, Cpu, HardDrive, Clock, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}d`;
  return `${m} dk`;
}

function formatMemory(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      const data = res.data?.data || res.data;
      setHealth(data);
    } catch { setHealth(null); }
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); }, []);

  const services = [
    { name: 'API Sunucusu', icon: Server, status: health?.status === 'HEALTHY', key: 'api' },
    { name: 'Veritabanı', icon: Database, status: health?.services?.database?.status === 'healthy', key: 'database' },
    { name: 'Redis', icon: Cpu, status: health?.services?.redis?.status === 'healthy', key: 'redis' },
    { name: 'WebSocket', icon: Wifi, status: health?.services?.websocket?.status === 'healthy', key: 'websocket' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Activity size={24} className="text-kaptan-primary" /><h2 className="text-2xl font-bold text-kaptan-text">Sistem İzleme</h2></div>
        <button onClick={fetchHealth} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline"><RefreshCw size={14} /> Yenile</button>
      </div>

      {/* Sistem durumu */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {services.map(svc => (
          <div key={svc.key} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <svc.icon size={20} className={svc.status ? 'text-kaptan-success' : 'text-kaptan-danger'} />
              {svc.status ? <CheckCircle size={16} className="text-kaptan-success" /> : <AlertTriangle size={16} className="text-kaptan-danger" />}
            </div>
            <p className="text-lg font-semibold text-kaptan-text mt-2">{svc.name}</p>
            <p className={`text-xs ${svc.status ? 'text-kaptan-success' : 'text-kaptan-danger'}`}>{svc.status ? 'Sağlıklı' : 'HATA'}</p>
          </div>
        ))}
      </div>

      {/* Metrikler — canli health verisinden turetilir */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Uptime', value: health?.uptime ? formatUptime(health.uptime) : '—', icon: Clock, color: 'text-kaptan-success' },
          { label: 'API Durumu', value: health?.status || '—', icon: Activity, color: health?.status === 'HEALTHY' ? 'text-kaptan-success' : 'text-kaptan-danger' },
          { label: 'DB Gecikme', value: health?.services?.database?.latency ? `${health.services.database.latency}ms` : '—', icon: Database, color: 'text-kaptan-text' },
          { label: 'Ortam', value: health?.environment || '—', icon: Wifi, color: 'text-kaptan-primary' },
          { label: 'Bellek', value: health?.memory ? formatMemory(health.memory) : '—', icon: HardDrive, color: 'text-kaptan-warning' },
          { label: 'CPU Load', value: health?.cpu ? health.cpu.toFixed(1) : '—', icon: Cpu, color: 'text-kaptan-text' },
        ].map(m => (
          <div key={m.label} className="glass-card p-4">
            <div className="text-xs text-kaptan-muted mb-1">{m.label}</div>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-bold ${m.color}`}>{m.value}</span>
              <m.icon size={18} className={m.color} />
            </div>
          </div>
        ))}
      </div>

      {/* API metrikleri — health endpoint'inden canli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-kaptan-text mb-3">Servis Durumları</h3>
          <div className="space-y-3">
            {health?.services ? Object.entries(health.services).map(([key, svc]: any) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-kaptan-muted capitalize">{key}</span>
                  <span className={`font-medium ${svc.status === 'healthy' ? 'text-kaptan-success' : svc.status === 'degraded' ? 'text-kaptan-warning' : 'text-kaptan-danger'}`}>
                    {svc.status || 'unknown'}
                  </span>
                </div>
                <div className="w-full bg-kaptan-dark rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${svc.status === 'healthy' ? 'bg-kaptan-success' : svc.status === 'degraded' ? 'bg-kaptan-warning' : 'bg-kaptan-danger'}`}
                    style={{ width: svc.status === 'healthy' ? '100%' : svc.status === 'degraded' ? '50%' : '20%' }} />
                </div>
              </div>
            )) : <p className="text-kaptan-muted text-sm">Health verisi yüklenemedi</p>}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="font-semibold text-kaptan-text mb-3">Sistem Bilgisi</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-kaptan-muted">Backend Versiyonu</span><span className="text-kaptan-text">{health?.version || 'v1.0.0'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Ortam</span><span className="text-kaptan-text">{health?.environment || 'development'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Uptime</span><span className="text-kaptan-text">{health?.uptime ? formatUptime(health.uptime) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Bellek (Heap)</span><span className="text-kaptan-text">{health?.memory ? formatMemory(health.memory) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">CPU Load Avg</span><span className="text-kaptan-text">{health?.cpu ? health.cpu.toFixed(2) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Timestamp</span><span className="text-kaptan-text text-xs">{health?.timestamp ? new Date(health.timestamp).toLocaleString('tr-TR') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Metrics</span><span className="text-kaptan-success text-xs">Prometheus /metrics</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
