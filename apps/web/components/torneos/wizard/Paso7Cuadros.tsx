import React, { useState } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "@/utils/types";
import { BracketEditor } from "@/components/torneos/BracketEditor";

interface Paso6CuadrosProps {
  torneo: Torneo;
  torneoId: string;
  inscripciones: Inscripcion[];
  partidos: Partido[];
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
}

export const Paso6Cuadros = ({
  torneo,
  torneoId,
  inscripciones,
  partidos,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
}: Paso6CuadrosProps) => {
  const [generando, setGenerando] = useState(false);

  const handleGenerarCuadro = async () => {
    if (inscripciones.length < 4) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Cupos insuficientes",
        description: `Se necesitan al menos 4 inscripciones confirmadas para armar llaves. Actual: ${inscripciones.length}.`,
        confirmText: undefined,
        onConfirm: undefined,
      }));
      return;
    }

    const count = inscripciones.length;
    const cuposValidos = [6, 8, 12, 16, 24, 32, 64];

    if (!cuposValidos.includes(count)) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Cantidad de inscriptos no reglamentaria",
        description: `Para armar cuadros o zonas exactas sin libres, la cantidad de confirmados debe ser 6, 8, 12, 16, 24, 32 o 64. Actualmente tenés ${count} inscriptos.`,
        confirmText: undefined,
        onConfirm: undefined,
      }));
      return;
    }

    if (inscripciones.some((ins) => ins.estado_pago !== "Confirmado")) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Inscripciones pendientes",
        description:
          "Existen inscripciones con pago pendiente. Todos deben estar confirmados antes de generar el fixture.",
        confirmText: undefined,
        onConfirm: undefined,
      }));
      return;
    }

    const isPrimeraVez = partidos.length === 0;

    const executeGeneration = async () => {
      try {
        setFeedbackModal((prev: any) => ({ ...prev, isLoading: true }));
        setGenerando(true);
        await TorneosService.generarCuadro(torneoId);

        triggerRefresh();

        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          isLoading: false,
          type: "success",
          title: "¡Cuadro Generado!",
          description: "El fixture automático se ha estructurado con éxito.",
          confirmText: "Entendido",
          onConfirm: undefined,
        }));
      } catch (error: any) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          isLoading: false,
          type: "error",
          title: "Error operativo",
          description: error.message || "Fallo la generación.",
          confirmText: "Entendido",
          onConfirm: undefined,
        }));
      } finally {
        setGenerando(false);
      }
    };

    if (isPrimeraVez) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "info",
        title: "Generar Fixture",
        description:
          "Se crearán los cruces aleatorios basados en las inscripciones confirmadas. El torneo pasará a estado 'En curso'.",
        confirmText: "Generar Cuadro",
        cancelText: "Cancelar",
        onConfirm: executeGeneration,
      }));
    } else {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "danger",
        title: "¡Atención! Acción destructiva",
        description:
          "¿Estás completamente seguro de regenerar el cuadro? Esto borrará el fixture actual y los resultados cargados.",
        confirmText: "Sí, Borrar y Regenerar",
        cancelText: "Cancelar",
        onConfirm: executeGeneration,
      }));
    }
  };

  return (
    <div className="space-y-6">
      {partidos.length === 0 && (torneo as any).formato === "Eliminatoria Directa" && (
        <div className="bg-black/20 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-bold text-white">Generar Fixture Oficial</h4>
            <p className="text-xs text-gray-400 mt-1">
              Estructure las llaves eliminatorias basándose en las parejas
              aprobadas.
            </p>
          </div>
          <button
            onClick={handleGenerarCuadro}
            disabled={
              generando ||
              inscripciones.length % 2 !== 0 ||
              inscripciones.some((ins) => ins.estado_pago !== "Confirmado")
            }
            className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
          >
            {generando ? "Generando..." : "Generar Cuadro"}
          </button>
        </div>
      )}

      <BracketEditor
        torneoId={torneoId}
        torneo={torneo}
        partidos={partidos}
        inscripciones={inscripciones}
        onRefresh={triggerRefresh}
      />

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("cierre")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Siguiente Paso: Arbitraje
        </button>
      </div>
    </div>
  );
};
