"use client";

import React, { useState, useEffect } from "react";
import { DragDropPairing, ZonaDrag } from "./DragDropPairing";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Partido } from "@/utils/types";
import {
  GitMerge,
  LayoutGrid,
  History,
  Check,
  PenLine,
  RefreshCw,
  Plus,
  Trophy,
  Move,
  X,
} from "lucide-react";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import { MatchCard } from "./MatchCard";
import CustomDropdown from "@/components/ui/CustomDropdown";

interface BracketEditorProps {
  torneoId: string;
  torneo?: Torneo;
  partidos?: Partido[];
}

export const BracketEditor: React.FC<BracketEditorProps> = ({
  torneoId,
  torneo,
  partidos = [],
}) => {
  const [activeView, setActiveView] = useState<
    "zonas" | "llaves" | "auditoria"
  >(torneo?.formato === "Eliminatoria Directa" ? "llaves" : "zonas");
  const [zonas, setZonas] = useState<ZonaDrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [modificacionNoDestructiva, setModificacionNoDestructiva] =
    useState(true);
  const [tamanioGrupo, setTamanioGrupo] = useState<number>(3);
  const [auditoriaLogs, setAuditoriaLogs] = useState<any[]>([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);

  const isIndividual = torneo?.modalidad?.toLowerCase() === "individual";

  const [tourStep, setTourStep] = useState<number | null>(null);

  const TOUR_STEPS = [
    {
      title: "1. Generación Automática de Zonas",
      description: `Haz clic en "Regenerar automático" para mezclar y agrupar a todos los jugadores confirmados en grupos. Esto se realiza siguiendo las normas de ranking oficiales de la FAP (Snake Draft).`,
    },
    {
      title: "2. Reubicar Jugadores (Modo Edición)",
      description: `Haz clic en el botón "Editar" arriba a la derecha. Esto desbloqueará el drag and drop (arrastrar y soltar) para que puedas acomodar los jugadores manualmente en caso de ajustes de última hora.`,
    },
    {
      title: "3. Modificación No Destructiva",
      description: `Cuando este switch está activo (ON), puedes mover jugadores manualmente de una zona a otra sin preocuparte por destruir los partidos o resultados que ya hayan sido jugados en la base de datos.`,
    },
    {
      title: "4. Carga de Resultados (Arbitraje en Vivo)",
      description: `Una vez conformados los grupos, ve a la pestaña superior "Arbitraje en Vivo" para ingresar los marcadores de cada partido. Las estadísticas (PJ, PG, PTS) de cada zona se calcularán automáticamente en tiempo real bajo los nombres de los jugadores.`,
    },
    {
      title: "5. Generar Cuadro Eliminatorio (Llaves)",
      description: `Una vez disputados todos los partidos grupales y clasificadas las mejores duplas, ve a la pestaña "Llave campeonato" para dar de alta los Playoffs de eliminatoria directa.`,
    },
  ];

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  const loadZonas = async () => {
    try {
      setLoading(true);
      const data = await TorneosService.getZonas(torneoId);
      const formattedZonas: ZonaDrag[] = data.map((grupo: any) => ({
        id: grupo.id,
        nombre: grupo.nombre_grupo,
        parejas: grupo.grupo_parejas.map((gp: any) => ({
          id: gp.inscripcion_id,
          seed: gp.seed,
          jugador1_nombre: gp.inscripciones.jugador1_nombre,
          jugador2_nombre: gp.inscripciones.jugador2_nombre,
          club: gp.clubName || "Sin club asignado",
        })),
      }));
      setZonas(formattedZonas);
    } catch (error) {
      console.error("Error fetching zonas", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerarZonas = async () => {
    try {
      setLoading(true);
      await TorneosService.generarZonas(torneoId, tamanioGrupo);
      await loadZonas();
      setFeedbackModal({
        isOpen: true,
        type: "success",
        title: "Zonas Generadas",
        description:
          "Las zonas se han generado automáticamente según el reglamento FAP.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } catch (error: any) {
      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "Error al generar zonas",
        description:
          error.response?.data?.error ||
          error.message ||
          "No se pudieron generar las zonas.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditoria = async () => {
    try {
      setLoadingAuditoria(true);
      const data = await TorneosService.getAuditoria(torneoId);
      setAuditoriaLogs(data || []);
    } catch (error) {
      console.error("Error al cargar auditoria:", error);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  useEffect(() => {
    loadZonas();
  }, [torneoId]);

  useEffect(() => {
    if (activeView === "auditoria") {
      loadAuditoria();
    }
  }, [activeView]);

  const handleMovePareja = (
    inscripcionId: string,
    origenId: string,
    destinoId: string,
  ) => {
    let movedPareja: any = null;
    const nextZonas = zonas.map((z) => {
      if (z.id === origenId) {
        movedPareja = z.parejas.find((p) => p.id === inscripcionId);
        return {
          ...z,
          parejas: z.parejas.filter((p) => p.id !== inscripcionId),
        };
      }
      return z;
    });

    if (movedPareja) {
      const finalZonas = nextZonas.map((z) => {
        if (z.id === destinoId) {
          return {
            ...z,
            parejas: [...z.parejas, movedPareja],
          };
        }
        return z;
      });
      setZonas(finalZonas);
    }
  };

  const handleGuardarCambios = () => {
    if (isEditing) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Confirmar Distribución",
        description:
          "Por favor, indica el motivo por el cual modificaste manualmente la disposición de las zonas. Esto quedará registrado en auditoría y re-generará el fixture correspondiente.",
        confirmText: "Guardar",
        cancelText: "Cancelar",
        showInput: true,
        inputLabel: "Motivo del cambio",
        inputPlaceholder: "Ej: Se reubicó por ranking/incompatibilidad",
        onConfirm: async (motivo?: string) => {
          if (!motivo) return;
          try {
            setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
            await TorneosService.guardarZonas(torneoId, {
              zonas: zonas.map((z) => ({
                id: z.id,
                nombre: z.nombre,
                parejas: z.parejas.map((p) => ({ id: p.id })),
              })),
              motivo: motivo,
            });
            setIsEditing(false);
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "Cambios Guardados",
              description:
                "La disposición de las zonas y los partidos se actualizaron exitosamente.",
              onClose: () => {
                setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
                window.location.reload();
              },
            });
          } catch (error: any) {
            setFeedbackModal({
              isOpen: true,
              type: "error",
              title: "Error al guardar",
              description:
                error.message || "No se pudieron guardar los cambios.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          }
        },
        onClose: () => {
          setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setIsEditing(true);
    }
  };

  const totalParejas = zonas.reduce((acc, z) => acc + z.parejas.length, 0);

  const RONDAS_CONFIG = [
    { id: "OCTAVOS", label: "Octavos", required: 8 },
    { id: "CUARTOS", label: "Cuartos", required: 4 },
    { id: "SEMIS", label: "Semis", required: 2 },
    { id: "FINAL", label: "Final", required: 1 },
  ];

  const totalZonas =
    zonas.length || Math.floor((torneo?.cupos_maximos || 8) / 3);
  const advancingPlayers =
    torneo?.formato === "Eliminatoria Directa"
      ? torneo?.cupos_maximos || 16
      : totalZonas * 2;

  const rondasToShow = RONDAS_CONFIG.filter(
    (r) => r.required <= advancingPlayers / 2,
  );

  const getRoundMatches = (round: string, requiredCount: number): Partido[] => {
    const found = partidos
      .filter((p) => p.ronda === round)
      .sort((a, b) => a.orden - b.orden);
    const result: Partido[] = [];
    for (let i = 0; i < requiredCount; i++) {
      if (found[i]) result.push(found[i]);
      else {
        result.push({
          id: `empty-${round}-${i}`,
          torneo_id: torneoId,
          ronda: round,
          orden: i + 1,
          equipo_a_id: null,
          equipo_a_j1: null,
          equipo_a_j2: null,
          equipo_b_id: null,
          equipo_b_j1: null,
          equipo_b_j2: null,
          set1_a: null,
          set1_b: null,
          ganador: null,
        });
      }
    }
    return result;
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="font-extrabold text-2xl text-white tracking-tight uppercase">
            EDITOR DE LLAVES — {torneo?.nombre || "TORNEO"} ·{" "}
            {torneo?.categoria || "CATEGORÍA"}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            El sistema armó zonas y siembra automáticamente. Podés ajustar
            manualmente sin borrar resultados.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveView("zonas");
              setTourStep(0);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-chartreuse/25 text-brand-chartreuse hover:bg-brand-chartreuse/5 rounded-xl text-sm font-semibold transition-colors"
          >
            Tutorial
          </button>
          {isEditing && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-wider">
              <PenLine className="size-3.5" /> Modo edición
            </div>
          )}
          <button
            id="btn-editar"
            onClick={handleGuardarCambios}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#ccff00] text-black hover:bg-[#b3e600] transition-all relative ${
              tourStep === 1
                ? "ring-4 ring-brand-chartreuse shadow-[0_0_20px_rgba(204,255,0,0.6)] z-101"
                : ""
            }`}
          >
            {isEditing ? (
              <>
                <Check className="size-4" /> Guardar cambios
              </>
            ) : (
              <>
                <PenLine className="size-4" /> Editar
              </>
            )}
          </button>
        </div>
      </div>

      {/* BANNER ASISTENTE / WIZARD ONBOARDING */}
      <div className="mb-6 p-5 rounded-2xl bg-brand-chartreuse/5 border border-brand-chartreuse/20 flex flex-col md:flex-row gap-5 items-start">
        <div className="p-3 bg-brand-chartreuse/10 rounded-xl text-brand-chartreuse shrink-0">
          <GitMerge className="size-6" />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-bold text-white tracking-wide uppercase">
            Guía de Gestión del Torneo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-gray-400">
            <div className="space-y-1">
              <span className="font-extrabold text-brand-chartreuse">
                1. Generar Grupos
              </span>
              <p>
                Presiona <b>Regenerar automático</b> para armar las Zonas de
                clasificación por ranking oficial FAP.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-brand-chartreuse">
                2. Reubicar Manual
              </span>
              <p>
                Activa <b>Modo edición</b> para arrastrar y soltar{" "}
                {isIndividual ? "jugadores" : "parejas"} entre zonas.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-brand-chartreuse">
                3. Modo No Destructivo
              </span>
              <p>
                Si está <b>ON</b>, reubicar{" "}
                {isIndividual ? "jugadores" : "parejas"} no borrará los
                resultados cargados en la base de datos.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-brand-chartreuse">
                4. Llave Final
              </span>
              <p>
                Al concluir la fase de zonas, ve a la pestaña{" "}
                <b>Llave campeonato</b> para generar y jugar el cuadro final.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex bg-transparent border-b border-white/5 mb-6 gap-2">
        <button
          onClick={() => setActiveView("zonas")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-colors ${
            activeView === "zonas"
              ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
              : "border border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <LayoutGrid className="size-4" /> Fase de grupos
        </button>
        <button
          id="tab-llaves-indicador"
          onClick={() => setActiveView("llaves")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all relative ${
            activeView === "llaves"
              ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
              : "border border-transparent text-gray-500 hover:text-gray-300"
          } ${tourStep === 4 ? "ring-2 ring-brand-chartreuse shadow-[0_0_15px_rgba(204,255,0,0.5)] z-101" : ""}`}
        >
          <Trophy className="size-4" /> Llave campeonato
        </button>
        <button
          onClick={() => setActiveView("auditoria")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-colors ${
            activeView === "auditoria"
              ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
              : "border border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <History className="size-4" /> Auditoría
        </button>
      </div>

      {activeView === "zonas" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                id="btn-regenerar"
                onClick={handleRegenerarZonas}
                className={`flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-all relative ${
                  tourStep === 0
                    ? "ring-4 ring-brand-chartreuse shadow-[0_0_20px_rgba(204,255,0,0.6)] z-101"
                    : ""
                }`}
              >
                <RefreshCw className="size-4 text-gray-400" /> Regenerar
                automático
              </button>

              <div className="flex items-center gap-2 bg-[#222222] border border-white/5 rounded-xl px-3.5 py-1 text-sm text-gray-300">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Parejas por Zona:</span>
                <div className="w-40">
                  <CustomDropdown
                    value={String(tamanioGrupo)}
                    onChange={(val) => setTamanioGrupo(Number(val))}
                    options={[
                      { value: "2", label: "2 parejas" },
                      { value: "3", label: "3 parejas (FAP)" },
                      { value: "4", label: "4 parejas" },
                      { value: "5", label: "5 parejas" },
                    ]}
                    placeholder="Seleccionar..."
                  />
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-brand-chartreuse/30 rounded-xl text-sm font-semibold text-brand-chartreuse hover:bg-brand-chartreuse/10 transition-colors">
                <Plus className="size-4" />{" "}
                {isIndividual ? "Agregar jugador" : "Agregar pareja"}
              </button>
            </div>
            <div
              id="btn-no-destructivo"
              className={`flex items-center gap-3 px-4 py-2 border border-brand-chartreuse/30 rounded-full transition-all relative ${
                tourStep === 2
                  ? "ring-4 ring-brand-chartreuse shadow-[0_0_20px_rgba(204,255,0,0.6)] z-101"
                  : ""
              }`}
            >
              <span className="text-sm font-semibold text-gray-300">
                Modificación no destructiva
              </span>
              <button
                onClick={() =>
                  setModificacionNoDestructiva(!modificacionNoDestructiva)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modificacionNoDestructiva ? "bg-brand-chartreuse" : "bg-gray-600"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${modificacionNoDestructiva ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              <span
                className={`text-xs font-black ${modificacionNoDestructiva ? "text-brand-chartreuse" : "text-gray-500"}`}
              >
                ON
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Move className="size-3.5" />{" "}
            {isIndividual
              ? "Arrastrá un jugador a un slot para reubicarlo."
              : "Arrastrá una pareja a un slot para reubicarla."}
          </div>

          <div className="flex justify-between items-end border-b border-white/5 pb-2">
            <div className="flex items-center gap-3">
              <h4 className="text-xl font-bold text-white">
                Zonas de clasificación
              </h4>
              <span className="px-3 py-1 bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse text-xs font-bold rounded-full flex items-center gap-1.5">
                <Check className="size-3.5" /> Fase consolidada
              </span>
            </div>
            <div className="text-gray-500 text-sm">
              {zonas.length} zonas · {totalParejas}{" "}
              {isIndividual ? "jugadores" : "parejas"} · clasifican 2 por zona
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 text-brand-chartreuse animate-pulse">
              Cargando zonas...
            </div>
          ) : zonas.length > 0 ? (
            <DragDropPairing
              zonas={zonas}
              onZonasChange={setZonas}
              onMovePareja={handleMovePareja}
              isEditing={isEditing}
              partidos={partidos}
            />
          ) : (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              Las zonas aún no han sido generadas.
            </div>
          )}
        </div>
      )}

      {activeView === "llaves" && (
        <div className="bg-[#111111] rounded-3xl border border-white/5 p-6 overflow-x-auto">
          {partidos.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              Aún no se ha generado el cuadro de eliminatoria para este torneo.
            </div>
          ) : (
            <div className="flex gap-0 min-w-max pb-8 pt-4">
              {rondasToShow.map((ronda, rondaIndex) => (
                <div key={ronda.id} className="flex flex-col w-72">
                  <h3 className="text-center text-sm font-bold text-gray-500 uppercase tracking-widest mb-8 h-6">
                    {ronda.label}
                  </h3>
                  <div className="flex flex-col flex-1">
                    {getRoundMatches(ronda.id, ronda.required).map(
                      (partido, i) => (
                        <div
                          key={partido.id}
                          className={`flex-1 flex flex-col justify-center relative py-4 ${
                            rondaIndex < rondasToShow.length - 1
                              ? "pr-8"
                              : "pr-4"
                          } ${rondaIndex > 0 ? "pl-8" : "pl-4"}`}
                        >
                          <MatchCard
                            partido={partido}
                            isInteractive={false}
                            isActive={
                              partido.ganador === null &&
                              partido.equipo_a_id !== null &&
                              partido.equipo_b_id !== null
                            }
                          />

                          {/* Horizontal line coming in from left (except first round) */}
                          {rondaIndex > 0 && (
                            <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-white/10 -translate-y-1/2" />
                          )}

                          {/* Conectores visuales para el bracket (hacia la derecha) */}
                          {rondaIndex < rondasToShow.length - 1 && (
                            <>
                              <div className="absolute right-0 top-1/2 w-8 h-[2px] bg-white/10 -translate-y-1/2" />
                              {i % 2 === 0 ? (
                                <div className="absolute right-0 top-1/2 w-[2px] h-[50%] bg-white/10" />
                              ) : (
                                <div className="absolute right-0 bottom-1/2 w-[2px] h-[50%] bg-white/10" />
                              )}
                            </>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === "auditoria" && (
        <div className="bg-[#111111] rounded-3xl border border-white/5 p-6 space-y-4">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
            Historial de Auditoría Administrativa
          </h4>

          {loadingAuditoria ? (
            <div className="text-center p-8 text-brand-chartreuse animate-pulse text-sm">
              Cargando registros...
            </div>
          ) : auditoriaLogs.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              No se han registrado modificaciones manuales para este torneo.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {auditoriaLogs.map((log) => {
                const fecha = new Date(log.created_at).toLocaleString("es-AR");
                const adminName = log.perfiles
                  ? `${log.perfiles.nombre} ${log.perfiles.apellido}`
                  : "Administrador";

                return (
                  <div
                    key={log.id}
                    className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {log.accion.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          {fecha}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm font-semibold">
                        Por: <span className="text-white">{adminName}</span>
                      </p>
                      {log.detalles?.motivo && (
                        <p className="text-xs text-yellow-500 italic mt-1 bg-yellow-500/5 border border-yellow-500/10 px-3 py-1 rounded-lg inline-block">
                          Motivo: &quot;{log.detalles.motivo}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <FeedbackModal {...feedbackModal} />

      {/* FLOATING TOUR OVERLAY / STEP-BY-STEP DIALOG */}
      {tourStep !== null && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1f1f1f] border border-brand-chartreuse/30 p-6 rounded-3xl max-w-md w-full shadow-[0_10px_50px_rgba(204,255,0,0.15)] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-brand-chartreuse uppercase tracking-widest bg-brand-chartreuse/10 px-2.5 py-1 rounded-full">
                Paso {tourStep + 1} de {TOUR_STEPS.length}
              </span>
              <button
                onClick={() => setTourStep(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <h4 className="text-lg font-bold text-white mb-2">
              {TOUR_STEPS[tourStep].title}
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              {TOUR_STEPS[tourStep].description}
            </p>

            <div className="flex justify-between items-center">
              <button
                disabled={tourStep === 0}
                onClick={() => setTourStep((prev) => prev! - 1)}
                className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={() => {
                  if (tourStep < TOUR_STEPS.length - 1) {
                    setTourStep((prev) => prev! + 1);
                  } else {
                    setTourStep(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-chartreuse text-[#111] hover:bg-[#b3e600] transition-colors"
              >
                {tourStep === TOUR_STEPS.length - 1 ? "Entendido" : "Siguiente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
