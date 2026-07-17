import React, { useState } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido } from "@/utils/types";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";

interface Paso8ArbitrajeProps {
  partidos: Partido[];
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
}

export const Paso8Arbitraje = ({
  partidos,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
}: Paso8ArbitrajeProps) => {
  const [guardandoPartidoId, setGuardandoPartidoId] = useState<string | null>(
    null,
  );

  // Filtramos los partidos que ya tienen contrincantes pero no tienen ganador
  const partidosJugables = partidos.filter(
    (p) => p.equipo_a_id && p.equipo_b_id && p.ganador === null,
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
      <div className="bg-brand-card rounded-3xl border border-white/5 p-6 shadow-xl">
        <h3 className="font-extrabold text-white text-xl mb-2">
          Consola de Arbitraje en Vivo
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          Suma los puntos de cada Partido. El sistema llevará la cuenta y cuando
          finalices el partido, avanzará la llave.
        </p>

        {partidosJugables.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl text-gray-500">
            No hay partidos listos para arbitrar en este momento.
          </div>
        ) : (
          <div className="space-y-6">
            {partidosJugables.map((partido) => (
              <LiveArbitrajeRow
                key={partido.id}
                partido={partido}
                onSave={handleGuardarResultadoLive}
                isSaving={guardandoPartidoId === partido.id}
                onError={showErrorModal}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("draws")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <button
          onClick={() => setActiveTab("start_stop")}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Siguiente Paso: Publicar & Finalizar
        </button>
      </div>
    </div>
  );
};
