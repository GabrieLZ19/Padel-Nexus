"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Navigation,
  Star,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { ClubesService } from "@/utils/services/clubes";
import { clubesVisiblesEnReserva } from "@/utils/clubesReserva";
import type { ClubCercano } from "@/utils/types/club.types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";

// Leaflet se carga dinámicamente para evitar SSR issues
import dynamic from "next/dynamic";
const MapaClubs = dynamic(() => import("@/components/reservas/MapaClubs"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-2xl bg-brand-card animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-brand-chartreuse" />
    </div>
  ),
});

export default function ReservarPage() {
  const router = useRouter();

  const [clubes, setClubes] = useState<ClubCercano[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoResolved, setGeoResolved] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtroProvincia, setFiltroProvincia] = useState("");
  const [filtroDistanciaKm, setFiltroDistanciaKm] = useState("");
  const [filtroTipoSuelo, setFiltroTipoSuelo] = useState("");
  const [filtroTechada, setFiltroTechada] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroHora, setFiltroHora] = useState("");

  // Solicitar ubicación del usuario
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("La geolocalización no está soportada en este navegador.");
      setGeoResolved(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoError(null);
        setGeoResolved(true);
      },
      () => {
        setGeoError(
          "No se pudo obtener tu ubicación. Mostrando todos los clubes.",
        );
        setGeoResolved(true);
      },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const fetchClubes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 200,
      };

      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.ordenar = "distancia";
      } else {
        params.ordenar = "distancia";
      }

      if (search.trim()) {
        params.search = search.trim();
      }
      if (filtroProvincia) params.provincia = filtroProvincia;
      if (filtroDistanciaKm) params.max_distancia_km = filtroDistanciaKm;
      if (filtroTipoSuelo) params.tipo_suelo = filtroTipoSuelo;
      if (filtroTechada === "techada") params.techada = "1";
      if (filtroTechada === "aire") params.techada = "0";
      if (filtroFecha) params.fecha = filtroFecha;
      if (filtroHora) params.hora = filtroHora;

      const res = await ClubesService.getAll(params);
      setClubes(
        clubesVisiblesEnReserva(res.data || [], userLocation != null),
      );
    } catch {
      setClubes([]);
    } finally {
      setLoading(false);
    }
  }, [
    userLocation,
    search,
    filtroProvincia,
    filtroDistanciaKm,
    filtroTipoSuelo,
    filtroTechada,
    filtroFecha,
    filtroHora,
  ]);

  useEffect(() => {
    if (!geoResolved) return;
    fetchClubes();
  }, [geoResolved, fetchClubes]);

  const formatDistancia = (km?: number | null) => {
    if (km == null) return "";
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <main className="min-h-screen pt-24 pb-16">
      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse text-sm font-medium mb-4">
            <MapPin className="w-4 h-4" />
            Reservá tu cancha
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Encontrá tu{" "}
            <span className="text-brand-chartreuse">cancha ideal</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Buscá clubes cercanos, elegí tu horario y reservá en segundos.
            Filtrá por distancia, tipo de suelo y disponibilidad.
          </p>
        </div>

        {/* ── Barra de Búsqueda ──────────────────────────────── */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar club por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-12 pr-4 py-3.5 bg-brand-card border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-chartreuse/50 focus:border-brand-chartreuse/30 transition-all"
              />

              {/* Sugerencias de búsqueda */}
              {search.trim().length > 0 &&
                showSuggestions &&
                clubes.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-brand-card/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-white/5">
                    {clubes.slice(0, 5).map((club) => (
                      <button
                        key={club.id}
                        onClick={() => {
                          router.push(`/reservar/club/${club.id}`);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <div>
                          <p className="font-semibold text-white group-hover:text-brand-chartreuse transition-colors">
                            {club.nombre}
                          </p>
                          <p className="text-xs text-gray-400">
                            {club.localidad}, {club.provincia}
                          </p>
                        </div>
                        {club.distancia_km != null && (
                          <span className="text-xs text-brand-chartreuse font-medium">
                            {formatDistancia(club.distancia_km)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3.5 rounded-xl border transition-all ${
                showFilters
                  ? "bg-brand-chartreuse text-black border-brand-chartreuse"
                  : "bg-brand-card border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            {!userLocation && (
              <button
                onClick={requestLocation}
                className="p-3.5 rounded-xl bg-brand-card border border-white/10 text-gray-400 hover:text-brand-chartreuse hover:border-brand-chartreuse/30 transition-all"
                title="Usar mi ubicación"
              >
                <Navigation className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ── Filtros expandibles ─────────────────────────── */}
          {showFilters && (
            <div className="mt-4 p-5 bg-brand-card border border-white/10 rounded-xl space-y-4 animate-in slide-in-from-top-2">
              {userLocation ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Ubicación activa: {userLocation.lat.toFixed(4)},{" "}
                    {userLocation.lng.toFixed(4)}
                  </div>
                  <p className="text-xs text-gray-400">
                    Ordenamos por distancia (km en cada tarjeta). Sin coordenadas
                    del club usamos localidad y provincia.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Activá tu ubicación para ver kilómetros y orden por cercanía.
                </p>
              )}
              {geoError && (
                <p className="text-xs text-yellow-400">{geoError}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Provincia
                  </label>
                  <CustomDropdown
                    value={filtroProvincia}
                    onChange={setFiltroProvincia}
                    options={[
                      { value: "", label: "Todas" },
                      ...PROVINCIAS_ARG.map((p) => ({
                        value: p.value,
                        label: p.label,
                      })),
                    ]}
                    placeholder="Provincia"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Distancia máxima (km)
                  </label>
                  <CustomDropdown
                    value={filtroDistanciaKm}
                    onChange={setFiltroDistanciaKm}
                    options={[
                      { value: "", label: "Sin límite" },
                      { value: "10", label: "Hasta 10 km" },
                      { value: "25", label: "Hasta 25 km" },
                      { value: "50", label: "Hasta 50 km" },
                      { value: "100", label: "Hasta 100 km" },
                    ]}
                    placeholder="Radio"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Tipo de cancha
                  </label>
                  <CustomDropdown
                    value={filtroTipoSuelo}
                    onChange={setFiltroTipoSuelo}
                    options={[
                      { value: "", label: "Cualquier piso" },
                      { value: "Blindex", label: "Blindex" },
                      { value: "Sintético", label: "Sintético" },
                      { value: "Cemento", label: "Cemento" },
                    ]}
                    placeholder="Tipo de suelo"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Cobertura
                  </label>
                  <CustomDropdown
                    value={filtroTechada}
                    onChange={setFiltroTechada}
                    options={[
                      { value: "", label: "Techada o al aire libre" },
                      { value: "techada", label: "Solo techada" },
                      { value: "aire", label: "Solo al aire libre" },
                    ]}
                    placeholder="Techada"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Disponibilidad (fecha)
                  </label>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Disponibilidad (hora)
                  </label>
                  <input
                    type="time"
                    value={filtroHora}
                    onChange={(e) => setFiltroHora(e.target.value)}
                    disabled={!filtroFecha}
                    className="w-full px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white disabled:opacity-40"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Mapa ───────────────────────────────────────────── */}
        {userLocation &&
          clubes.some(
            (club) => club.latitud != null && club.longitud != null,
          ) && (
          <div className="mb-10">
            <MapaClubs clubes={clubes} userLocation={userLocation} />
          </div>
        )}

        {/* ── Listado de Clubes ──────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
            <h2 className="text-xl font-semibold">
              Todos los clubes
              <span className="ml-2 text-sm text-gray-500">
                ({clubes.length})
              </span>
            </h2>
            {userLocation && (
              <p className="text-xs text-gray-500">
                Ordenados por cercanía a tu ubicación
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-brand-card animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : clubes.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                No se encontraron clubes
              </h3>
              <p className="text-gray-500">
                Probá con otro término de búsqueda o activá tu ubicación para
                ver el orden por cercanía.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubes.map((club) => (
                <Link
                  key={club.id}
                  href={`/reservar/club/${club.id}`}
                  className="group relative bg-brand-card border border-white/5 rounded-2xl p-6 hover:border-brand-chartreuse/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(203,254,1,0.05)]"
                >
                  {/* Badge de distancia */}
                  {club.distancia_km != null && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse text-xs font-medium">
                      <Navigation className="w-3 h-3" />
                      {formatDistancia(club.distancia_km)}
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icono del club */}
                    <div className="w-12 h-12 rounded-xl bg-brand-chartreuse/10 flex items-center justify-center shrink-0">
                      <Star className="w-6 h-6 text-brand-chartreuse" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-brand-chartreuse transition-colors truncate">
                        {club.nombre}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {club.localidad}, {club.provincia}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-brand-chartreuse" />
                        {club.canchas}{" "}
                        {club.canchas === 1 ? "cancha" : "canchas"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          club.estado === "Activo"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {club.estado}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-chartreuse transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
