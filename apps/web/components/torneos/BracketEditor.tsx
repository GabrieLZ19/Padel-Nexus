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
} from "lucide-react";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import { MatchCard } from "./MatchCard";

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
  const [isEditing, setIsEditing] = useState(true);
  const [modificacionNoDestructiva, setModificacionNoDestructiva] =
    useState(true);

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
          club: "Sin club asignado",
        })),
      }));
      setZonas(formattedZonas);
    } catch (error) {
      console.error("Error fetching zonas", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZonas();
  }, [torneoId]);

  const handleMovePareja = (
    inscripcionId: string,
    origenId: string,
    destinoId: string,
  ) => {
    setFeedbackModal({
      isOpen: true,
      type: "warning",
      title: "Confirmar Movimiento",
      description:
        "Por favor, indica el motivo por el cual estás moviendo esta pareja manualmente. Esto quedará registrado en auditoría.",
      confirmText: "Mover",
      cancelText: "Cancelar",
      showInput: true,
      onConfirm: async (motivo?: string) => {
        if (!motivo) return;

        try {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
          await TorneosService.moverPareja({
            inscripcion_id: inscripcionId,
            grupo_origen_id: origenId,
            grupo_destino_id: destinoId,
            motivo: motivo,
          });
          await loadZonas();
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "Movimiento Exitoso",
            description:
              "La pareja fue movida correctamente y la acción ha sido registrada.",
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        } catch (error: any) {
          setFeedbackModal({
            isOpen: true,
            type: "danger",
            title: "Error",
            description: error.message || "Error al mover la pareja.",
            onClose: () =>
              setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
      onClose: () => {
        setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
        loadZonas();
      },
    });
  };

  const totalParejas = zonas.reduce((acc, z) => acc + z.parejas.length, 0);

  const RONDAS_CONFIG = [
    { id: "OCTAVOS", label: "Octavos", required: 8 },
    { id: "CUARTOS", label: "Cuartos", required: 4 },
    { id: "SEMIS", label: "Semis", required: 2 },
    { id: "FINAL", label: "Final", required: 1 },
  ];

  const rondasToShow = RONDAS_CONFIG.filter(
    (r) => r.required <= (torneo?.cupos_maximos || 16) / 2,
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
          {isEditing && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 text-yellow-500 text-xs font-bold uppercase tracking-wider">
              <PenLine className="size-3.5" /> Modo edición
            </div>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#ccff00] text-black hover:bg-[#b3e600] transition-colors"
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
          onClick={() => setActiveView("llaves")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-colors ${
            activeView === "llaves"
              ? "border border-b-0 border-brand-chartreuse/50 text-brand-chartreuse bg-brand-chartreuse/5"
              : "border border-transparent text-gray-500 hover:text-gray-300"
          }`}
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
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors">
                <RefreshCw className="size-4 text-gray-400" /> Regenerar
                automático
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-brand-chartreuse/30 rounded-xl text-sm font-semibold text-brand-chartreuse hover:bg-brand-chartreuse/10 transition-colors">
                <Plus className="size-4" /> Agregar pareja
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 border border-brand-chartreuse/30 rounded-full">
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
            <Move className="size-3.5" /> Arrastrá una pareja a un slot para
            reubicarla.
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
              {zonas.length} zonas · {totalParejas} parejas · clasifican 2 por
              zona
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
        <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl">
          Aquí se mostrará el historial de cambios manuales realizados por los
          administradores.
        </div>
      )}

      <FeedbackModal {...feedbackModal} />
    </div>
  );
};
