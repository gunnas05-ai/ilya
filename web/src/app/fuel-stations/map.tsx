'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Brand-colored marker using default icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const staleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface Props {
  stations: any[];
  onSelect?: (station: any) => void;
}

export default function FuelStationMap({ stations, onSelect }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.1, 35.0],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers when stations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (stations.length === 0) return;

    const bounds = L.latLngBounds([] as any);

    stations.forEach((s: any) => {
      const lat = parseFloat(s.latitude || s.lat);
      const lng = parseFloat(s.longitude || s.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      // Check price freshness
      const hours = s.priceUpdatedAt ? (Date.now() - new Date(s.priceUpdatedAt).getTime()) / (1000 * 60 * 60) : 999;
      const isStale = hours > 48 || !s.priceUpdatedAt;
      const icon = isStale ? staleIcon : defaultIcon;

      const fuelPrices = s.fuelPrices || {};
      const priceHtml = Object.entries(fuelPrices)
        .filter(([_, v]) => v)
        .map(([k, v]: any) => `<span style="display:inline-block;margin:2px 4px 2px 0;background:#141722;padding:2px 6px;border-radius:4px;font-size:11px;">${k.replace(/_/g, ' ')}: <b>${Number(v).toFixed(2)} ₺</b></span>`)
        .join('');

      const services = (s.services || []).slice(0, 4).join(', ');

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:200px;">
            <b style="font-size:14px;">${s.name}</b><br/>
            <span style="color:#9CA3AF;font-size:11px;">${s.brand} • ${s.city || ''}</span><br/>
            <div style="margin:6px 0;">${priceHtml || '<span style="color:#9CA3AF;font-size:11px;">Fiyat girilmemiş</span>'}</div>
            ${s.is247 ? '<span style="background:#2DD4BF20;color:#2DD4BF;padding:1px 6px;border-radius:3px;font-size:10px;">7/24</span>' : ''}
            ${s.phone ? `<br/><small>📞 ${s.phone}</small>` : ''}
            ${services ? `<br/><small>🛠️ ${services}${(s.services || []).length > 4 ? '...' : ''}</small>` : ''}
          </div>
        `);

      marker.on('click', () => {
        if (onSelect) onSelect(s);
      });

      markersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } else {
      map.setView([39.1, 35.0], 6);
    }
  }, [stations, onSelect]);

  return (
    <div ref={containerRef} className="h-full w-full rounded-lg" style={{ minHeight: '500px' }} />
  );
}
