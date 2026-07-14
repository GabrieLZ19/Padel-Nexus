"use client";

import { useEffect, useState, useRef } from "react";
import { Building2, Save, MapPin, CreditCard } from "lucide-react";
import { ClubPanelService } from "@/utils/services/club-panel";
import type { Club } from "@/utils/types";
import { sileo } from "sileo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function ClubConfiguracionPage() {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    localidad: "",
    cbu: "",
    alias: "",
    latitud: null as number | null,
    longitud: null as number | null,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    async function cargarClub() {
      try {
        const data = await ClubPanelService.getMiClub();
        setClub(data);
        setFormData({
          nombre: data.nombre,
          localidad: data.localidad || "",
          cbu: data.cbu || "",
          alias: data.alias || "",
          latitud: data.latitud !== undefined ? data.latitud : null,
          longitud: data.longitud !== undefined ? data.longitud : null,
        });
      } catch (err) {
        console.error("Error al cargar club:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarClub();
  }, []);

  // Inicializar Leaflet
  useEffect(() => {
    if (loading || !club || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const initialLat = formData.latitud || -34.6037;
      const initialLng = formData.longitud || -58.3816;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: formData.latitud ? 15 : 10,
        scrollWheelZoom: true,
      });

      const isLightMode = document.documentElement.classList.contains("light");
      const tileUrl = isLightMode
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution: "Tiles &copy; Esri &copy; CARTO",
        maxZoom: 18,
      }).addTo(map);

      const clubIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 24px; height: 24px;
            background: #CBFE01;
            border: 4px solid #0b0b0b;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(203, 254, 1, 0.8);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: clubIcon,
        draggable: true,
      }).addTo(map);

      markerInstanceRef.current = marker;
      mapInstanceRef.current = map;

      const updateCoords = async (lat: number, lng: number) => {
        setFormData((prev) => ({
          ...prev,
          latitud: parseFloat(lat.toFixed(6)),
          longitud: parseFloat(lng.toFixed(6)),
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            {
              headers: {
                "Accept-Language": "es",
              },
            }
          );
          const data = await response.json();
          if (data && data.address) {
            const road = data.address.road || data.address.pedestrian || "";
            const houseNumber = data.address.house_number || "";
            const suburb = data.address.suburb || data.address.neighbourhood || "";
            const city = data.address.city || data.address.town || data.address.village || "";
            
            const parts = [];
            if (road) {
              parts.push(houseNumber ? `${road} ${houseNumber}` : road);
            }
            if (suburb) parts.push(suburb);
            if (city) parts.push(city);

            const addressString = parts.join(", ");
            if (addressString) {
              setFormData((prev) => ({
                ...prev,
                localidad: addressString,
              }));
            }
          }
        } catch (err) {
          console.error("Error al reverse geocodificar la coordenada:", err);
        }
      };

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        updateCoords(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updateCoords(lat, lng);
      });

      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [loading, club]);

  // Geocodificar la localidad para centrar el mapa
  useEffect(() => {
    if (loading || !mapInstanceRef.current || !markerInstanceRef.current) return;

    const delayDebounce = setTimeout(async () => {
      const q = [formData.localidad, club?.provincia, "Argentina"]
        .filter(Boolean)
        .join(", ");

      if (!q || q === "Argentina") return;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
          {
            headers: {
              "Accept-Language": "es",
            },
          }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          setFormData((prev) => ({
            ...prev,
            latitud: parseFloat(lat.toFixed(6)),
            longitud: parseFloat(lon.toFixed(6)),
          }));

          if (markerInstanceRef.current && mapInstanceRef.current) {
            markerInstanceRef.current.setLatLng([lat, lon]);
            mapInstanceRef.current.setView([lat, lon], 15);
          }
        }
      } catch (err) {
        console.error("Error al geocodificar dirección:", err);
      }
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [formData.localidad, loading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await ClubPanelService.actualizarMiClub(formData);
      setClub(data);
      sileo.success({
        title: "Club Actualizado",
        description: "Los cambios se guardaron correctamente.",
      });
    } catch (err) {
      console.error("Error al actualizar club:", err);
      sileo.error({
        title: "Error",
        description: "No se pudieron guardar los cambios del club.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-brand-white/5 rounded-xl w-1/3" />
        <div className="h-96 bg-brand-white/5 rounded-3xl" />
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="space-y-8 w-full max-w-[1400px] mx-auto pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-brand-white">Configuración del Club</h1>
        <p className="text-sm text-gray-400 mt-2 font-medium">
          Gestione los datos institucionales, información geográfica y credenciales de facturación de su club
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Columna Izquierda — Datos y Facturación */}
        <div className="w-full lg:w-5/12 flex flex-col gap-6">
          {/* Datos Básicos */}
          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6 flex-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-brand-chartreuse flex items-center gap-2">
              <Building2 className="size-4" /> Información General
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Nombre del Club
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Localidad
                </label>
                <input
                  type="text"
                  required
                  value={formData.localidad}
                  onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Provincia (Solo lectura)
                </label>
                <input
                  type="text"
                  disabled
                  value={club.provincia}
                  className="w-full px-4 py-3 bg-brand-black/40 border border-brand-white/5 rounded-xl text-sm text-gray-500 focus:outline-none cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Facturación */}
          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <CreditCard className="size-4" /> Datos de Transferencia (Pagos)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  CBU / CVU
                </label>
                <input
                  type="text"
                  value={formData.cbu}
                  onChange={(e) => setFormData({ ...formData, cbu: e.target.value })}
                  placeholder="22 dígitos"
                  maxLength={22}
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Alias de Pago
                </label>
                <input
                  type="text"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="Ej. club.padel.nexus"
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                />
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-chartreuse hover:opacity-90 text-brand-black py-4 rounded-2xl font-bold text-sm transition-all shadow-md shadow-brand-chartreuse/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="size-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {/* Columna Derecha — Mapa de Geolocalización */}
        <div className="w-full lg:w-7/12 bg-brand-card border border-brand-white/5 rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col gap-4 min-h-[500px]">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
              <MapPin className="size-4" /> Geolocalización (Ubicación)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Haga clic en el mapa o arrastre el marcador para marcar la ubicación geográfica de su club.
            </p>
          </div>

          <div
            ref={mapContainerRef}
            className="flex-1 w-full bg-brand-black/40 border border-brand-white/5 rounded-2xl overflow-hidden relative z-10 min-h-[350px] lg:min-h-0"
          />
        </div>
      </form>
    </div>
  );
}
