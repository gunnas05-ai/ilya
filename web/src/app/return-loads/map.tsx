'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons
const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const loadIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const escrowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface Props {
  deliveryPoint: { lat: number; lng: number };
  loads: any[];
  radius: number;
  onSelect?: (load: any) => void;
}

export default function ReturnLoadMap({ deliveryPoint, loads, radius, onSelect }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [deliveryPoint.lat, deliveryPoint.lng],
      zoom: 8,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when delivery point changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([deliveryPoint.lat, deliveryPoint.lng], mapRef.current.getZoom());
    }
  }, [deliveryPoint.lat, deliveryPoint.lng]);

  // Draw delivery marker and radius circle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers and circles (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Delivery point marker
    const delMarker = L.marker([deliveryPoint.lat, deliveryPoint.lng], { icon: deliveryIcon })
      .addTo(map)
      .bindPopup('<b>Teslim Noktası</b><br/>Geri dönüş yükleri bu nokta etrafında aranıyor.');

    // Radius circle
    L.circle([deliveryPoint.lat, deliveryPoint.lng], {
      radius: radius * 1000,
      color: '#2DD4BF',
      fillColor: '#2DD4BF',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '8 4',
    }).addTo(map);

    // Load markers
    loads.forEach((load: any, index: number) => {
      // Simulate positions around delivery point for demo
      const angle = (index / Math.max(loads.length, 1)) * Math.PI * 2;
      const dist = (radius * 0.3 + Math.random() * radius * 0.7) / 111; // convert km to degrees approx
      const loadLat = deliveryPoint.lat + Math.cos(angle) * dist;
      const loadLng = deliveryPoint.lng + Math.sin(angle) * dist;

      // Use real coordinates if available
      const lat = load.originLat || loadLat;
      const lng = load.originLng || loadLng;

      const icon = load.escrowEnabled ? escrowIcon : loadIcon;

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <b>${load.title}</b><br/>
            <small>${load.originCity || '?'} → ${load.destCity || '?'}</small><br/>
            <span style="color:#2DD4BF; font-weight:bold;">${Number(load.price || 0).toLocaleString('tr-TR')} ₺</span><br/>
            <small>${load.vehicleType || ''} • ${Number(load.weight || 0).toLocaleString('tr-TR')} kg</small><br/>
            ${load.escrowEnabled ? '<span style="color:#10B981;">🔒 Escrow Garantili</span>' : ''}
            ${load.matchScore ? `<br/><small>Uyum: %${Math.round(load.matchScore * 100)}</small>` : ''}
          </div>
        `);

      marker.on('click', () => {
        if (onSelect) onSelect(load);
      });
    });

    // Fit bounds to show all markers
    if (loads.length > 0) {
      const bounds = L.latLngBounds([deliveryPoint.lat, deliveryPoint.lng], [deliveryPoint.lat, deliveryPoint.lng]);
      // Extend bounds slightly for radius visibility
      bounds.extend([deliveryPoint.lat + radius / 111, deliveryPoint.lng + radius / 111]);
      bounds.extend([deliveryPoint.lat - radius / 111, deliveryPoint.lng - radius / 111]);
    }

  }, [loads, radius, deliveryPoint, onSelect]);

  return (
    <div ref={mapContainerRef} className="h-full w-full rounded-lg" style={{ minHeight: '450px' }}>
      {!mapReady && <div className="flex items-center justify-center h-full text-kaptan-muted">Harita yukleniyor...</div>}
    </div>
  );
}
