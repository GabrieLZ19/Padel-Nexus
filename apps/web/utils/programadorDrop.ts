import type { BoardPartido } from "@/utils/services/torneos";

export type DropEnSlotDecision =
  | { action: "asignar_libre" }
  | {
      action: "intercambiar";
      origen: { fecha_iso: string; cancha_label: string };
    }
  | {
      action: "confirmar_intercambio_categoria";
      origen: { fecha_iso: string; cancha_label: string };
    }
  | { action: "confirmar_reemplazo" }
  | { action: "bloquear"; mensaje: string };

function origenAsignado(
  partido: BoardPartido,
): { fecha_iso: string; cancha_label: string } | null {
  if (
    !partido.assigned ||
    !partido.fecha_partido ||
    !partido.cancha_asignada
  ) {
    return null;
  }
  return {
    fecha_iso: partido.fecha_partido,
    cancha_label: partido.cancha_asignada,
  };
}

/** Decide qué hacer al soltar un partido sobre un slot (con o sin ocupante). */
export function resolverDropEnSlot(
  dragged: BoardPartido,
  occupant: BoardPartido | undefined,
  opts: { esEvento: boolean },
): DropEnSlotDecision {
  if (!occupant || occupant.id === dragged.id) {
    return { action: "asignar_libre" };
  }

  const mismaCategoria =
    !opts.esEvento || occupant.torneo_id === dragged.torneo_id;
  const origen = origenAsignado(dragged);

  if (!mismaCategoria) {
    if (!origen) {
      return {
        action: "bloquear",
        mensaje:
          "Esa cancha ya está ocupada por otra categoría. Elegí un horario libre o mové el partido desde su celda actual para intercambiar.",
      };
    }
    return {
      action: "confirmar_intercambio_categoria",
      origen,
    };
  }

  if (origen) {
    return { action: "intercambiar", origen };
  }

  return { action: "confirmar_reemplazo" };
}