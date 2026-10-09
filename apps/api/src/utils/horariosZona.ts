export type CruceConHorario = {
  equipoAId: string | null;
  equipoBId: string | null;
  cancha: string | null;
  fecha: string | null;
};

export function claveCruce(
  equipoAId: string | null | undefined,
  equipoBId: string | null | undefined,
): string {
  if (!equipoAId || !equipoBId) return "";
  return [equipoAId, equipoBId].sort().join("|");
}

/** El horario queda atado a las dos parejas, no al id del partido. */
export function horariosPorCruce(
  partidos: CruceConHorario[],
): Map<string, { cancha: string; fecha: string }> {
  const mapa = new Map<string, { cancha: string; fecha: string }>();
  for (const partido of partidos) {
    const clave = claveCruce(partido.equipoAId, partido.equipoBId);
    if (!clave || !partido.cancha || !partido.fecha) continue;
    mapa.set(clave, { cancha: partido.cancha, fecha: partido.fecha });
  }
  return mapa;
}

export function aplicarHorarioConservado<
  T extends { equipo_a_id?: string | null; equipo_b_id?: string | null },
>(
  partido: T,
  horarios: Map<string, { cancha: string; fecha: string }>,
): T & { cancha_asignada?: string; fecha_partido?: string } {
  const previo = horarios.get(
    claveCruce(partido.equipo_a_id, partido.equipo_b_id),
  );
  if (!previo) return partido;
  return {
    ...partido,
    cancha_asignada: previo.cancha,
    fecha_partido: previo.fecha,
  };
}
