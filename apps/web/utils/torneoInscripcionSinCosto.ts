import type { Inscripcion, Torneo } from "./types";

export const ETIQUETA_INSCRIPCION_SIN_COSTO =
  "Inscripción sin costo (sin pago en línea)";

/** TOR-54: torneo sin cargo de inscripción. */
export function torneoInscripcionSinCosto(
  torneo: Pick<Torneo, "es_gratis" | "precio_inscripcion">,
): boolean {
  return (
    torneo.es_gratis === true ||
    Number(torneo.precio_inscripcion ?? 0) === 0
  );
}

export function inscripcionPagoPendienteBloqueaCuadro(
  ins: Pick<Inscripcion, "estado_pago">,
  torneo: Pick<Torneo, "es_gratis" | "precio_inscripcion">,
): boolean {
  if (torneoInscripcionSinCosto(torneo)) return false;
  return ins.estado_pago !== "Confirmado";
}

export function inscripcionCuentaComoConfirmada(
  ins: Pick<Inscripcion, "estado_pago">,
): boolean {
  return ins.estado_pago === "Confirmado";
}