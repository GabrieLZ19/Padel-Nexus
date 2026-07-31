import React, { useState, useEffect } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido } from "@/utils/types";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";
import { api } from "@/utils/api";

interface Paso8ArbitrajeProps {
  torneo?: any;
  partidos: Partido[];
  torneoId?: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
  isReadOnly?: boolean;
}

export const Paso8Arbitraje = ({
  torneo,
  partidos,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  isReadOnly = false,
}: Paso8ArbitrajeProps) => {
  const [guardandoPartidoId, setGuardandoPartidoId] = useState<string | null>(
    null,
  );
  const [disponibilidadesPaso5, setDisponibilidadesPaso5] = useState<any[]>([]);

  useEffect(() => {
    if (!torneoId) return;
    api
      .get(`/torneos/${torneoId}/canchas-disponibilidad`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setDisponibilidadesPaso5(Array.isArray(list) ? list : []);
      })
      .catch(() => setDisponibilidadesPaso5([]));
  }, [torneoId]);

  // Helper para ordenamiento estable de partidos por Ronda (Zona A, Zona B...) y Orden
  const sortPartidosEstable = (list: Partido[]) => {
    return [...list].sort((a, b) => {
      const rondaA = String(a.ronda || "").toUpperCase();
      const rondaB = String(b.ronda || "").toUpperCase();
      if (rondaA !== rondaB) {
        return rondaA.localeCompare(rondaB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      const ordenA = a.orden ?? 0;
      const ordenB = b.orden ?? 0;
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return String(a.id).localeCompare(String(b.id));
    });
  };

  // Filtramos los partidos que ya tienen contrincantes pero no tienen ganador con orden estable
  const partidosJugables = sortPartidosEstable(
    partidos.filter((p) => p.equipo_a_id && p.equipo_b_id && p.ganador === null),
  );

  const handleGuardarResultadoLive = async (
    partidoId: string,
    ganadorId: string,
    scorePayload: {
      set1_a: number;
      set1_b: number;
      set2_a?: number | null;
      set2_b?: number | null;
      set3_a?: number | null;
      set3_b?: number | null;
      es_supertiebreak?: boolean;
      es_wo?: boolean;
      es_injustificado_wo?: boolean;
    },
  ) => {
    try {
      setGuardandoPartidoId(partidoId);
      await TorneosService.actualizarResultado(partidoId, {
        ganador_id: ganadorId,
        ...scorePayload,
      });

      triggerRefresh();

      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "success",
        title: "¡Marcador guardado!",
        description:
          "El marcador fue guardado y el ganador avanzó en la llave.",
      }));
    } catch (error: any) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: error.message || "Error al impactar el marcador.",
      }));
    } finally {
      setGuardandoPartidoId(null);
    }
  };

  const showErrorModal = (msg: string) => {
    setFeedbackModal((prev: any) => ({
      ...prev,
      isOpen: true,
      type: "warning",
      title: "Atención",
      description: msg,
    }));
  };

  return (
    <div className="space-y-6">
      {/* CARGA DE RESULTADOS DE PARTIDOS PENDIENTES */}
      {!isReadOnly && partidosJugables.length > 0 && (
        <div className="bg-brand-card rounded-3xl border border-white/5 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-white text-xl mb-1">
                Carga de Resultados
              </h3>
              <p className="text-gray-400 text-sm">
                Suma los puntos de cada Partido. El sistema llevará la cuenta y
                cuando finalices el partido, avanzará la llave.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("times")}
                className="flex items-center justify-center gap-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse px-4 py-2.5 rounded-xl font-bold transition-all text-xs border border-brand-chartreuse/30 cursor-pointer shrink-0"
              >
                + Administrar Canchas en Paso 5 (Sedes)
              </button>
              {torneo?.estado === "Finalizado" && (
                <button
                  type="button"
                  onClick={async () => {
                    const { generarPdfGrillaPartidos } =
                      await import("@/utils/grillaPdf");
                    generarPdfGrillaPartidos(torneo, partidos);
                  }}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs border border-white/10 cursor-pointer shrink-0"
                >
                  Imprimir Grilla (PDF)
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {partidosJugables.map((partido) => (
              <LiveArbitrajeRow
                key={partido.id}
                partido={partido}
                torneo={torneo}
                todosLosPartidos={partidos}
                disponibilidades={disponibilidadesPaso5}
                onSave={handleGuardarResultadoLive}
                onPartidoUpdated={triggerRefresh}
                isSaving={guardandoPartidoId === partido.id}
                onError={showErrorModal}
              />
            ))}
          </div>
        </div>
      )}

      {partidos.length === 0 && (
        <div className="bg-brand-card rounded-3xl border border-white/5 p-8 text-center text-gray-400 text-sm font-medium">
          No hay partidos generados en el cuadro para este torneo.
        </div>
      )}

      {/* DESGLOSE DETALLADO DE PARTIDOS FINALIZADOS ESTILO RANKEDIN */}
      {partidos.filter((p) => p.ganador !== null).length > 0 && (
        <div className="bg-brand-card rounded-3xl border border-white/10 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
            <h4 className="font-extrabold text-white text-base flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
              Desglose Detallado de Resultados Finalizados (
              {partidos.filter((p) => p.ganador !== null).length})
            </h4>
            {torneo?.estado === "Finalizado" && (
              <button
                type="button"
                onClick={async () => {
                  const { generarPdfGrillaPartidos } =
                    await import("@/utils/grillaPdf");
                  generarPdfGrillaPartidos(torneo, partidos);
                }}
                className="flex items-center justify-center gap-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse px-4 py-2 rounded-xl font-bold transition-all text-xs border border-brand-chartreuse/30 cursor-pointer shrink-0"
              >
                Imprimir Grilla (PDF)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortPartidosEstable(partidos.filter((p) => p.ganador !== null))
              .map((p) => {
                const isGanadorA = p.ganador === p.equipo_a_id;
                const isGanadorB = p.ganador === p.equipo_b_id;

                const nameA =
                  [p.equipo_a_j1, p.equipo_a_j2]
                    .filter((n) => n && n !== "-" && n !== "Libre")
                    .join(" / ") || "Pareja A";
                const nameB =
                  [p.equipo_b_j1, p.equipo_b_j2]
                    .filter((n) => n && n !== "-" && n !== "Libre")
                    .join(" / ") || "Pareja B";

                const s1A = p.set1_a ?? (p as any).set1_a ?? null;
                const s1B = p.set1_b ?? (p as any).set1_b ?? null;
                const s2A = (p as any).set2_a ?? null;
                const s2B = (p as any).set2_b ?? null;
                const s3A = (p as any).set3_a ?? null;
                const s3B = (p as any).set3_b ?? null;

                const tieneSet3 = s3A !== null && s3B !== null;

                const formatMatchDateTimeInfo = (
                  cancha?: string | null,
                  fechaIso?: string | null,
                ) => {
                  const parts: string[] = [];
                  if (cancha) parts.push(cancha);
                  if (fechaIso) {
                    try {
                      const d = new Date(fechaIso);
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const dd = String(d.getDate()).padStart(2, "0");
                      const dayName = d.toLocaleDateString("es-AR", {
                        weekday: "short",
                      });
                      const capDay =
                        dayName.charAt(0).toUpperCase() +
                        dayName.slice(1).replace(".", "");
                      const hh = String(d.getHours()).padStart(2, "0");
                      const mins = String(d.getMinutes()).padStart(2, "0");
                      parts.push(`${capDay} ${dd}/${mm}/${yyyy} · ${hh}:${mins} hs`);
                    } catch {}
                  }
                  return parts.length > 0 ? parts.join(" · ") : "Cancha Principal";
                };

                return (
                  <div
                    key={p.id}
                    className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg"
                  >
                    <div className="flex flex-wrap justify-between items-center border-b border-white/5 pb-2 gap-2">
                      <span className="text-[10px] text-brand-chartreuse font-black uppercase tracking-widest bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2.5 py-0.5 rounded-full">
                        {p.ronda}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {formatMatchDateTimeInfo(
                          p.cancha_asignada,
                          (p as any).fecha_partido,
                        )}
                      </span>
                    </div>

                    {/* Tablero Fila a Fila (RankedIn Style) */}
                    <div className="space-y-2">
                      {/* Fila Equipo A */}
                      <div
                        className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${
                          isGanadorA
                            ? "bg-brand-chartreuse/10 border-brand-chartreuse/30"
                            : "bg-black/20 border-white/5 opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className={`text-xs font-black truncate ${
                              isGanadorA
                                ? "text-brand-chartreuse"
                                : "text-white"
                            }`}
                          >
                            {nameA}
                          </span>
                          {isGanadorA && (
                            <span className="text-[9px] font-black bg-brand-chartreuse text-brand-black px-1.5 py-0.5 rounded uppercase shrink-0">
                              GANADOR
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 font-mono">
                          {s1A !== null && (
                            <span
                              className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg ${
                                Number(s1A) > Number(s1B)
                                  ? "bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              {s1A}
                            </span>
                          )}
                          {s2A !== null && (
                            <span
                              className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg ${
                                Number(s2A) > Number(s2B)
                                  ? "bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              {s2A}
                            </span>
                          )}
                          {tieneSet3 && (
                            <span
                              className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg ${
                                Number(s3A) > Number(s3B)
                                  ? "bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              {s3A}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fila Equipo B */}
                      <div
                        className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${
                          isGanadorB
                            ? "bg-brand-chartreuse/10 border-brand-chartreuse/30"
                            : "bg-black/20 border-white/5 opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className={`text-xs font-black truncate ${
                              isGanadorB
                                ? "text-brand-chartreuse"
                                : "text-white"
                            }`}
                          >
                            {nameB}
                          </span>
                          {isGanadorB && (
                            <span className="text-[9px] font-black bg-brand-chartreuse text-brand-black px-1.5 py-0.5 rounded uppercase shrink-0">
                              GANADOR
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 font-mono">
                          {s1B !== null && (
                            <span
                              className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg ${
                                Number(s1B) > Number(s1A)
                                  ? "bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              {s1B}
                            </span>
                          )}
                          {s2B !== null && (
                            <span
                              className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg ${
                                Number(s2B) > Number(s2A)
                                  ? "bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              {s2B}
                            </span>
                          )}
                          {tieneSet3 && (
                            <span
                              className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg ${
                                Number(s3B) > Number(s3A)
                                  ? "bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/40"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              {s3B}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("draws")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <div className="text-xs text-gray-500 font-semibold flex items-center">
          Al arbitrar el último partido de la Final, el torneo pasa
          automáticamente a estado Finalizado.
        </div>
      </div>
    </div>
  );
};
