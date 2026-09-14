"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, CalendarDays, Lock, RefreshCw, Send, Sparkles } from "lucide-react";
import { TorneosService, type PartidoProgramado, type ProgramacionPreview } from "@/utils/services/torneos";
import type { Partido } from "@/utils/types";
import { sileo } from "sileo";
import FeedbackModal from "@/components/ui/FeedbackModal";

/**
 * Sub-pestana Programacion del BracketEditor. Ciclo:
 * borrador (sin horarios) -> programado (tentativo, no publico) -> publicado.
 *
 * Muestra la grilla dia x cancha x horario y expone las acciones para
 * recalcular horarios y publicar la programacion al publico.
 */
interface ProgramacionTabProps {
  torneoId: string;
  partidos: Partido[];
  isReadOnly?: boolean;
  onRefresh?: () => void;
}

type EstadoLabel = { label: string; hint: string; className: string };

const ESTADO_LABELS: Record<string, EstadoLabel> = {
  borrador: {
    label: "Borrador",
    hint: "Aun no hay horarios asignados. Generá zonas para armar la programación tentativa.",
    className: "bg-gray-500/10 border-gray-500/30 text-gray-300",
  },
  programado: {
    label: "Programado",
    hint: "Programación tentativa lista. Revisá y publicala para que sea visible al público.",
    className: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  },
  publicado: {
    label: "Publicado",
    hint: "La programación es visible al público. Cualquier cambio requiere motivo y queda auditado.",
    className: "bg-brand-chartreuse/10 border-brand-chartreuse/30 text-brand-chartreuse",
  },
};

function formatearHora(iso?: string | null): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
      hour12: false,
    }).format(d);
  } catch {
    return "--:--";
  }
}

function fechaLegible(iso?: string | null): string {
  if (!iso) return "Sin fecha";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(d);
  } catch {
    return "Sin fecha";
  }
}

function fechaKey(iso?: string | null): string {
  if (!iso) return "sin-fecha";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date(iso));
    return parts;
  } catch {
    return "sin-fecha";
  }
}

/**
 * Nombre humano de un equipo:
 * - Si el partido de llave no tiene equipo asignado, mostramos placeholder de
 *   feeders ("1A", "Ganador L3") para orientar al admin.
 * - Si tiene equipo, usamos denominacion del partido si viene desnormalizada.
 */
function nombreEquipo(
  partido: Partido | undefined,
  lado: "a" | "b",
  fallbackPlaceholder: string,
): string {
  if (!partido) return fallbackPlaceholder;
  const id = lado === "a" ? partido.equipo_a_id : partido.equipo_b_id;
  if (!id) return fallbackPlaceholder;
  if (lado === "a") {
    const j1 = partido.equipo_a_j1 || "";
    const j2 = partido.equipo_a_j2 || "";
    if (j1 && j2) return `${j1} / ${j2}`;
    if (j1) return j1;
  } else {
    const j1 = partido.equipo_b_j1 || "";
    const j2 = partido.equipo_b_j2 || "";
    if (j1 && j2) return `${j1} / ${j2}`;
    if (j1) return j1;
  }
  return fallbackPlaceholder;
}

