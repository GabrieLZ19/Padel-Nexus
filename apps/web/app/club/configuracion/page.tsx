"use client";

import { useEffect, useState, useRef } from "react";
import { Building2, Save, MapPin, CreditCard } from "lucide-react";
import { ClubPanelService } from "@/utils/services/club-panel";
import type { Club } from "@/utils/types";
import { sileo } from "sileo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  leafletTileUrl,
  LEAFLET_TILE_ATTRIBUTION,
} from "@/utils/leafletTiles";
import { geocodificarDireccion } from "@/utils/services/geocoding";
import LicenciaClubPanel from "@/components/clubes/LicenciaClubPanel";

export default function ClubConfiguracionPage() {
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    localidad: "",
    direccion: "",
    codigo_postal: "",
    telefono: "",
    cbu: "",
    alias: "",
    latitud: null as number | null,
    longitud: null as number | null,
    pago_transferencia_habilitado: false,
    pago_efectivo_habilitado: false,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const userEditedLocationRef = useRef(false);

  useEffect(() => {
    async function cargarClub() {
      try {
        const data = await ClubPanelService.getMiClub();
        setClub(data);
        setFormData({
          nombre: data.nombre || "",
          localidad: data.localidad || "",
          direccion: data.direccion || "",
          codigo_postal: data.codigo_postal || "",
          telefono: data.telefono || "",
          cbu: data.cbu || "",
          alias: data.alias || "",
          latitud: data.latitud !== undefined ? data.latitud : null,
          longitud: data.longitud !== undefined ? data.longitud : null,
          pago_transferencia_habilitado: Boolean(data.pago_transferencia_habilitado),
          pago_efectivo_habilitado: Boolean(data.pago_efectivo_habilitado),
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

      L.tileLayer(leafletTileUrl(isLightMode), {
        attribution: LEAFLET_TILE_ATTRIBUTION,
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

      const updateCoords = (lat: number, lng: number) => {
        setFormData((prev) => ({
          ...prev,
          latitud: parseFloat(lat.toFixed(6)),
          longitud: parseFloat(lng.toFixed(6)),
        }));
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

  // Geocodificar la dirección y localidad cuando el usuario edita la ubicación
  useEffect(() => {
    if (loading || !mapInstanceRef.current || !markerInstanceRef.current) return;
    if (!userEditedLocationRef.current) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await geocodificarDireccion(
          formData.direccion,
          formData.codigo_postal,
          formData.localidad,
          club?.provincia,
        );
        if (res) {
          setFormData((prev) => ({
            ...prev,
            latitud: res.latitud,
            longitud: res.longitud,
          }));

          if (markerInstanceRef.current && mapInstanceRef.current) {
            markerInstanceRef.current.setLatLng([res.latitud, res.longitud]);
            mapInstanceRef.current.setView([res.latitud, res.longitud], 15);
          }
        }
      } catch (err) {
        console.error("Error al geocodificar dirección en configuración:", err);
      }
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [formData.direccion, formData.codigo_postal, formData.localidad, loading, club?.provincia]);

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
          Gestioná los datos institucionales, información geográfica y credenciales de facturación de tu club
        </p>
      </div>

      <LicenciaClubPanel clubId={club.id} puedeEditar={false} />

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Dirección (Calle y N°)
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => {
                      userEditedLocationRef.current = true;
                      setFormData({ ...formData, direccion: e.target.value });
                    }}
                    placeholder="Ej. Av. Argentina 100"
                    className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_postal}
                    onChange={(e) => {
                      userEditedLocationRef.current = true;
                      setFormData({ ...formData, codigo_postal: e.target.value });
                    }}
                    placeholder="Ej. 8300"
                    className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Localidad
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.localidad}
                    onChange={(e) => {
                      userEditedLocationRef.current = true;
                      setFormData({ ...formData, localidad: e.target.value });
                    }}
                    className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Teléfono del Club
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ej. 299 456-7890"
                    className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                  />
                </div>
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Asociación Vinculada (Solo lectura)
                </label>
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-black/40 border border-brand-white/5 rounded-xl text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-brand-chartreuse shrink-0" />
                    <span className="text-brand-white font-medium truncate">
                      {club.asociaciones?.nombre
                        ? `${club.asociaciones.nombre}${club.asociaciones.sigla ? ` (${club.asociaciones.sigla})` : ""}`
                        : `Asociación Provincial de ${club.provincia}`}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand-chartreuse bg-brand-chartreuse/10 px-2 py-0.5 rounded-full border border-brand-chartreuse/20">
                    Club Afiliado
                  </span>
                </div>
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

          {/* Métodos de pago en reservas */}
          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 lg:p-8 shadow-xl space-y-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-brand-chartreuse flex items-center gap-2">
              <CreditCard className="size-4" /> Modalidades de pago
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mercado Pago es la opción recomendada y siempre aparece primera en el checkout.
              Transferencia y pago en club solo están disponibles con la{" "}
              <span className="text-brand-white font-medium">suscripción sin comisiones</span>.
            </p>

            <div
              className={`rounded-xl border px-4 py-3 text-xs ${
                club.suscripcion_sin_comisiones
                  ? "border-brand-chartreuse/30 bg-brand-chartreuse/5 text-brand-chartreuse"
                  : "border-white/10 bg-brand-black text-gray-400"
              }`}
            >
              {club.suscripcion_sin_comisiones
                ? "Tu club tiene activa la suscripción sin comisiones. Podés habilitar los métodos alternativos."
                : "Suscripción sin comisiones inactiva. Pedile a la federación/asociación que la active para ofrecer transferencia o pago en club."}
            </div>

            <div
              className={`space-y-3 ${
                club.suscripcion_sin_comisiones ? "" : "opacity-50 pointer-events-none"
              }`}
            >
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-white/10 bg-brand-black cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-brand-chartreuse"
                  checked={formData.pago_transferencia_habilitado}
                  disabled={!club.suscripcion_sin_comisiones}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pago_transferencia_habilitado: e.target.checked,
                    })
                  }
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-brand-white">
                    Habilitar transferencia bancaria
                  </span>
                  <span className="block text-xs text-gray-400">
                    Se muestra debajo de Mercado Pago. Requiere CBU o alias.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-white/10 bg-brand-black cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-brand-chartreuse"
                  checked={formData.pago_efectivo_habilitado}
                  disabled={!club.suscripcion_sin_comisiones}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pago_efectivo_habilitado: e.target.checked,
                    })
                  }
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-brand-white">
                    Habilitar pago en el club
                  </span>
                  <span className="block text-xs text-gray-400">
                    El jugador confirma la reserva y abona al llegar.
                  </span>
                </span>
              </label>
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
              Hacé clic en el mapa o arrastrá el marcador para marcar la ubicación geográfica de tu club.
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
