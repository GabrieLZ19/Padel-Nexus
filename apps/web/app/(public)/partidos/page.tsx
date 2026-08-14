"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Filter,
  UserPlus,
  Building2,
  Loader2,
  Search,
} from "lucide-react";
import { isAxiosError } from "axios";
import { PartidosService } from "@/utils/services/partidos";
import { useProfileStore } from "@/store/useProfileStore";
import {
  NIVELES_PARTIDO,
  type FranjaPartido,
  type PartidoAbierto,
} from "@/utils/types";
import { sileo } from "sileo";

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
      await fetchPartidos();
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || "No se pudo unir al partido."
        : "No se pudo unir al partido.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-white pb-20">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-chartreuse mb-2">
              Armado de partidos
            </p>
            <h1 className="text-3xl md:text-4xl font-black">Busco jugador</h1>
            <p className="text-sm text-gray-400 mt-2 max-w-xl">
              Encontrá partidos abiertos cerca tuyo o publicá el tuyo desde una
              reserva confirmada.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-white/10 text-sm font-bold text-gray-300 hover:text-brand-white hover:border-brand-white/20 transition-colors"
            >
              Reservar cancha
            </Link>
            <Link
              href="/mi-perfil/reservas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <UserPlus className="size-4" />
              Publicar desde mi reserva
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-brand-card border border-brand-white/5 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Filter className="size-3.5" />
            Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="w-full bg-brand-black border border-brand-white/10 rounded-xl px-3 py-2.5 text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
            >
              <option value="">Todos los niveles</option>
              {NIVELES_PARTIDO.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={provincia}
              onChange={(e) => {
                setProvincia(e.target.value);
                setLocalidad("");
              }}
              placeholder="Provincia"
              className="w-full bg-brand-black border border-brand-white/10 rounded-xl px-3 py-2.5 text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50"
            />

            <input
              type="text"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Localidad"
              className="w-full bg-brand-black border border-brand-white/10 rounded-xl px-3 py-2.5 text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50"
            />

            <select
              value={franja}
              onChange={(e) =>
                setFranja(e.target.value as "" | FranjaPartido)
              }
              className="w-full bg-brand-black border border-brand-white/10 rounded-xl px-3 py-2.5 text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
            >
              <option value="">Cualquier franja</option>
              <option value="manana">Mañana (&lt; 12hs)</option>
              <option value="tarde">Tarde (12–18hs)</option>
              <option value="noche">Noche (≥ 18hs)</option>
            </select>
          </div>
        </div>

        {/* Listado */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 text-brand-chartreuse animate-spin" />
          </div>
        ) : partidos.length === 0 ? (
          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-10 text-center space-y-4">
            <Search className="size-10 text-gray-600 mx-auto" />
            <h2 className="text-lg font-bold">No hay partidos abiertos</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Reservá una cancha y publicá “Busco 4to” desde Mis reservas, o
              ajustá los filtros.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/reservar"
                className="px-4 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-sm font-bold"
              >
                Ir a Reservar
              </Link>
              <Link
                href="/mi-perfil/reservas"
                className="px-4 py-2.5 rounded-xl border border-brand-white/10 text-sm font-bold text-gray-300"
              >
                Mis reservas
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {partidos.map((partido) => {
              const club = partido.reservas?.turnos?.canchas?.clubes;
              const cancha = partido.reservas?.turnos?.canchas;
              const turno = partido.reservas?.turnos;
              const esMio = profile?.id === partido.creador_id;
              const yaInscripto = partido.inscripciones_partidos?.some(
                (i) => i.jugador_id === profile?.id,
              );

              return (
                <article
                  key={partido.id}
                  className="bg-brand-card border border-brand-white/10 rounded-2xl p-6 flex flex-col gap-5 hover:border-brand-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Building2 className="size-4 text-brand-chartreuse shrink-0 mt-1" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-brand-white truncate">
                          {club?.nombre || "Club"}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="size-3 text-brand-chartreuse" />
                          {club?.localidad
                            ? `${club.localidad}, ${club.provincia}`
                            : "Ubicación no disponible"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20">
                      {partido.nivel_requerido || "Sin nivel"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-300 border-t border-brand-white/5 pt-4">
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider font-semibold mb-1">
                        Cancha
                      </p>
                      <p className="font-bold text-brand-white">
                        {cancha?.nombre || "Cancha"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase tracking-wider font-semibold mb-1">
                        Fecha y hora
                      </p>
                      <p className="font-bold text-brand-white flex items-center gap-1">
                        <Calendar className="size-3 text-brand-chartreuse" />
                        {partido.reservas?.fecha_reserva
                          ? formatFecha(partido.reservas.fecha_reserva)
                          : "—"}
                      </p>
                      <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-brand-chartreuse" />
                        {formatHora(turno?.hora_inicio)} -{" "}
                        {formatHora(turno?.hora_fin)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="size-4 text-brand-chartreuse" />
                      <span>
                        Faltan{" "}
                        <strong className="text-brand-white">
                          {partido.jugadores_faltantes}
                        </strong>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      Organiza: {nombreCreador(partido)}
                    </p>
                  </div>

                  {partido.notas && (
                    <p className="text-xs text-gray-400 bg-brand-black/40 border border-brand-white/5 rounded-xl px-3 py-2">
                      {partido.notas}
                    </p>
                  )}

                  <div className="mt-auto pt-1">
                    {esMio || yaInscripto ? (
                      <span className="inline-flex w-full justify-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-white/5 text-gray-400 border border-brand-white/10">
                        {esMio ? "Tu publicación" : "Ya estás anotado"}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUnirse(partido.id)}
                        disabled={joiningId === partido.id}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-sm font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {joiningId === partido.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserPlus className="size-4" />
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
