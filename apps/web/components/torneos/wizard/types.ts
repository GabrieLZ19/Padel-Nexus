/** Handler que guarda el paso actual. Retorna false si falla (no navegar). */
export type SaveStepHandler = () => Promise<boolean>;

export type RegisterSaveHandler = (handler: SaveStepHandler | null) => void;
