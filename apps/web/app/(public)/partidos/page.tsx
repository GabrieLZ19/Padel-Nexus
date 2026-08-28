"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  UserPlus,
  Building2,
  Loader2,
  Search,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import { PartidosService } from "@/utils/services/partidos";
import { useProfileStore } from "@/store/useProfileStore";
import {
  NIVELES_PARTIDO_ABIERTO,
  PROVINCIAS_ARG,
} from "@/utils/constants/padelConfig";
import {
  type FranjaPartido,
  type PartidoAbierto,
} from "@/utils/types";
import { PARTIDOS_ABIERTOS } from "@/utils/constants/partidosAbiertos";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";

function formatFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatHora(hora?: string | null) {
  if (!hora) return "--:--";
  return hora.slice(0, 5);
}

function nombreCreador(partido: PartidoAbierto) {
  const p = partido.perfiles;
  if (!p) return "Jugador";
  const parts = [p.nombre, p.apellido].filter(Boolean);
  return parts.length ? parts.join(" ") : "Jugador";
}

function iniciales(
  perfil?: {
    nombre: string | null;
    apellido: string | null;
  } | null,
) {
  const n = perfil?.nombre?.[0] || "";
  const a = perfil?.apellido?.[0] || "";
  return (n + a).toUpperCase() || "?";
}

const OPCIONES_PROVINCIAS = [
  { value: "", label: "Todas las provincias" },
  ...PROVINCIAS_ARG.map((p) => ({ value: p.value, label: p.label })),
];

