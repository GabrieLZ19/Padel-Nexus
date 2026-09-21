"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Lock,
  MapPin,
  RefreshCw,
  Send,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  TorneosService,
  type PartidoProgramado,
  type ProgramacionPreview,
} from "@/utils/services/torneos";
import type { Partido } from "@/utils/types";
import { sileo } from "sileo";
import FeedbackModal from "@/components/ui/FeedbackModal";

/**
 * Sub-pestana Programacion del BracketEditor. Ciclo:
 * borrador (sin horarios) -> programado (tentativo, no publico) -> publicado.
 *
 * Layout: selector de dia + matriz canchas x horas (grilla scrollable), con
 * cada partido pintado por tipo de ronda. Los partidos sin horario van en un
 * panel colapsable aparte para no ensuciar la matriz principal.
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
    hint: "Aún no hay horarios asignados. Generá zonas para armar la programación tentativa.",
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
    className:
      "bg-brand-chartreuse/10 border-brand-chartreuse/30 text-brand-chartreuse",
  },
};

// Paleta consistente por tipo de ronda; degradados sutiles para diferenciar sin gritar.
type CategoriaRonda =
  | "zona"
  | "preliminar"
  | "cuartos"
  | "semis"
  | "final"
  | "otra";

const RONDA_STYLES: Record<
  CategoriaRonda,
  { badge: string; card: string; label: string }
> = {
  zona: {
    badge: "bg-white/5 text-gray-300 border border-white/10",
    card: "border-white/10 bg-brand-black/60 hover:bg-white/5",
    label: "Zona",
  },
  preliminar: {
    badge: "bg-sky-500/10 text-sky-300 border border-sky-500/30",
    card: "border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/10",
    label: "Prelim.",
  },
  cuartos: {
    badge: "bg-violet-500/10 text-violet-300 border border-violet-500/30",
    card: "border-violet-500/20 bg-violet-500/[0.06] hover:bg-violet-500/10",
    label: "Cuartos",
  },
  semis: {
    badge: "bg-orange-500/10 text-orange-300 border border-orange-500/30",
    card: "border-orange-500/20 bg-orange-500/[0.06] hover:bg-orange-500/10",
    label: "Semis",
  },
  final: {
    badge:
      "bg-brand-chartreuse/15 text-brand-chartreuse border border-brand-chartreuse/40",
    card:
      "border-brand-chartreuse/30 bg-brand-chartreuse/5 hover:bg-brand-chartreuse/10",
    label: "Final",
  },
  otra: {
    badge: "bg-white/5 text-gray-400 border border-white/10",
    card: "border-white/10 bg-brand-black/50 hover:bg-white/5",
    label: "Otro",
  },
};

function categorizarRonda(ronda?: string | null): CategoriaRonda {
  const r = String(ronda || "").trim().toUpperCase();
  if (/^ZONA\s+/.test(r)) return "zona";
  if (r === "FINAL") return "final";
  if (r === "SEMIS" || r === "SEMIFINAL") return "semis";
  if (r === "CUARTOS") return "cuartos";
  if (
    r === "PRELIMINARES" ||
    r === "OCTAVOS" ||
    r === "16AVOS" ||
    r === "32AVOS"
  ) {
    return "preliminar";
  }
  return "otra";
}

function formatearHora(iso?: string | null): string {
  if (!iso) return "--:--";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "--:--";
  }
}

function fechaLegibleCorta(iso?: string | null): string {
  if (!iso) return "Sin fecha";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(d);
  } catch {
    return "Sin fecha";
  }
}

function fechaLegibleLarga(iso?: string | null): string {
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
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date(iso));
  } catch {
    return "sin-fecha";
  }
}

/**
 * Nombre humano de un equipo. Si el partido de llave no tiene equipo asignado,
 * mostramos placeholder de feeders ("1A", "2B") para que el admin no vea slots
 * vacios sin contexto.
 */
