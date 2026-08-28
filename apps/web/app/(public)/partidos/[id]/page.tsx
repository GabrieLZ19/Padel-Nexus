"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  LogOut,
  UserPlus,
  Users,
} from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import { PartidosService } from "@/utils/services/partidos";
import { useProfileStore } from "@/store/useProfileStore";
import type { PartidoAbierto } from "@/utils/types";
import { PARTIDOS_ABIERTOS } from "@/utils/constants/partidosAbiertos";
import PartidoChatPanel from "@/components/partidos/PartidoChatPanel";
import FeedbackModal, { type FeedbackModalProps } from "@/components/ui/FeedbackModal";
import { sileo } from "sileo";

function formatFecha(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`);
  return {
    diaSemana: d.toLocaleDateString("es-AR", { weekday: "long" }),
    fechaCompleta: d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}

function formatHora(hora?: string | null) {
  if (!hora) return "--:--";
  return hora.slice(0, 5);
}

function nombreJugador(
  perfil?: {
    nombre: string | null;
    apellido: string | null;
  } | null,
) {
  if (!perfil) return "Jugador";
  const parts = [perfil.nombre, perfil.apellido].filter(Boolean);
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

export default function PartidoDetallePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { profile } = useProfileStore();

  const [partido, setPartido] = useState<PartidoAbierto | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [salirModal, setSalirModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setSalirModal((prev) => ({ ...prev, isOpen: false })),
  });

  const loadPartido = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await PartidosService.getById(id);
      setPartido(data);
    } catch {
      setPartido(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPartido();
  }, [loadPartido]);

  useEffect(() => {
    setSalirModal((prev) =>
      prev.isOpen ? { ...prev, isLoading: saliendo } : prev,
    );
  }, [saliendo]);

  const handleUnirse = async () => {
    if (!partido) return;
    if (!profile?.id) {
      router.push(`/login?redirect=${encodeURIComponent(`/partidos/${id}`)}`);
      return;
    }

    setJoining(true);
    try {
      await PartidosService.unirse(partido.id);
      sileo.success({
        title: "¡Te sumaste!",
        description: "Ya podés coordinar con el grupo en el chat.",
      });
      await loadPartido();
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || "No se pudo unir al partido."
        : "No se pudo unir al partido.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setJoining(false);
    }
  };

  const handleConfirmarSalir = async () => {
    if (!partido) return;

    setSaliendo(true);
    try {
      const resultado = await PartidosService.salir(partido.id);
      setSalirModal((prev) => ({ ...prev, isOpen: false }));
      sileo.success({
        title: "Listo",
        description:
          resultado.mensaje ||
          (resultado.accion === "cancelado"
            ? "Convocatoria cancelada."
            : "Saliste de la convocatoria."),
      });
      if (resultado.accion === "cancelado") {
        router.push("/mi-perfil/reservas");
      } else {
        router.push("/partidos");
      }
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? err.response?.data?.error || "No se pudo salir de la convocatoria."
        : "No se pudo salir de la convocatoria.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setSaliendo(false);
    }
  };

  const abrirModalSalir = (esOrganizador: boolean) => {
    setSalirModal({
      isOpen: true,
      type: "warning",
      title: esOrganizador ? "¿Cancelar convocatoria?" : "¿Abandonar convocatoria?",
      description: esOrganizador
        ? "Se cerrará la búsqueda de jugadores. Tu reserva de cancha sigue activa en Mis reservas."
        : "Vas a liberar tu cupo y el organizador será notificado. Podés volver a unirte si aún hay lugar.",
      confirmText: esOrganizador ? "Sí, cancelar" : "Sí, abandonar",
      cancelText: "Volver",
      onClose: () => setSalirModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => void handleConfirmarSalir(),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 className="size-8 text-brand-chartreuse animate-spin" />
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-gray-400">No encontramos esta convocatoria.</p>
        <Link
          href="/partidos"
          className="text-brand-chartreuse font-bold text-sm"
        >
          Volver al listado
        </Link>
      </div>
    );
  }

  const club = partido.reservas?.turnos?.canchas?.clubes;
  const cancha = partido.reservas?.turnos?.canchas;
  const turno = partido.reservas?.turnos;
  const inscriptos = partido.inscripciones_partidos || [];
  const esMio = profile?.id === partido.creador_id;
  const yaInscripto = inscriptos.some((i) => i.jugador_id === profile?.id);
  const puedeUnirse =
    partido.estado === "abierto" &&
    partido.jugadores_faltantes > 0 &&
    !esMio &&
    !yaInscripto;
  const cerrado =
    partido.estado === "cerrado" || partido.estado === "cancelado";
  const puedeSalir =
    profile?.id &&
    !cerrado &&
    (esMio || yaInscripto) &&
    (partido.estado === "abierto" || partido.estado === "completo");
  const cuposTotales = inscriptos.length + partido.jugadores_faltantes;
  const puedeVerChat = Boolean(partido.conversacion_id && (esMio || yaInscripto));
  const fechaDetalle = partido.reservas?.fecha_reserva
    ? formatFecha(partido.reservas.fecha_reserva)
    : null;

  return (
    <div className="min-h-screen bg-brand-black text-brand-white pb-16">
      {/* Hero */}
      <div className="border-b border-brand-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-8 pb-10">
          <Link
            href="/partidos"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            Volver a {PARTIDOS_ABIERTOS.titulo}
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-chartreuse">
                {PARTIDOS_ABIERTOS.eyebrow}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
                  {club?.nombre || "Convocatoria"}
                </h1>
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-brand-chartreuse text-brand-black">
                  {partido.nivel_requerido || "Sin nivel"}
                </span>
                {partido.estado === "completo" && (
                  <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/25">
                    Completo
                  </span>
                )}
                {cerrado && (
                  <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-white/5 text-gray-400 border border-white/10">
                    Finalizado
                  </span>
                )}
              </div>
              {club?.localidad && (
                <p className="text-sm md:text-base text-gray-400 flex items-center gap-2">
                  <MapPin className="size-4 text-brand-chartreuse shrink-0" />
                  {club.localidad}, {club.provincia}
                </p>
              )}
            </div>

            {puedeUnirse && (
              <button
                type="button"
                onClick={() => void handleUnirse()}
                disabled={joining}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-brand-chartreuse text-brand-black text-sm font-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {joining ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <UserPlus className="size-5" />
                )}
                Sumarme al partido
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-8 lg:py-10">
        <div
          className={`grid gap-6 lg:gap-8 ${
            puedeVerChat
              ? "lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]"
              : "lg:grid-cols-1"
          }`}
        >
          {/* Columna izquierda */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-brand-card border border-brand-white/10 rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  Cancha
                </p>
                <div className="flex items-start gap-2">
                  <Building2 className="size-5 text-brand-chartreuse shrink-0 mt-0.5" />
                  <p className="font-bold text-base leading-snug break-words">
                    {cancha?.nombre || "—"}
                  </p>
                </div>
              </div>
              <div className="bg-brand-card border border-brand-white/10 rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  Fecha
                </p>
                <div className="flex items-start gap-2">
                  <Calendar className="size-5 text-brand-chartreuse shrink-0 mt-0.5" />
                  {fechaDetalle ? (
                    <div className="min-w-0">
                      <p className="font-bold text-base capitalize leading-snug">
                        {fechaDetalle.diaSemana}
                      </p>
                      <p className="text-sm text-gray-300 capitalize leading-snug mt-0.5">
                        {fechaDetalle.fechaCompleta}
                      </p>
                    </div>
                  ) : (
                    <p className="font-bold text-base">—</p>
                  )}
                </div>
              </div>
              <div className="bg-brand-card border border-brand-white/10 rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  Horario
                </p>
                <div className="flex items-start gap-2">
                  <Clock className="size-5 text-brand-chartreuse shrink-0 mt-0.5" />
                  <p className="font-bold text-base leading-snug">
                    {formatHora(turno?.hora_inicio)} – {formatHora(turno?.hora_fin)}
                  </p>
                </div>
              </div>
            </div>

            {partido.notas && (
              <div className="bg-brand-card border border-brand-white/10 rounded-2xl px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  Notas del organizador
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {partido.notas}
                </p>
              </div>
            )}

            <div className="bg-brand-card border border-brand-white/10 rounded-3xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-black flex items-center gap-2">
                  <Users className="size-5 text-brand-chartreuse" />
                  Jugadores
                  <span className="text-gray-500 font-bold">
                    ({inscriptos.length}/{cuposTotales})
                  </span>
                </h2>
                {partido.jugadores_faltantes > 0 &&
                  partido.estado === "abierto" && (
                    <span className="text-sm font-black text-brand-chartreuse px-3 py-1 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20">
                      {partido.jugadores_faltantes === 1
                        ? "Nos falta uno"
                        : `Faltan ${partido.jugadores_faltantes}`}
                    </span>
                  )}
              </div>

              {/* Slots visuales */}
              <div
                className={`grid gap-3 ${
                  cuposTotales <= 3
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-4"
                }`}
              >
                {Array.from({ length: cuposTotales }).map((_, idx) => {
                  const ins = inscriptos[idx];
                  const vacio = !ins;
                  return (
                    <div
                      key={ins?.id || `slot-${idx}`}
                      className={`rounded-2xl border p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[148px] transition-colors ${
                        vacio
                          ? "border-dashed border-brand-white/15 bg-brand-black/30"
                          : "border-brand-white/10 bg-brand-black/50"
                      }`}
                    >
                      <div
                        className={`size-14 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${
                          vacio
                            ? "border-2 border-dashed border-brand-white/20 bg-brand-black/40"
                            : "bg-brand-white/10"
                        }`}
                      >
                        {vacio ? (
                          <UserPlus className="size-5 text-gray-500" />
                        ) : ins.perfiles?.avatar_url ? (
                          <Image
                            src={ins.perfiles.avatar_url}
                            alt=""
                            width={56}
                            height={56}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-black text-brand-chartreuse">
                            {iniciales(ins.perfiles)}
                          </span>
                        )}
                      </div>
                      <div className="w-full flex flex-col items-center justify-center gap-0.5">
                        <p
                          className={`text-xs font-bold ${
                            vacio ? "text-gray-500" : "text-brand-white"
                          }`}
                        >
                          {vacio ? "Cupo libre" : nombreJugador(ins.perfiles)}
                        </p>
                        {!vacio && ins.jugador_id === partido.creador_id && (
                          <span className="text-[9px] font-black uppercase text-brand-chartreuse">
                            Organiza
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(esMio || yaInscripto) && !puedeSalir && (
                <p className="text-xs text-center text-gray-500 pt-1">
                  {esMio
                    ? "Sos el organizador de esta convocatoria."
                    : "Ya estás anotado en este partido."}
                </p>
              )}

              {puedeSalir && (
                <button
                  type="button"
                  onClick={() => abrirModalSalir(esMio)}
                  disabled={saliendo}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 hover:border-red-500/50 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {saliendo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {esMio ? "Cancelar convocatoria" : "Abandonar convocatoria"}
                </button>
              )}
            </div>
          </div>

          {/* Columna derecha: chat */}
          {puedeVerChat && (
            <div className="lg:sticky lg:top-6 lg:self-start">
              <PartidoChatPanel
                conversacionId={partido.conversacion_id!}
                participantes={inscriptos.map((ins) => ({
                  id: ins.jugador_id,
                  nombre: ins.perfiles?.nombre ?? null,
                  apellido: ins.perfiles?.apellido ?? null,
                  avatar_url: ins.perfiles?.avatar_url ?? null,
                }))}
                className="min-h-[480px] lg:min-h-[calc(100vh-12rem)]"
                expanded
              />
            </div>
          )}

          {!profile?.id && partido.conversacion_id && (
            <div className="lg:col-span-2 bg-brand-card border border-brand-white/10 rounded-2xl p-8 text-center">
              <MessageSquare className="size-8 text-brand-chartreuse mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                <Link
                  href={`/login?redirect=/partidos/${id}`}
                  className="text-brand-chartreuse font-bold hover:underline"
                >
                  Iniciá sesión
                </Link>{" "}
                para ver el chat del grupo y coordinar con los demás jugadores.
              </p>
            </div>
          )}
        </div>
      </div>

      <FeedbackModal {...salirModal} />
    </div>
  );
}
