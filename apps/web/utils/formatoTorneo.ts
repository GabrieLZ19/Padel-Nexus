/** Formato sin fase de grupos (solo llave). "Zonas + Llaves" no entra. */
export function esEliminatoriaDirecta(formato?: string | null): boolean {
  const formatoLower = (formato || "").toLowerCase();
  return (
    formatoLower === "eliminatoria directa" ||
    (formatoLower.includes("eliminatoria") &&
      !formatoLower.includes("zona") &&
      !formatoLower.includes("grupo"))
  );
}
