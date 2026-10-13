/** Bloqueo de pasos del wizard según estado del torneo (todas las entidades). */

export const ORDEN_PASOS_WIZARD = [
  "edit",
  "logos",
  "categories",
  "players",
  "fiscales",
  "cierre",
  "draws",
  "matches",
] as const;

export type WizardPasoId = (typeof ORDEN_PASOS_WIZARD)[number];

/** Número que se ve en el índice, según los pasos ocultos de esa pantalla. */
export function numeroPasoVisible(
  stepId: string,
  hiddenStepIds: readonly string[] = [],
): number {
  const visibles = ORDEN_PASOS_WIZARD.filter((id) => !hiddenStepIds.includes(id));
  const index = visibles.indexOf(stepId as WizardPasoId);
  return index < 0 ? 0 : index + 1;
}

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

/** Paso útil al abrir el torneo desde el listado. */
export function pasoSegunEstadoTorneo(estado?: string | null): WizardPasoId {
  switch (String(estado || "").trim()) {
    case "Inscripción":
      return "players";
    case "Cerrado":
    case "Programado":
      return "draws";
    case "En curso":
    case "Finalizado":
      return "matches";
    default:
      return "edit";
  }
}

/** `times` era el paso Sedes. Ahora las canchas viven en el programador. */
export function normalizarPasoAsistente(
  paso: string | null | undefined,
  ocultos: readonly string[] = [],
): WizardPasoId {
  const pedido = paso === "times" ? "fiscales" : paso;
  const visibles = ORDEN_PASOS_WIZARD.filter((id) => !ocultos.includes(id));
  if (pedido && visibles.includes(pedido as WizardPasoId)) {
    return pedido as WizardPasoId;
  }
  if (paso === "times" && ocultos.includes("fiscales")) return "cierre";
  return "edit";
}

export function hrefDetalleTorneo(
  base: "/dashboard" | "/club",
  torneo: { id: string; estado?: string | null },
): string {
  return `${base}/torneos/${torneo.id}?step=${pasoSegunEstadoTorneo(torneo.estado)}`;
}

/**
 * Reglas (dashboard + club):
 * - Programado: bloquea datos, logos, categorías, jugadores, fiscales y cierre.
 *   Los cuadros siguen editables. Clubes y canchas se cargan en el programador.
 *   Los resultados se habilitan al publicar.
 * - En curso: igual, con resultados habilitados. Cuadros y horarios publicados
 *   se cambian con motivo y quedan en auditoría.
 * - Finalizado: bloquea la configuración; cuadros y resultados en lectura.
 */
export function isWizardPasoReadOnly(
  estado: string | null | undefined,
  pasoId: WizardPasoId,
): boolean {
  if (!esEstadoTorneoModoLectura(estado)) return false;

  if (pasoId === "draws") {
    return estado === "Finalizado";
  }
  if (pasoId === "matches") {
    return estado !== "En curso";
  }
  return true;
}

export function pasoBloqueadoPorAlcance(
  torneo: {
    estado?: string | null;
    solo_lectura?: boolean;
    puede_cargar_resultados?: boolean;
  },
  pasoId: WizardPasoId,
): boolean {
  if (torneo.solo_lectura) {
    if (pasoId === "matches") {
      if (torneo.estado !== "En curso" && torneo.estado !== "Finalizado") {
        return true;
      }
      return torneo.puede_cargar_resultados === false;
    }
    return true;
  }
  return isWizardPasoReadOnly(torneo.estado, pasoId);
}

export function textoBannerModoLectura(estado: string): string {
  if (estado === "Finalizado") {
    return "Los pasos de configuración y logística están bloqueados. Los cuadros y la carga de resultados permanecen habilitados en modo lectura.";
  }
  if (estado === "Programado") {
    return "Fixture generado. Los pasos de datos, logos, categorías, jugadores, fiscales y cierre están bloqueados. Podés ajustar cuadros, y los clubes y canchas en el programador. Al publicar la programación el torneo pasa a En curso y se habilita la carga de resultados.";
  }
  return "El torneo está en curso. Los pasos de datos, logos, categorías, jugadores, fiscales y cierre están bloqueados. Cuadros y resultados siguen habilitados. Clubes y canchas se cargan en el programador. Un cambio de cuadro o de horario ya publicado pide un motivo y queda en auditoría.";
}
