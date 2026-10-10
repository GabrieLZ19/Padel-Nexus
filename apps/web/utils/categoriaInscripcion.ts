const ESTADOS_ACTIVOS = new Set([
  "inscripción",
  "cerrado",
  "programado",
  "en curso",
]);

export function etiquetaCategoriaInscripcion(input: {
  categoria?: string | null;
  nivelTorneo?: string | null;
  categoriaTorneo?: string | null;
}): string {
  const directa = (input.categoria || "").trim();
  if (directa && directa.toLowerCase() !== "sin categoría") return directa;
  const nivel = (input.nivelTorneo || "").trim();
  const categoria = (input.categoriaTorneo || "").trim();
  if (nivel && categoria) return `${nivel} · ${categoria}`;
  return nivel || categoria;
}

export function contarActivosEnConjunto(
  torneos: { estado?: string | null }[],
): number {
  return torneos.filter((torneo) =>
    ESTADOS_ACTIVOS.has((torneo.estado || "").toLowerCase()),
  ).length;
}

export function etiquetaActivos(cantidad: number): string {
  return cantidad === 1 ? "1 activo" : `${cantidad} activos`;
}
