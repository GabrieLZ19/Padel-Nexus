/** Texto de modal de importación con todos los errores (CLI-1: sin recorte a 5). */
export function descripcionImportacionPlanillaConErrores(params: {
  inscripcionesOk: number;
  jugadoresCreados: number;
  errores: string[];
  etiquetaUnidad: string;
  advertenciasFormato?: string[];
}): string {
  const {
    inscripcionesOk,
    jugadoresCreados,
    errores,
    etiquetaUnidad,
    advertenciasFormato,
  } = params;
  const cabecera = `Éxitos: ${inscripcionesOk} ${etiquetaUnidad}. Perfiles nuevos: ${jugadoresCreados}. Errores (${errores.length}):`;
  const bloqueAdvertencias =
    advertenciasFormato && advertenciasFormato.length > 0
      ? `Avisos de formato (${advertenciasFormato.length}):\n${advertenciasFormato.join("\n")}\n\n`
      : "";
  if (errores.length === 0) {
    return bloqueAdvertencias
      ? `${bloqueAdvertencias}${cabecera}`
      : cabecera;
  }
  return `${bloqueAdvertencias}${cabecera}\n\n${errores.join("\n")}`;
}