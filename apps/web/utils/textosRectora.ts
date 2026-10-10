export type ClaveTextoRectora =
  | "puntos"
  | "reglamento"
  | "licencias"
  | "plantilla"
  | "afiliadas";

/** Los textos de la entidad rectora salen de su sigla configurada. */
export function textoRectora(
  clave: ClaveTextoRectora,
  sigla: string | null | undefined,
): string {
  const s = (sigla || "").trim() || "FAP";
  switch (clave) {
    case "puntos":
      return `Puntos ${s}`;
    case "reglamento":
      return `Reglamento ${s}`;
    case "licencias":
      return `licencias ${s}`;
    case "plantilla":
      return `Plantilla ${s}`;
    case "afiliadas":
      return `Entidades afiliadas ${s}`;
  }
}
