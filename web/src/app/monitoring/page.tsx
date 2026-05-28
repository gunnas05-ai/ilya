'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Activity, Server, Database, Wifi, Cpu, HardDrive, Clock, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MonitoringPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ uptime: '99.9%', apiLatency: '45ms', dbConnections: 12, wsConnections: 0, memoryUsage: '256MB', cpuUsage: '15%' });

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data?.data || res.data);
    } catch { setHealth(null); }
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); }, []);

  const services = [
    { name: 'API Sunucusu', icon: Server, status: health?.status === 'HEALTHY', key: 'api' },
    { name: 'Veritabanı', icon: Database, status: health?.services?.database === 'healthy', key: 'database' },
    { name: 'Redis', icon: Cpu, status: health?.services?.redis === 'healthy', key: 'redis' },
    { name: 'WebSocket', icon: Wifi, status: health?.services?.websocket === 'healthy', key: 'websocket' },
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
          <div key={svc.key} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <svc.icon size={20} className={svc.status ? 'text-kaptan-success' : 'text-kaptan-danger'} />
              {svc.status ? <CheckCircle size={16} className="text-kaptan-success" /> : <AlertTriangle size={16} className="text-kaptan-danger" />}
            </div>
            <p className="text-lg font-semibold text-kaptan-text mt-2">{svc.name}</p>
            <p className={`text-xs ${svc.status ? 'text-kaptan-success' : 'text-kaptan-danger'}`}>{svc.status ? 'Sağlıklı' : 'HATA'}</p>
          </div>
        ))}
      </div>

      {/* Metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Uptime', value: metrics.uptime, icon: Clock, color: 'text-kaptan-success' },
          { label: 'API p95 Gecikme', value: metrics.apiLatency, icon: Activity, color: 'text-kaptan-primary' },
          { label: 'DB Bağlantı', value: metrics.dbConnections, icon: Database, color: 'text-kaptan-text' },
          { label: 'WS Bağlantı', value: metrics.wsConnections, icon: Wifi, color: 'text-kaptan-primary' },
          { label: 'Bellek', value: metrics.memoryUsage, icon: HardDrive, color: 'text-kaptan-warning' },
          { label: 'CPU', value: metrics.cpuUsage, icon: Cpu, color: 'text-kaptan-text' },
        ].map(m => (
          <div key={m.label} className="bg-kaptan-card border border-kaptan-border rounded-xl p-4">
            <div className="text-xs text-kaptan-muted mb-1">{m.label}</div>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-bold ${m.color}`}>{m.value}</span>
              <m.icon size={18} className={m.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Prometheus & DevOps bilgi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
          <h3 className="font-semibold text-kaptan-text mb-3">API Metrikleri</h3>
          <div className="space-y-3">
            {[
              { label: 'Ortalama Yanıt Süresi', value: '45ms', pct: 30 },
              { label: 'p95 Yanıt Süresi', value: '120ms', pct: 45 },
              { label: 'p99 Yanıt Süresi', value: '250ms', pct: 65 },
              { label: 'Hata Oranı', value: '%0.12', pct: 5 },
              { label: 'İstek/Dakika', value: '1,250', pct: 40 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1"><span className="text-kaptan-muted">{item.label}</span><span className="text-kaptan-text font-medium">{item.value}</span></div>
                <div className="w-full bg-kaptan-dark rounded-full h-1.5"><div className="bg-kaptan-primary h-1.5 rounded-full" style={{ width: `${item.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
          <h3 className="font-semibold text-kaptan-text mb-3">Sistem Bilgisi</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-kaptan-muted">Backend Versiyonu</span><span className="text-kaptan-text">v1.0.0</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Node.js</span><span className="text-kaptan-text">v24.15.0</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">NestJS</span><span className="text-kaptan-text">v10.4</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Veritabanı</span><span className="text-kaptan-text">PostgreSQL 15 + PostGIS</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Redis</span><span className="text-kaptan-text">v7</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Kafka</span><span className="text-kaptan-text">Devre Dışı (EventEmitter2)</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">API Gateway</span><span className="text-kaptan-text">APISIX :9080</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Ortam</span><span className="text-kaptan-text">{process.env.NODE_ENV || 'development'}</span></div>
            <div className="flex justify-between"><span className="text-kaptan-muted">Prometheus</span><span className="text-kaptan-success text-xs">Aktif</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
