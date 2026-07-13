"use client";

import { useEffect, useRef } from "react";
import type { ClubCercano } from "@/utils/types/club.types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapaClubsProps {
  clubes: ClubCercano[];
  userLocation: { lat: number; lng: number };
}

export default function MapaClubs({ clubes, userLocation }: MapaClubsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Inicializar mapa
    const map = L.map(mapRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    // Determinar si el tema es claro
    const isLightMode = document.documentElement.classList.contains("light");
    const tileUrl = isLightMode
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Escuchar cambios de clase en html para actualizar el mapa si cambia el tema
    const observer = new MutationObserver(() => {
      const isLightNow = document.documentElement.classList.contains("light");
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      const newUrl = isLightNow
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      L.tileLayer(newUrl, {
        attribution: isLightNow
          ? 'Tiles &copy; Esri'
          : '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 16,
      }).addTo(map);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      observer.disconnect();
    };
  }, []);

  // Actualizar marcadores cuando cambian los clubes o la ubicación
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Limpiar marcadores previos
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Marcador del usuario (punto verde neón)
    const userIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 16px; height: 16px;
          background: #CBFE01;
          border: 3px solid #0b0b0b;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(203, 254, 1, 0.6);
        "></div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(
        '<div style="color:#0b0b0b;font-weight:600;font-size:13px;">Tu ubicación</div>',
      );

    // Marcadores de clubes
    const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng]]);

    clubes.forEach((club) => {
      if (club.latitud == null || club.longitud == null) return;

      const clubIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 12px; height: 12px;
            background: #6E8901;
            border: 2px solid #CBFE01;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(110, 137, 1, 0.4);
          "></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const distText = club.distancia_km != null 
        ? `<div style="font-size:12px;color:#6E8901;margin-top:4px;">${club.distancia_km.toFixed(1)} km</div>`
        : "";

      L.marker([club.latitud, club.longitud], { icon: clubIcon })
        .addTo(map)
        .bindPopup(
          `<div style="color:#0b0b0b;min-width:160px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${club.nombre}</div>
            <div style="font-size:12px;color:#555;">${club.localidad}, ${club.provincia}</div>
            ${distText}
            <a href="/reservar/club/${club.id}" style="
              display:inline-block;margin-top:8px;
              padding:4px 12px;background:#CBFE01;color:#0b0b0b;
              border-radius:6px;font-size:12px;font-weight:600;
              text-decoration:none;
            ">Ver horarios</a>
          </div>`,
        );

      bounds.extend([club.latitud, club.longitud]);
    });

    // Ajustar vista para que todos los marcadores sean visibles
    if (clubes.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [clubes, userLocation]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[400px] rounded-2xl border border-white/10 overflow-hidden"
      style={{ zIndex: 1 }}
    />
  );
}