export const ProgramacionTab: React.FC<ProgramacionTabProps> = ({
  torneoId,
  partidos,
  isReadOnly = false,
  onRefresh,
}) => {
  const [preview, setPreview] = useState<ProgramacionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmarPublicar, setConfirmarPublicar] = useState(false);
  const [confirmarReprogramar, setConfirmarReprogramar] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await TorneosService.previewProgramacion(torneoId);
      setPreview(data);
    } catch (err: any) {
      sileo.error({
        title: "Programación",
        description: err?.message || "No se pudo cargar la programación.",
      });
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const partidosById = useMemo(() => {
    const map = new Map<string, Partido>();
    for (const p of partidos) map.set(p.id, p);
    return map;
  }, [partidos]);

  // Agrupamos por dia y cancha para renderizar la grilla.
  const agrupados = useMemo(() => {
    if (!preview) return [] as Array<{
      fechaKey: string;
      fechaLabel: string;
      canchas: Array<{
        cancha: string;
        partidos: PartidoProgramado[];
      }>;
    }>;

    const map = new Map<
      string,
      { fechaLabel: string; canchas: Map<string, PartidoProgramado[]> }
    >();

    for (const p of preview.partidos) {
      const key = fechaKey(p.fecha_partido);
      const label = fechaLegible(p.fecha_partido);
      const cancha = p.cancha_asignada?.trim() || "Sin cancha";
      if (!map.has(key)) map.set(key, { fechaLabel: label, canchas: new Map() });
      const dia = map.get(key)!;
      if (!dia.canchas.has(cancha)) dia.canchas.set(cancha, []);
      dia.canchas.get(cancha)!.push(p);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, dia]) => ({
        fechaKey: key,
        fechaLabel: dia.fechaLabel,
        canchas: [...dia.canchas.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([cancha, lista]) => ({
            cancha,
            partidos: lista.sort((x, y) => {
              const xh = x.fecha_partido || "";
              const yh = y.fecha_partido || "";
              return xh.localeCompare(yh);
            }),
          })),
      }));
  }, [preview]);

  const estadoActual = preview?.programacion_estado || "borrador";
  const estadoInfo = ESTADO_LABELS[estadoActual] || ESTADO_LABELS.borrador;
  const sinHorario = preview?.sin_horario?.length ?? 0;
  const totalPartidos = preview?.partidos?.length ?? 0;

  const handleReprogramarClick = () => {
    if (estadoActual === "publicado") {
      setConfirmarReprogramar(true);
      return;
    }
    void ejecutarReprogramar("");
  };

  const ejecutarReprogramar = async (motivo: string) => {
    setBusy(true);
    try {
      const data = await TorneosService.reprogramarProgramacion(torneoId, {
        motivo: motivo || undefined,
      });
      setPreview(data);
      sileo.success({
        title: "Programación recalculada",
        description: `Se reasignaron ${data.partidos.length} partido(s).`,
      });
      onRefresh?.();
    } catch (err: any) {
      sileo.error({
        title: "No se pudo reprogramar",
        description: err?.message || "Error inesperado.",
      });
    } finally {
      setBusy(false);
      setConfirmarReprogramar(false);
    }
  };

  const ejecutarPublicar = async () => {
    setBusy(true);
    try {
      const res = await TorneosService.publicarProgramacion(torneoId);
      sileo.success({
        title: "Programación publicada",
        description: `Visible al público desde ${new Intl.DateTimeFormat(
          "es-AR",
          { dateStyle: "medium", timeStyle: "short" },
        ).format(new Date(res.publicada_en))}.`,
      });
      await cargar();
      onRefresh?.();
    } catch (err: any) {
      sileo.error({
        title: "No se pudo publicar",
        description: err?.message || "Error inesperado.",
      });
    } finally {
      setBusy(false);
      setConfirmarPublicar(false);
    }
  };

  if (loading && !preview) {
    return (
      <div className="rounded-2xl border border-white/5 bg-brand-card p-8 text-center text-sm text-gray-400">
        Cargando programación…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estado y acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-white/5 bg-brand-card p-5">
        <div className="flex items-start gap-4">
          <div
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black uppercase tracking-widest ${estadoInfo.className}`}
          >
            <Sparkles className="size-3.5" />
            {estadoInfo.label}
          </div>
          <div>
            <p className="text-sm text-brand-white font-bold">
              {totalPartidos} partido{totalPartidos === 1 ? "" : "s"} en la
              programación
              {sinHorario > 0 && (
                <span className="ml-2 text-yellow-400">
                  · {sinHorario} sin horario
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{estadoInfo.hint}</p>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleReprogramarClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10 text-brand-white hover:bg-white/5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
              Recalcular horarios
            </button>
            <button
              type="button"
              disabled={
                busy ||
                estadoActual === "publicado" ||
                totalPartidos === 0 ||
                sinHorario > 0
              }
              onClick={() => setConfirmarPublicar(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-brand-chartreuse text-brand-black hover:bg-[#b3e600] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                sinHorario > 0
                  ? "Resolvé los partidos sin horario antes de publicar."
                  : estadoActual === "publicado"
                    ? "La programación ya está publicada."
                    : "Hacer visible la programación al público."
              }
            >
              <Send className="size-3.5" />
              {estadoActual === "publicado" ? "Ya publicada" : "Publicar programación"}
            </button>
          </div>
        )}
      </div>

      {/* Aviso si hay partidos sin horario */}
      {sinHorario > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-200">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {sinHorario} partido{sinHorario === 1 ? "" : "s"} sin cancha u horario asignado
            </p>
            <p className="text-xs text-yellow-300/80 mt-1">
              Ampliá la disponibilidad de canchas en la pestaña de Sedes o
              asigná manualmente desde el detalle del partido.
            </p>
          </div>
        </div>
      )}

      {/* Grilla dia x cancha x horario */}
      {agrupados.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-brand-card p-8 text-center text-sm text-gray-500">
          Todavía no hay partidos programados. Generá las zonas para armar la
          programación tentativa.
        </div>
      ) : (
        <div className="space-y-6">
          {agrupados.map((dia) => (
            <div
              key={dia.fechaKey}
              className="rounded-2xl border border-white/5 bg-brand-card overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-brand-black/40">
                <CalendarDays className="size-4 text-brand-chartreuse" />
                <h4 className="text-sm font-black text-brand-white uppercase tracking-wide">
                  {dia.fechaLabel}
                </h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                {dia.canchas.map((c) => (
                  <div
                    key={c.cancha}
                    className="rounded-xl border border-white/5 bg-brand-black/50 p-3"
                  >
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                      {c.cancha}
                    </p>
                    <ul className="space-y-2">
                      {c.partidos.map((p) => {
                        const source = partidosById.get(p.id);
                        const placeA = `1${(p.ronda || "").replace(/[^A-Z]/gi, "").slice(0, 1) || "A"}`;
                        const placeB = `2${(p.ronda || "").replace(/[^A-Z]/gi, "").slice(0, 1) || "B"}`;
                        const nombreA = nombreEquipo(source, "a", placeA);
                        const nombreB = nombreEquipo(source, "b", placeB);
                        return (
                          <li
                            key={p.id}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                              p.horario_bloqueado
                                ? "border-brand-chartreuse/30 bg-brand-chartreuse/5"
                                : "border-white/5 bg-brand-black/60"
                            }`}
                          >
                            <span className="shrink-0 w-12 text-center text-sm font-black text-brand-chartreuse">
                              {formatearHora(p.fecha_partido)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                                {p.ronda || "Ronda"}{" "}
                                {typeof p.orden === "number" && `#${p.orden}`}
                              </p>
                              <p className="text-xs text-brand-white truncate">
                                {nombreA}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                vs {nombreB}
                              </p>
                            </div>
                            {p.horario_bloqueado && (
                              <Lock
                                className="size-3.5 text-brand-chartreuse shrink-0 mt-0.5"
                                aria-label="Horario bloqueado (edición manual)"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: confirmar publicar */}
      <FeedbackModal
        isOpen={confirmarPublicar}
        onClose={() => (busy ? undefined : setConfirmarPublicar(false))}
        onConfirm={() => ejecutarPublicar()}
        type="warning"
        title="Publicar programación al público"
        description={`Confirmá que la programación (${totalPartidos} partido${totalPartidos === 1 ? "" : "s"}) queda visible en la página pública del torneo. A partir de este momento, cualquier cambio de horario requiere motivo y queda auditado.`}
        confirmText={busy ? "Publicando…" : "Publicar"}
        cancelText="Cancelar"
        isLoading={busy}
      />

      {/* Modal: reprogramar con motivo obligatorio (solo si publicado) */}
      <FeedbackModal
        isOpen={confirmarReprogramar}
        onClose={() => (busy ? undefined : setConfirmarReprogramar(false))}
        onConfirm={(motivo) => {
          const clean = (motivo || "").trim();
          if (clean.length < 8) {
            sileo.warning({
              title: "Motivo requerido",
              description: "Escribí al menos 8 caracteres explicando el cambio.",
            });
            return;
          }
          void ejecutarReprogramar(clean);
        }}
        type="danger"
        title="Reprogramar torneo publicado"
        description="La programación ya fue publicada. Escribí un motivo (mín. 8 caracteres) que quede en la auditoría del cambio."
        confirmText={busy ? "Reprogramando…" : "Reprogramar"}
        cancelText="Cancelar"
        isLoading={busy}
        showInput
        inputLabel="Motivo del cambio"
        inputPlaceholder="Ej: se cayó el sistema de canchas de la sede A."
      />
    </div>
  );
};
