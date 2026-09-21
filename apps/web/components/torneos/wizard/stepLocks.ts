/** Bloqueo de pasos del wizard según estado del torneo (todas las entidades). */

export type WizardPasoId =
  | "edit"
  | "logos"
  | "categories"
  | "players"
  | "times"
  | "fiscales"
  | "cierre"
  | "draws"
  | "matches";

const ESTADOS_MODO_LECTURA = new Set([
  "Programado",
  "En curso",
  "Finalizado",
]);

export function esEstadoTorneoModoLectura(
  estado?: string | null,
): boolean {
  return ESTADOS_MODO_LECTURA.has(String(estado || "").trim());
}

/**
 * Reglas (dashboard + club):
 * - Programado / En curso: bloquea datos, logos, categorías, jugadores, fiscales y cierre.
 *   Sedes (times) siguen editables; cuadros/resultados editables.
 * - Finalizado: bloquea 1–7 (incl. sedes); cuadros y resultados en lectura.
 */
export function isWizardPasoReadOnly(
  estado: string | null | undefined,
  pasoId: WizardPasoId,
): boolean {
  if (!esEstadoTorneoModoLectura(estado)) return false;

  if (pasoId === "draws" || pasoId === "matches") {
    return estado === "Finalizado";
  }
  if (pasoId === "times") {
    return estado === "Finalizado";
  }
  return true;
}

export function textoBannerModoLectura(estado: string): string {
  if (estado === "Finalizado") {
    return "Los pasos de configuración y logística están bloqueados. Los cuadros y la carga de resultados permanecen habilitados en modo lectura.";
  }
  if (estado === "Programado") {
    return "Fixture generado. Los pasos de datos, logos, categorías, jugadores, fiscales y cierre están bloqueados. Podés ajustar sedes/canchas, cuadros y resultados. Al publicar la programación o cargar un resultado el torneo pasa a En curso.";
  }
  return "Los pasos de datos, logos, categorías, jugadores, fiscales y cierre están bloqueados. Sedes y canchas siguen editables. Los cuadros y resultados permanecen habilitados.";
}
