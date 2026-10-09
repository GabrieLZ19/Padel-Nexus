export interface ResumenLicencias {
  total: number;
  pendientes: number;
  vigentes: number;
  vencidas: number;
  rechazadas: number;
  otros: number;
}

type LicenciaEstado = { estado?: string | null };

const PRIORIDAD = ["Pendiente", "Activa", "Vencida", "Suspendida"] as const;

export function estadoVisibleLicencia(
  licencias: LicenciaEstado | LicenciaEstado[] | null | undefined,
): (typeof PRIORIDAD)[number] | "otro" {
  const lista = Array.isArray(licencias)
    ? licencias
    : licencias
      ? [licencias]
      : [];
  const estados = new Set(lista.map((licencia) => licencia.estado));
  for (const estado of PRIORIDAD) {
    if (estados.has(estado)) return estado;
  }
  return "otro";
}

export function resumirLicenciasPorJugador(
  filas: Array<{
    licencias?: LicenciaEstado | LicenciaEstado[] | null;
  }>,
): ResumenLicencias {
  const resumen: ResumenLicencias = {
    total: 0,
    pendientes: 0,
    vigentes: 0,
    vencidas: 0,
    rechazadas: 0,
    otros: 0,
  };

  for (const fila of filas) {
    resumen.total += 1;
    const estado = estadoVisibleLicencia(fila.licencias);
    if (estado === "Pendiente") resumen.pendientes += 1;
    else if (estado === "Activa") resumen.vigentes += 1;
    else if (estado === "Vencida") resumen.vencidas += 1;
    else if (estado === "Suspendida") resumen.rechazadas += 1;
    else resumen.otros += 1;
  }

  return resumen;
}
