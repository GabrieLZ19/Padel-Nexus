/**
 * Etiquetas estables de días de competencia (TOR-51), alineadas con Paso 3 del wizard.
 */
export function generarDiasJuegoDefault(
  fechaInicio?: string | null,
  fechaFin?: string | null,
): string[] {
  if (!fechaInicio) {
    return ["Viernes", "Sábado", "Domingo"];
  }
  const startStr = fechaInicio.split("T")[0];
  const endStr = fechaFin ? fechaFin.split("T")[0] : startStr;
  const start = new Date(`${startStr}T12:00:00Z`);
  const end = new Date(`${endStr}T12:00:00Z`);

  const dias: string[] = [];
  const current = new Date(start);
  let limit = 0;

  const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  while (current <= end && limit < 15) {
    const dayName = nombresDias[current.getUTCDay()];
    const dayNum = current.getUTCDate();
    dias.push(`${dayName} ${dayNum}`);
    current.setUTCDate(current.getUTCDate() + 1);
    limit++;
  }

  return dias.length > 0 ? dias : ["Viernes", "Sábado", "Domingo"];
}

export function fechasTorneoCambiaron(
  actual: { fecha?: string | null; fecha_fin?: string | null },
  update: { fecha?: string | null; fecha_fin?: string | null },
): boolean {
  const norm = (v: string | null | undefined) =>
    v ? v.split("T")[0] : null;
  if (update.fecha !== undefined && norm(update.fecha) !== norm(actual.fecha)) {
    return true;
  }
  if (
    update.fecha_fin !== undefined &&
    norm(update.fecha_fin) !== norm(actual.fecha_fin)
  ) {
    return true;
  }
  return false;
}

export function resolverDiasJuegoTrasCambioFechas(
  actual: { fecha?: string | null; fecha_fin?: string | null },
  update: { fecha?: string | null; fecha_fin?: string | null },
  diasJuegoExplicito: unknown,
): string[] | undefined {
  if (diasJuegoExplicito !== undefined) {
    return undefined;
  }
  if (!fechasTorneoCambiaron(actual, update)) {
    return undefined;
  }
  const fechaInicio =
    update.fecha !== undefined ? update.fecha : actual.fecha;
  const fechaFin =
    update.fecha_fin !== undefined ? update.fecha_fin : actual.fecha_fin;
  return generarDiasJuegoDefault(fechaInicio, fechaFin);
}