function nombreEquipoCorto(
  partido: Partido | undefined,
  lado: "a" | "b",
  fallbackPlaceholder: string,
): string {
  if (!partido) return fallbackPlaceholder;
  const id = lado === "a" ? partido.equipo_a_id : partido.equipo_b_id;
  if (!id) return fallbackPlaceholder;
  const j1 =
    lado === "a" ? partido.equipo_a_j1 || "" : partido.equipo_b_j1 || "";
  const j2Raw =
    lado === "a" ? partido.equipo_a_j2 || "" : partido.equipo_b_j2 || "";
  const j2 = j2Raw.trim() === "-" ? "" : j2Raw;
  const soloApellido = (nombre: string) => {
    const trimmed = nombre.trim();
    if (!trimmed || trimmed === "-") return "";
    // Si viene "Juan Perez" preferimos el apellido; si viene un solo token, lo devolvemos tal cual.
    const parts = trimmed.split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : trimmed;
  };
  const a = soloApellido(j1);
  const b = soloApellido(j2);
  if (a && b) return `${a} / ${b}`;
  if (a) return a;
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
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [sinHorarioAbierto, setSinHorarioAbierto] = useState(true);

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

  /** Partidos que sí tienen día y cancha (renderizables en la matriz). */
  const conHorario = useMemo(() => {
    return (preview?.partidos ?? []).filter(
      (p) => p.fecha_partido && p.cancha_asignada,
    );
  }, [preview]);

  /** Partidos sin día o sin cancha: se muestran en panel aparte. */
  const sinHorario = useMemo(() => {
    return (preview?.partidos ?? []).filter(
      (p) => !p.fecha_partido || !p.cancha_asignada,
    );
  }, [preview]);

  /** Días ordenados con conteo y label. */
  const dias = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; corto: string; count: number; sample: string | null }
    >();
    for (const p of conHorario) {
      const key = fechaKey(p.fecha_partido);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: fechaLegibleLarga(p.fecha_partido),
          corto: fechaLegibleCorta(p.fecha_partido),
          count: 0,
          sample: p.fecha_partido,
        });
      }
      map.get(key)!.count++;
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [conHorario]);

  // Autoseleccion del primer dia disponible.
  useEffect(() => {
    if (dias.length === 0) {
      setDiaSeleccionado(null);
      return;
    }
    if (!diaSeleccionado || !dias.some((d) => d.key === diaSeleccionado)) {
      setDiaSeleccionado(dias[0].key);
    }
  }, [dias, diaSeleccionado]);

  /** Datos derivados del día actual: canchas, horas y matriz de partidos. */
  const matriz = useMemo(() => {
    if (!diaSeleccionado) {
      return { canchas: [] as string[], horas: [] as string[], celdas: new Map<string, PartidoProgramado>() };
    }
    const items = conHorario.filter(
      (p) => fechaKey(p.fecha_partido) === diaSeleccionado,
    );
    const canchasSet = new Set<string>();
    const horasSet = new Set<string>();
    const celdas = new Map<string, PartidoProgramado>();
    for (const p of items) {
      const cancha = (p.cancha_asignada || "").trim();
      const hora = formatearHora(p.fecha_partido);
      canchasSet.add(cancha);
      horasSet.add(hora);
      // Un partido por cancha+hora (si hay colision, gana el ultimo — el scheduler evita esto).
      celdas.set(`${cancha}|${hora}`, p);
    }
    const canchas = [...canchasSet].sort((a, b) => a.localeCompare(b));
    const horas = [...horasSet].sort((a, b) => a.localeCompare(b));
    return { canchas, horas, celdas };
  }, [conHorario, diaSeleccionado]);

  const estadoActual = preview?.programacion_estado || "borrador";
  const estadoInfo = ESTADO_LABELS[estadoActual] || ESTADO_LABELS.borrador;
  const totalPartidos = preview?.partidos?.length ?? 0;
  const totalCanchas = useMemo(() => {
    const s = new Set<string>();
    for (const p of conHorario) if (p.cancha_asignada) s.add(p.cancha_asignada);
    return s.size;
  }, [conHorario]);

  const puedePublicar =
    estadoActual !== "publicado" &&
    totalPartidos > 0 &&
    sinHorario.length === 0;

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
      {/* Header: estado + acciones */}
      <div className="rounded-2xl border border-white/5 bg-brand-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black uppercase tracking-widest ${estadoInfo.className}`}
            >
              <Sparkles className="size-3.5" />
              {estadoInfo.label}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-brand-white font-bold">
                {estadoActual === "publicado"
                  ? "Programación visible al público"
                  : estadoActual === "programado"
                    ? "Programación lista para publicar"
                    : "Programación en borrador"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{estadoInfo.hint}</p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={handleReprogramarClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10 text-brand-white hover:bg-white/5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${busy ? "animate-spin" : ""}`}
                />
                Recalcular
              </button>
              <button
                type="button"
                disabled={busy || !puedePublicar}
                onClick={() => setConfirmarPublicar(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-brand-chartreuse text-brand-black hover:bg-[#b3e600] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={
                  sinHorario.length > 0
                    ? "Resolvé los partidos sin horario antes de publicar."
                    : estadoActual === "publicado"
                      ? "La programación ya está publicada."
                      : "Hacer visible la programación al público."
                }
              >
                <Send className="size-3.5" />
                {estadoActual === "publicado" ? "Publicada" : "Publicar"}
              </button>
            </div>
          )}
        </div>

        {/* Metricas compactas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <MetricPill
            label="Partidos"
            value={String(totalPartidos)}
            hint={`${conHorario.length} con horario`}
          />
          <MetricPill
            label="Días"
            value={String(dias.length)}
            hint={dias[0]?.corto || "—"}
          />
          <MetricPill
            label="Canchas"
            value={String(totalCanchas)}
            hint="en uso"
          />
          <MetricPill
            label="Sin horario"
            value={String(sinHorario.length)}
            hint={
              sinHorario.length > 0 ? "requieren ajuste" : "todo asignado"
            }
            tone={sinHorario.length > 0 ? "warn" : "ok"}
          />
        </div>
      </div>

      {/* Selector de dias */}
      {dias.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {dias.map((d) => {
            const activo = d.key === diaSeleccionado;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDiaSeleccionado(d.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  activo
                    ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                    : "bg-brand-card border-white/10 text-gray-400 hover:text-brand-white hover:border-white/20"
                }`}
              >
                <CalendarClock className="size-3.5" />
                <span className="capitalize">{d.corto}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black ${
                    activo
                      ? "bg-brand-black/20 text-brand-black"
                      : "bg-white/5 text-gray-400"
                  }`}
                >
                  {d.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Matriz canchas x horas */}
      {matriz.canchas.length === 0 || matriz.horas.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-brand-card p-8 text-center text-sm text-gray-500">
          {conHorario.length === 0
            ? "Todavía no hay partidos con horario asignado. Generá las zonas para armar la programación tentativa."
            : "Elegí un día para ver la grilla."}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-brand-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/5 bg-brand-black/40">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="size-4 text-brand-chartreuse shrink-0" />
              <h4 className="text-sm font-black text-brand-white uppercase tracking-wide truncate capitalize">
                {dias.find((d) => d.key === diaSeleccionado)?.label ||
                  "Programación"}
              </h4>
            </div>
            <LeyendaRondas />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-brand-card px-3 py-2 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 w-20">
                    <span className="inline-flex items-center gap-1.5">
                      <Timer className="size-3" /> Hora
                    </span>
                  </th>
                  {matriz.canchas.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 border-b border-white/5 min-w-[180px]"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <MapPin className="size-3 text-brand-chartreuse shrink-0" />
                        <span className="truncate" title={c}>
                          {c}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.horas.map((hora, idx) => (
                  <tr key={hora}>
                    <td
                      className={`sticky left-0 z-10 bg-brand-card px-3 py-2 border-b border-white/5 font-black text-sm text-brand-chartreuse tabular-nums align-top ${
                        idx === matriz.horas.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      {hora}
                    </td>
                    {matriz.canchas.map((cancha) => {
                      const p = matriz.celdas.get(`${cancha}|${hora}`);
                      const isLast = idx === matriz.horas.length - 1;
                      return (
                        <td
                          key={cancha}
                          className={`px-2 py-2 border-b border-white/5 align-top ${
                            isLast ? "border-b-0" : ""
                          }`}
                        >
                          {p ? (
                            <MatchCell
                              partido={p}
                              source={partidosById.get(p.id)}
                            />
                          ) : (
                            <div className="h-full min-h-[52px] rounded-lg border border-dashed border-white/5" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel colapsable: partidos sin horario */}
      {sinHorario.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.04] overflow-hidden">
          <button
            type="button"
            onClick={() => setSinHorarioAbierto((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-yellow-500/[0.06] transition-colors cursor-pointer"
          >
            <AlertTriangle className="size-4 text-yellow-400 shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-yellow-200">
                {sinHorario.length} partido{sinHorario.length === 1 ? "" : "s"} sin
                cancha u horario
              </p>
              <p className="text-[11px] text-yellow-300/70 mt-0.5">
                Ampliá la disponibilidad en la pestaña de Sedes o asigná
                manualmente desde el detalle del partido.
              </p>
            </div>
            {sinHorarioAbierto ? (
              <ChevronUp className="size-4 text-yellow-300 shrink-0" />
            ) : (
              <ChevronDown className="size-4 text-yellow-300 shrink-0" />
            )}
          </button>
          {sinHorarioAbierto && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4 pt-0">
              {sinHorario.map((p) => {
                const source = partidosById.get(p.id);
                const cat = categorizarRonda(p.ronda);
                const style = RONDA_STYLES[cat];
                const placeA = `1${(p.ronda || "").replace(/[^A-Z]/gi, "").slice(0, 1) || "A"}`;
                const placeB = `2${(p.ronda || "").replace(/[^A-Z]/gi, "").slice(0, 1) || "B"}`;
                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border p-3 ${style.card}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${style.badge}`}
                      >
                        {p.ronda || style.label}
                        {typeof p.orden === "number" && ` · ${p.orden}`}
                      </span>
                    </div>
                    <p className="text-xs text-brand-white truncate">
                      {nombreEquipoCorto(source, "a", placeA)}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      vs {nombreEquipoCorto(source, "b", placeB)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: confirmar publicar */}
      <FeedbackModal
        isOpen={confirmarPublicar}
        onClose={() =>
          busy ? undefined : setConfirmarPublicar(false)
        }
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
        onClose={() =>
          busy ? undefined : setConfirmarReprogramar(false)
        }
        onConfirm={(motivo) => {
          const clean = (motivo || "").trim();
          if (clean.length < 8) {
            sileo.warning({
              title: "Motivo requerido",
              description:
                "Escribí al menos 8 caracteres explicando el cambio.",
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

interface MetricPillProps {
  label: string;
  value: string;
  hint: string;
  tone?: "ok" | "warn" | "default";
}

function MetricPill({ label, value, hint, tone = "default" }: MetricPillProps) {
  const toneClass =
    tone === "warn"
      ? "border-yellow-500/30 bg-yellow-500/[0.04]"
      : tone === "ok"
        ? "border-brand-chartreuse/20 bg-brand-chartreuse/[0.04]"
        : "border-white/5 bg-brand-black/40";
  const valueClass =
    tone === "warn"
      ? "text-yellow-300"
      : tone === "ok"
        ? "text-brand-chartreuse"
        : "text-brand-white";
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`text-2xl font-black leading-tight mt-0.5 ${valueClass}`}>
        {value}
      </p>
      <p className="text-[10px] text-gray-500 mt-0.5">{hint}</p>
    </div>
  );
}

function LeyendaRondas() {
  const items: Array<{ key: CategoriaRonda; label: string }> = [
    { key: "zona", label: "Zonas" },
    { key: "preliminar", label: "Prelim." },
    { key: "cuartos", label: "Cuartos" },
    { key: "semis", label: "Semis" },
    { key: "final", label: "Final" },
  ];
  return (
    <div className="hidden md:flex items-center gap-2">
      {items.map((it) => (
        <span
          key={it.key}
          className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${RONDA_STYLES[it.key].badge}`}
        >
          {it.label}
        </span>
      ))}
    </div>
  );
}

interface MatchCellProps {
  partido: PartidoProgramado;
  source: Partido | undefined;
}

function MatchCell({ partido, source }: MatchCellProps) {
  const cat = categorizarRonda(partido.ronda);
  const style = RONDA_STYLES[cat];
  const placeA = `1${(partido.ronda || "").replace(/[^A-Z]/gi, "").slice(0, 1) || "A"}`;
  const placeB = `2${(partido.ronda || "").replace(/[^A-Z]/gi, "").slice(0, 1) || "B"}`;
  const nombreA = nombreEquipoCorto(source, "a", placeA);
  const nombreB = nombreEquipoCorto(source, "b", placeB);
  return (
    <div
      className={`group h-full rounded-lg border px-2.5 py-2 transition-colors ${style.card}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${style.badge}`}
        >
          {partido.ronda || style.label}
          {typeof partido.orden === "number" && ` · ${partido.orden}`}
        </span>
        {partido.horario_bloqueado && (
          <Lock
            className="size-3 text-brand-chartreuse shrink-0"
            aria-label="Horario bloqueado (edición manual)"
          />
        )}
      </div>
      <p className="text-xs text-brand-white truncate leading-tight">
        {nombreA}
      </p>
      <p className="text-[11px] text-gray-400 truncate leading-tight">
        vs {nombreB}
      </p>
    </div>
  );
}
