import type { FilaPlanillaInscripcion } from "@/utils/inscripcionPlanilla";
import { InscripcionesService } from "@/utils/services/inscripciones";
import type { PlanillaImportProgressState } from "@/components/inscripciones/PlanillaImportProgressBar";

type ImportResult = Awaited<
  ReturnType<typeof InscripcionesService.importarPlanilla>
>;

/**
 * Ejecuta importación de planilla reportando progreso por fases:
 * envío → procesamiento en servidor → listo.
 */
export async function importarPlanillaConProgreso(params: {
  torneoId: string;
  filas: FilaPlanillaInscripcion[];
  modalidad?: string | null;
  onProgress: (state: PlanillaImportProgressState) => void;
}): Promise<ImportResult> {
  const { torneoId, filas, modalidad, onProgress } = params;
  const total = filas.length;
  const unidades = Math.max(1, Math.ceil(total / 2));

  let percent = 20;
  onProgress({
    percent,
    label: "Enviando planilla…",
    detail: `${total} fila(s) · ~${unidades} inscripción(es)`,
  });

  const tick = setInterval(() => {
    // Mientras el backend procesa fila a fila, avanzar despacio hasta 92%.
    percent = Math.min(92, percent + 1);
    onProgress({
      percent,
      label:
        percent < 40
          ? "Enviando planilla…"
          : "Procesando inscripciones en el servidor…",
      detail:
        percent < 40
          ? `${total} fila(s) · ~${unidades} inscripción(es)`
          : `Esto puede demorar según la cantidad de filas (${total}).`,
    });
  }, Math.max(350, Math.min(1000, 150 + total * 10)));

  try {
    const resultado = await InscripcionesService.importarPlanilla(
      {
        torneo_id: torneoId,
        filas,
        modalidad: modalidad || undefined,
      },
      {
        onUploadProgress: (uploadPct) => {
          const mapped = 20 + Math.round((uploadPct / 100) * 20);
          percent = Math.max(percent, mapped);
          onProgress({
            percent,
            label: "Enviando planilla…",
            detail: `${total} fila(s) · subida ${uploadPct}%`,
          });
        },
      },
    );

    clearInterval(tick);
    onProgress({
      percent: 100,
      label: "Importación finalizada",
      detail: `${resultado.inscripcionesOk} inscripción(es) · ${resultado.jugadoresCreados} perfil(es) nuevo(s)`,
    });
    return resultado;
  } catch (err) {
    clearInterval(tick);
    throw err;
  }
}
