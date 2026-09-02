export function capacidadZona(parejasCount: number): 3 | 4 {
  return parejasCount === 4 ? 4 : 3;
}

export function clasificadosPorZona(parejasCount: number): number {
  return parejasCount === 4 ? 3 : 2;
}

export function partidosEsperadosEnZona(parejasCount: number): number {
  return parejasCount === 4 ? 4 : 3;
}

export function partidoZonaPendiente(partido: {
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  ganador?: string | null;
}): boolean {
  if (!partido.equipo_a_id || !partido.equipo_b_id) return true;
  return !partido.ganador;
}

export function textoClasificacionZonas(
  zonas: Array<{ parejas?: unknown[]; capacidad?: number }>,
): string {
  if (!zonas.length) return "Sin zonas";

  const de3 = zonas.filter(
    (z) => capacidadZona(z.capacidad ?? z.parejas?.length ?? 0) === 3,
  ).length;
  const de4 = zonas.filter(
    (z) => capacidadZona(z.capacidad ?? z.parejas?.length ?? 0) === 4,
  ).length;

  const partes: string[] = [];
  if (de3 > 0) {
    partes.push(
      `${de3} zona${de3 === 1 ? "" : "s"} de 3: clasifican 1º y 2º`,
    );
  }
  if (de4 > 0) {
    partes.push(
      `${de4} zona${de4 === 1 ? "" : "s"} de 4: clasifican 1º, 2º y 3º`,
    );
  }
  partes.push("se elimina 1 pareja por zona");
  return partes.join(" · ");
}

export function zonaGrupoCompleta(
  partidosZona: Array<{
    equipo_a_id?: string | null;
    equipo_b_id?: string | null;
    ganador?: string | null;
  }>,
): boolean {
  if (partidosZona.length === 0) return false;

  const teamIds = new Set<string>();
  partidosZona.forEach((p) => {
    if (p.equipo_a_id) teamIds.add(p.equipo_a_id);
    if (p.equipo_b_id) teamIds.add(p.equipo_b_id);
  });

  const esperados = partidosEsperadosEnZona(teamIds.size);
  const finalizados = partidosZona.filter((p) => p.ganador).length;
  const pendientesSinEquipos = partidosZona.some(
    (p) => !p.equipo_a_id || !p.equipo_b_id,
  );

  if (pendientesSinEquipos) return false;
  return finalizados >= esperados;
}