export default function PartidosAbiertosPage() {
  const router = useRouter();
  const { profile } = useProfileStore();

  const [partidos, setPartidos] = useState<PartidoAbierto[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [nivel, setNivel] = useState("");
  const [provincia, setProvincia] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [franja, setFranja] = useState<"" | FranjaPartido>("");

  const fetchPartidos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PartidosService.getAbiertos({
        nivel_requerido: nivel || undefined,
        provincia: provincia || undefined,
        localidad: localidad || undefined,
        franja: franja || undefined,
      });
      setPartidos(data);
    } catch (err) {
      console.error(err);
      sileo.error({
        title: "Error",
        description: "No se pudieron cargar los partidos abiertos.",
      });
    } finally {
      setLoading(false);
    }
  }, [nivel, provincia, localidad, franja]);

  useEffect(() => {
    fetchPartidos();
  }, [fetchPartidos]);

  const handleUnirse = async (partidoId: string) => {
    if (!profile?.id) {
      router.push(`/login?redirect=${encodeURIComponent("/partidos")}`);
      return;
    }

    setJoiningId(partidoId);
    try {
      await PartidosService.unirse(partidoId);
      sileo.success({
        title: "Listo",
        description: "Te uniste al partido correctamente.",
      });
      router.push(`/partidos/${partidoId}`);
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || "No se pudo unir al partido."
        : "No se pudo unir al partido.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setJoiningId(null);
    }
  };

  const hayFiltrosActivos = Boolean(nivel || provincia || localidad || franja);

  return (
    <div className="min-h-screen bg-brand-black text-brand-white pb-20">
      {/* Hero */}
      <div className="border-b border-brand-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-8 pb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-chartreuse mb-2">
                {PARTIDOS_ABIERTOS.eyebrow}
              </p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-brand-white to-gray-500">
                {PARTIDOS_ABIERTOS.titulo}
              </h1>
              <p className="text-sm md:text-base text-gray-400 mt-3 max-w-2xl">
                {PARTIDOS_ABIERTOS.subtitulo}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/reservar"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-brand-white/10 text-sm font-bold text-gray-300 hover:text-brand-white hover:border-brand-white/25 transition-colors"
              >
                Reservar cancha
              </Link>
              <Link
                href="/mi-perfil/reservas"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-chartreuse text-brand-black text-sm font-black hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(203,254,1,0.12)]"
              >
                <UserPlus className="size-4" />
                {PARTIDOS_ABIERTOS.publicarCta}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-8 lg:py-10 space-y-8">
        {/* Filtros */}
        <div className="bg-brand-card p-4 md:p-5 rounded-3xl border border-brand-white/10 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Filter className="size-3.5 text-brand-chartreuse" />
              Filtros
            </div>
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={() => {
                  setNivel("");
                  setProvincia("");
                  setLocalidad("");
                  setFranja("");
                }}
                className="text-[11px] font-bold text-brand-chartreuse hover:underline cursor-pointer bg-transparent border-0"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <CustomDropdown
              value={nivel}
              onChange={setNivel}
              placeholder="Todos los niveles"
              options={[
                { value: "", label: "Todos los niveles" },
                ...NIVELES_PARTIDO_ABIERTO.map((n) => ({
                  value: n.value,
                  label: n.label,
                })),
              ]}
            />

            <CustomDropdown
              value={provincia}
              onChange={(val) => {
                setProvincia(val);
                setLocalidad("");
              }}
              placeholder="Todas las provincias"
              options={OPCIONES_PROVINCIAS}
            />

            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Localidad (opcional)"
              className="w-full bg-brand-input border border-brand-white/5 rounded-xl px-4 py-3.5 text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
            />

            <CustomDropdown
              value={franja}
              onChange={(val) => setFranja(val as "" | FranjaPartido)}
              placeholder="Cualquier franja"
              options={[
                { value: "", label: "Cualquier franja" },
                { value: "manana", label: "Mañana (< 12hs)" },
                { value: "tarde", label: "Tarde (12–18hs)" },
                { value: "noche", label: "Noche (≥ 18hs)" },
              ]}
            />
          </div>
        </div>

        {/* Contador de resultados */}
        {!loading && partidos.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Sparkles className="size-4 text-brand-chartreuse" />
            <span>
              <strong className="text-brand-white">{partidos.length}</strong>{" "}
              {partidos.length === 1
                ? "convocatoria abierta"
                : "convocatorias abiertas"}
              {hayFiltrosActivos ? " con estos filtros" : ""}
            </span>
          </div>
        )}

        {/* Listado */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 text-brand-chartreuse animate-spin" />
          </div>
        ) : partidos.length === 0 ? (
          <div className="bg-brand-card border border-brand-white/10 rounded-3xl p-12 md:p-16 text-center space-y-5">
            <div className="size-16 rounded-2xl bg-brand-white/5 flex items-center justify-center mx-auto">
              <Search className="size-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-black">No hay convocatorias abiertas</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
              Reservá una cancha y publicá &quot;{PARTIDOS_ABIERTOS.titulo}&quot;
              desde Mis reservas, o ajustá los filtros.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/reservar"
                className="px-5 py-3 rounded-2xl bg-brand-chartreuse text-brand-black text-sm font-black"
              >
                Ir a Reservar
              </Link>
              <Link
                href="/mi-perfil/reservas"
                className="px-5 py-3 rounded-2xl border border-brand-white/10 text-sm font-bold text-gray-300 hover:text-white transition-colors"
              >
                Mis reservas
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {partidos.map((partido) => {
              const club = partido.reservas?.turnos?.canchas?.clubes;
              const cancha = partido.reservas?.turnos?.canchas;
              const turno = partido.reservas?.turnos;
              const esMio = profile?.id === partido.creador_id;
              const yaInscripto = partido.inscripciones_partidos?.some(
                (i) => i.jugador_id === profile?.id,
              );
              const inscriptos = partido.inscripciones_partidos || [];

              return (
                <article
                  key={partido.id}
                  className="group bg-brand-card border border-brand-white/10 rounded-3xl flex flex-col hover:border-brand-white/20 transition-colors duration-200"
                >
                  <Link
                    href={`/partidos/${partido.id}`}
                    className="p-6 space-y-5 flex-1"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-brand-white/5 border border-brand-white/10 flex items-center justify-center shrink-0">
                          <Building2 className="size-4 text-brand-chartreuse" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-lg text-brand-white break-words">
                            {club?.nombre || "Club"}
                          </h3>
                          <p className="text-xs text-gray-400 flex items-start gap-1 mt-1">
                            <MapPin className="size-3 text-brand-chartreuse shrink-0 mt-0.5" />
                            <span className="break-words leading-relaxed">
                              {club?.localidad
                                ? `${club.localidad}, ${club.provincia}`
                                : "Ubicación no disponible"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-brand-white/10 text-brand-chartreuse border border-brand-white/10">
                        {partido.nivel_requerido || "—"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-brand-black/40 border border-brand-white/5 px-3 py-2.5">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                          Cancha
                        </p>
                        <p className="text-sm font-bold break-words leading-snug">
                          {cancha?.nombre || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-brand-black/40 border border-brand-white/5 px-3 py-2.5">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                          Fecha y hora
                        </p>
                        <p className="text-sm font-bold flex items-center gap-1 capitalize">
                          <Calendar className="size-3 text-brand-chartreuse shrink-0" />
                          {partido.reservas?.fecha_reserva
                            ? formatFecha(partido.reservas.fecha_reserva)
                            : "—"}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="size-3 text-brand-chartreuse shrink-0" />
                          {formatHora(turno?.hora_inicio)} –{" "}
                          {formatHora(turno?.hora_fin)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {inscriptos.slice(0, 3).map((ins) => (
                            <div
                              key={ins.id}
                              className="size-7 rounded-full border-2 border-brand-card bg-brand-white/10 overflow-hidden flex items-center justify-center"
                            >
                              {ins.perfiles?.avatar_url ? (
                                <Image
                                  src={ins.perfiles.avatar_url}
                                  alt=""
                                  width={28}
                                  height={28}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] font-black text-brand-chartreuse">
                                  {iniciales(ins.perfiles)}
                                </span>
                              )}
                            </div>
                          ))}
                          {partido.jugadores_faltantes > 0 && (
                            <div className="size-7 rounded-full border-2 border-dashed border-brand-white/20 bg-brand-black/50 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-gray-500">
                                +{partido.jugadores_faltantes}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold">
                          {partido.jugadores_faltantes === 1 ? (
                            <span className="text-brand-chartreuse">
                              Nos falta uno
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              Faltan{" "}
                              <span className="text-brand-white">
                                {partido.jugadores_faltantes}
                              </span>
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                        {nombreCreador(partido)}
                      </p>
                    </div>

                    {partido.notas && (
                      <p className="text-xs text-gray-400 bg-brand-black/40 border border-brand-white/5 rounded-xl px-3 py-2 line-clamp-2">
                        {partido.notas}
                      </p>
                    )}
                  </Link>

                  <div className="px-6 pb-6 pt-0 flex gap-2">
                    <Link
                      href={`/partidos/${partido.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-white/10 text-xs font-bold text-gray-300 hover:text-white hover:border-brand-white/25 transition-colors"
                    >
                      Ver detalle
                      <ChevronRight className="size-3.5" />
                    </Link>
                    {esMio || yaInscripto ? (
                      <span className="inline-flex flex-1 justify-center items-center py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-brand-white/5 text-gray-400 border border-brand-white/10">
                        {esMio ? "Tu publicación" : "Ya anotado"}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUnirse(partido.id)}
                        disabled={joiningId === partido.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-xs font-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {joiningId === partido.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )}
                        Unirme
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
