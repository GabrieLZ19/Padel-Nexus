/** Límites del mes calendario de una fecha YYYY-MM-DD. `hasta` es exclusivo. */
export function rangoMesCalendario(fechaIso: string): { desde: string; hasta: string } {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(fechaIso);
  if (!match) throw new Error("Fecha inválida para el mes de ocupación.");

  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const siguienteMes = mes === 12 ? 1 : mes + 1;
  const siguienteAnio = mes === 12 ? anio + 1 : anio;

  return {
    desde: `${match[1]}-${match[2]}-01`,
    hasta: `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}-01`,
  };
}

/**
 * Turnos ofrecidos entre dos fechas.
 * Cada fila de plantilla vale solo en su `dia_semana` (0 domingo … 6 sábado).
 */
export function turnosDisponiblesEntre(
  turnos: { dia_semana: number }[],
  desde: string,
  hastaExclusivo: string,
): number {
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  for (const turno of turnos) {
    if (turno.dia_semana >= 0 && turno.dia_semana <= 6) {
      porDia[turno.dia_semana] += 1;
    }
  }

  let total = 0;
  let cursor = desde;
  while (cursor < hastaExclusivo) {
    total += porDia[diaSemanaIso(cursor)] ?? 0;
    cursor = diaSiguiente(cursor);
  }
  return total;
}

/**
 * Porcentaje de turnos reservados sobre los disponibles del mes.
 * Si hay reservas, el redondeo no puede dejar la tasa en 0.
 */
export function tasaOcupacion(reservados: number, disponibles: number): number {
  if (reservados <= 0 || disponibles <= 0) return 0;
  const porcentaje = Math.round((reservados / disponibles) * 100);
  return Math.min(100, Math.max(1, porcentaje));
}

export function precioDeTurno(turnos: unknown): number {
  const turno = Array.isArray(turnos) ? turnos[0] : turnos;
  if (!turno || typeof turno !== "object" || !("precio" in turno)) return 0;
  const precio = Number((turno as { precio: unknown }).precio);
  return Number.isFinite(precio) ? precio : 0;
}

function diaSemanaIso(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

function diaSiguiente(fecha: string): string {
  const fechaUtc = new Date(`${fecha}T12:00:00Z`);
  fechaUtc.setUTCDate(fechaUtc.getUTCDate() + 1);
  return fechaUtc.toISOString().slice(0, 10);
}
