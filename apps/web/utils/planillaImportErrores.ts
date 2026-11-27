/** Texto de modal de importación con todos los errores (CLI-1: sin recorte a 5). */
export function descripcionImportacionPlanillaConErrores(params: {
  inscripcionesOk: number;
  jugadoresCreados: number;
  errores: string[];
  etiquetaUnidad: string;
}): string {
  const { inscripcionesOk, jugadoresCreados, errores, etiquetaUnidad } = params;
  const cabecera = `Éxitos: ${inscripcionesOk} ${etiquetaUnidad}. Perfiles nuevos: ${jugadoresCreados}. Errores (${errores.length}):`;
  if (errores.length === 0) return cabecera;
  return `${cabecera}\n\n${errores.join("\n")}`;
}