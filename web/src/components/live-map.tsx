'use client';

import { useEffect, useRef, useState } from 'react';
import { Circle } from 'lucide-react';

interface VehiclePosition {
  id: string;
  latitude: number;
  longitude: number;
  plateNumber?: string;
  driverName?: string;
  speed?: number;
  heading?: number;
  status?: 'moving' | 'stopped' | 'loading' | 'maintenance';
}

interface LiveMapProps {
  positions: VehiclePosition[];
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  moving: '#10B981',
  stopped: '#F59E0B',
  loading: '#3B82F6',
  maintenance: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  moving: 'Hareket Halinde',
  stopped: 'Duruyor',
  loading: 'Yükleme',
  maintenance: 'Bakımda',
};

export function LiveMap({ positions, className = '' }: LiveMapProps) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const [L, setL] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  // Dynamic import Leaflet
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(mod => {
      if (cancelled) return;
      setL(mod.default || mod);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    // Fix default icon path
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current, {
      center: [39.0, 35.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Zoom control positioning
    map.zoomControl.setPosition('bottomright');

    mapRef.current = map;
    setLoaded(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [L]);

  // Update markers when positions change
  useEffect(() => {
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const validPositions = positions.filter(p => p.latitude && p.longitude);
    if (validPositions.length === 0) return;

    validPositions.forEach(pos => {
      const status = pos.status || 'moving';
      const color = STATUS_COLORS[status] || '#10B981';

      // Custom circle marker with glow
      const marker = L.circleMarker([pos.latitude, pos.longitude], {
        radius: 9,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      // Glow effect (larger transparent circle behind)
      const glow = L.circleMarker([pos.latitude, pos.longitude], {
        radius: 16,
        fillColor: color,
        color: 'transparent',
        weight: 0,
        fillOpacity: 0.2,
        interactive: false,
      }).addTo(map);

      const plate = pos.plateNumber || 'Araç';
      const driver = pos.driverName || '';
      const speed = pos.speed != null ? `${pos.speed} km/s` : '';

      marker.bindPopup(`
        <div style="font-family:-apple-system,sans-serif;font-size:13px;color:#e2e8f0;min-width:140px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${plate}</div>
          <div style="color:#94a3b8;margin-bottom:2px">${driver}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></span>
            <span style="color:#94a3b8">${STATUS_LABELS[status]}</span>
            <span style="color:#64748b;margin-left:auto">${speed}</span>
          </div>
        </div>
      `);

      markersRef.current.push(marker, glow);
    });

    // Fit bounds to show all vehicles
    if (validPositions.length > 0) {
      const group = L.featureGroup(
        markersRef.current.filter(m => !m.options?.interactive === false)
      );
      try {
        map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 10 });
      } catch {
        // Fallback to Turkey center
        map.setView([39.0, 35.0], 6);
      }
    }
  }, [L, positions]);

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ minHeight: 260 }}
      />

      {/* Status Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap gap-x-4 gap-y-1.5
                      px-3 py-2 rounded-xl text-[11px]"
        style={{
          background: 'rgba(15,29,50,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(30,51,85,0.5)',
        }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
            />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {/* Vehicle count badge */}
      <div className="absolute top-3 right-3 z-[1000] px-2.5 py-1 rounded-lg text-xs font-medium
                      text-[var(--text)]"
        style={{
          background: 'rgba(15,29,50,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(30,51,85,0.5)',
        }}>
        {positions.filter(p => p.latitude && p.longitude).length} araç
      </div>
    </div>
  );
}

// Default demo positions for when no real data is available
export const DEMO_POSITIONS: VehiclePosition[] = [
  { id: '1', latitude: 41.0082, longitude: 28.9784, plateNumber: '34 ABC 123', driverName: 'Mehmet Yılmaz', speed: 82, status: 'moving' },
  { id: '2', latitude: 39.9208, longitude: 32.8541, plateNumber: '06 XYZ 456', driverName: 'Ahmet Kaya', speed: 0, status: 'stopped' },
  { id: '3', latitude: 38.4237, longitude: 27.1428, plateNumber: '35 DEF 789', driverName: 'Mustafa Demir', speed: 55, status: 'moving' },
  { id: '4', latitude: 40.1885, longitude: 29.0610, plateNumber: '16 KLM 012', driverName: 'Hasan Çelik', speed: 0, status: 'loading' },
  { id: '5', latitude: 37.8747, longitude: 32.4932, plateNumber: '42 PRS 345', driverName: 'Ali Vural', speed: 0, status: 'maintenance' },
];
