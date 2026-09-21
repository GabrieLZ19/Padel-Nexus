import type { Torneo } from "@/utils/types";

/** Handler que guarda el paso actual. Retorna false si falla (no navegar). */
export type SaveStepHandler = () => Promise<boolean>;

export type RegisterSaveHandler = (handler: SaveStepHandler | null) => void;

/** Actualiza el torneo en el padre tras un save (evita estado stale al volver de paso). */
export type OnTorneoUpdated = (torneo: Torneo) => void;
