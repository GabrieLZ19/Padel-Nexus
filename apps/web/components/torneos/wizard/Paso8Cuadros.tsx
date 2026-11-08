import React, { useState } from "react";
import { useNumeroPaso } from "@/components/torneos/wizard/NumeroPasoContext";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo, Inscripcion, Partido } from "@/utils/types";
import { BracketEditor } from "@/components/torneos/BracketEditor";
import { CUPOS_ESTANDAR_FAP } from "@/utils/constants/fapApaRules";
import { esEliminatoriaDirecta } from "@/utils/formatoTorneo";
import { AlertCircle } from "lucide-react";

interface Paso6CuadrosProps {
  torneo: Torneo;
  torneoId: string;
  inscripciones: Inscripcion[];
  partidos: Partido[];
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  isReadOnly?: boolean;
  puedeResolverSorteo?: boolean;
}

const CUPOS_VALIDOS = CUPOS_ESTANDAR_FAP.map((c) => Number(c.value));

function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return (
    e.response?.data?.error ||
    e.response?.data?.message ||
    e.message ||
    fallback
  );
}

export const Paso6Cuadros = ({
  torneo,
  torneoId,
  inscripciones,
  partidos,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  isReadOnly = false,
  puedeResolverSorteo,
}: Paso6CuadrosProps) => {
  const numeroPaso = useNumeroPaso("draws");
  const [generando, setGenerando] = useState(false);
  const cantidadInscriptos = inscripciones.length;
  const hayPendientes = inscripciones.some(
    (ins) => ins.estado_pago !== "Confirmado",
  );
  const formatoEsEliminatoriaDirecta = esEliminatoriaDirecta(torneo?.formato);
  const cupoValido =
    !formatoEsEliminatoriaDirecta ||
    CUPOS_VALIDOS.includes(cantidadInscriptos);
  const diasJuego = Array.isArray(torneo?.dias_juego)
    ? torneo.dias_juego.filter(
        (d: any) => typeof d === "string" && d.trim().length > 0,
      )
    : [];
  const tieneDiasCompetencia = diasJuego.length > 0;
  const puedeGenerar =
    !generando &&
    cantidadInscriptos >= 4 &&
    cupoValido &&
    !hayPendientes &&
    tieneDiasCompetencia;

  const handleGenerarCuadro = async () => {
    if (!tieneDiasCompetencia) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Días de competencia requeridos",
        description:
          "No se definió ningún día de competencia en el Paso 3 (Categorías). Configurá los días antes de generar el fixture.",
        confirmText: "Ir al Paso 3",
        cancelText: "Cerrar",
        onConfirm: () => {
          setFeedbackModal((prev: any) => ({ ...prev, isOpen: false }));
          void setActiveTab("categories");
        },
        onClose: () => setFeedbackModal((prev: any) => ({ ...prev, isOpen: false })),
      }));
      return;
    }

    if (cantidadInscriptos < 4) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Cupos insuficientes",
        description: `Se necesitan al menos 4 inscripciones confirmadas. Actual: ${cantidadInscriptos}.`,
        confirmText: undefined,
        onConfirm: undefined,
      }));
      return;
    }

    if (hayPendientes) {
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

    if (formatoEsEliminatoriaDirecta && !cupoValido) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Cantidad no válida para el fixture",
        description: `Para eliminatoria directa sin byes, la cantidad de confirmados debe ser ${CUPOS_VALIDOS.join(", ")}. Ahora hay ${cantidadInscriptos}. Agregá o quitá inscritos hasta llegar a un cupo válido.`,
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
      } catch (error: unknown) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          isLoading: false,
          type: "error",
          title: "No se pudo generar el fixture",
          description: apiErrorMessage(
            error,
            "Falló la generación del cuadro.",
          ),
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
          "Se crearán los cruces aleatorios basados en las inscripciones confirmadas. El torneo pasará a estado 'Programado' (fixture listo; aún no en juego).",
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
      <h3 className="text-lg font-bold text-white uppercase tracking-wider">
        Paso {numeroPaso}: Cuadros
      </h3>
      {partidos.length === 0 && formatoEsEliminatoriaDirecta && (
          <div className="bg-black/20 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h4 className="font-bold text-white">Generar Fixture Oficial</h4>
              <p className="text-xs text-gray-400 mt-1">
                Estructure las llaves eliminatorias basándose en las parejas
                aprobadas.
              </p>
              {formatoEsEliminatoriaDirecta &&
                !cupoValido &&
                cantidadInscriptos > 0 && (
                <p className="text-xs text-amber-400 mt-2 font-medium">
                  Hay {cantidadInscriptos} confirmados. Cupos válidos:{" "}
                  {CUPOS_VALIDOS.join(", ")}.
                </p>
              )}
              {!tieneDiasCompetencia && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-4 py-3 rounded-xl font-medium w-full mt-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0 text-amber-400" />
                    <span>
                      <strong>Días de competencia requeridos:</strong> Marcá los días en el Paso 3 (Categorías) antes de generar el fixture.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void setActiveTab("categories")}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Ir al Paso 3
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleGenerarCuadro}
              disabled={!puedeGenerar}
              title={
                !tieneDiasCompetencia
                  ? "Definí los días de competencia en el Paso 3 (Categorías) antes de generar el cuadro"
                  : undefined
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
        isReadOnly={isReadOnly}
        puedeResolverSorteo={puedeResolverSorteo}
        setActiveTab={setActiveTab}
      />

      {!isReadOnly && (
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
            Siguiente Paso: Resultados
          </button>
        </div>
      )}
    </div>
  );
};
