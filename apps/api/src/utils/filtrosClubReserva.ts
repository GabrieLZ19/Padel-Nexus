export type FiltrosListadoClubesReserva = {
  search?: string;
  provincia?: string;
  max_distancia_km?: number;
  tipo_suelo?: string;
  /** true = solo techadas, false = solo al aire libre */
  techada?: boolean;
  fecha_disponibilidad?: string;
  /** HH:mm */
  hora_disponibilidad?: string;
};

export type CanchaResumenClub = {
  tipo_suelo?: string | null;
  techada?: boolean;
  activa?: boolean;
};

export function clubCumpleFiltroCancha(
  canchas: CanchaResumenClub[],
  tipo_suelo?: string,
  techada?: boolean,
): boolean {
  const activas = canchas.filter((c) => c.activa !== false);
  if (activas.length === 0) return false;
  return activas.some((c) => {
    if (
      tipo_suelo &&
      String(c.tipo_suelo || "").toLowerCase() !== tipo_suelo.toLowerCase()
    ) {
      return false;
    }
    if (techada !== undefined && Boolean(c.techada) !== techada) {
      return false;
    }
    return true;
  });
}

export function slotCoincideHora(
  horaInicio: string,
  horaFin: string,
  horaBuscada: string,
): boolean {
  const h = horaBuscada.slice(0, 5);
  const ini = horaInicio.slice(0, 5);
  const fin = horaFin.slice(0, 5);
  return ini <= h && h < fin;
}
